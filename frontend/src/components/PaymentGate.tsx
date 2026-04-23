"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useReaderVault } from "@/hooks/useReaderVault";

interface PaymentGateProps {
  articleTitle: string;
  authorName?: string;
  price?: string;
  slug: string;
  /** Writer's on-chain address — payment goes here via ReaderVault */
  writerAddress: `0x${string}`;
}

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} className="text-[17px] font-semibold text-[#1d1d1f] mt-8 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("## "))  return <h2 key={i} className="text-[22px] font-semibold text-[#1d1d1f] mt-10 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith("# "))   return <h1 key={i} className="text-[28px] font-bold text-[#1d1d1f] mt-10 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith("> "))   return (
      <blockquote key={i} className="border-l-2 border-[#0071e3] pl-4 my-4 text-[15px] text-[#6e6e73] italic">{line.slice(2)}</blockquote>
    );
    if (line.startsWith("---"))  return <hr key={i} className="border-black/[0.08] my-6" />;
    if (!line.trim())             return <div key={i} className="h-3" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j} className="font-semibold text-[#1d1d1f]">{part.slice(2, -2)}</strong>
        : part
    );
    return <p key={i} className="text-[16px] text-[#424245] leading-[1.8] mb-3">{parts}</p>;
  });
}

export function PaymentGate({ articleTitle, authorName, price = "$0.001", slug, writerAddress }: PaymentGateProps) {
  const { address, isConnected } = useAccount();
  const {
    totalUsdcValue,
    payForRead,
    isPaying,
    isPaySuccess,
    payTxHash,
    payError,
    pricePerRead,
    isOnArc,
    switchToArc,
  } = useReaderVault();

  const [uiState, setUiState] = useState<"locked" | "paying" | "unlocked">("locked");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tracks whether the current payment was initiated by this component instance
  const paymentInitiated = useRef(false);

  // Step 2: on-chain tx confirmed → fetch gated content from API
  useEffect(() => {
    if (!isPaySuccess || !paymentInitiated.current) return;
    paymentInitiated.current = false;

    async function fetchContent() {
      const paymentHeader = JSON.stringify({
        x402Version: 1,
        scheme: "exact",
        network: `arc-testnet-${process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002"}`,
        payload: {
          signature: payTxHash ?? "0x",
          authorization: {
            from: address ?? "0x0000000000000000000000000000000000000000",
            to: writerAddress,
            value: "1000",
            validAfter: 0,
            validBefore: Math.floor(Date.now() / 1000) + 60,
            nonce: `${slug}-${Date.now()}`,
          },
        },
      });

      try {
        const res = await fetch(`/api/articles/${slug}`, {
          headers: { "X-Payment": paymentHeader },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setContent(data.content ?? "");
        setUiState("unlocked");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
        setUiState("locked");
      }
    }

    fetchContent();
  }, [isPaySuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for wagmi errors (user rejected tx, tx reverted, etc.)
  useEffect(() => {
    if (!payError || !paymentInitiated.current) return;
    paymentInitiated.current = false;
    const msg = (payError as { shortMessage?: string })?.shortMessage ?? payError.message ?? "Transaction failed";
    setError(msg);
    setUiState("locked");
  }, [payError]);

  // Step 1: validate balance then kick off on-chain payment
  const handlePay = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError("Connect your wallet first");
      return;
    }

    if (!isOnArc) {
      try {
        await switchToArc();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Please switch to Arc Testnet to continue";
        setError(msg);
        return;
      }
    }

    if (totalUsdcValue < pricePerRead) {
      const have = (Number(totalUsdcValue) / 1e18).toFixed(4);
      setError(`Insufficient balance — vault has $${have} USDC, need $0.001. Top up your Reader Vault.`);
      return;
    }

    paymentInitiated.current = true;
    setUiState("paying");
    try {
      await payForRead(writerAddress, slug);
    } catch (err) {
      paymentInitiated.current = false;
      setUiState("locked");
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setError(msg);
    }
  };

  if (uiState === "unlocked" && content !== null) {
    return (
      <div className="animate-fade-in" id="article-content-unlocked">
        <article>{renderMarkdown(content)}</article>
      </div>
    );
  }

  const isProcessing = uiState === "paying" || isPaying;

  return (
    <div className="relative" id="payment-gate">
      <div className="relative overflow-hidden rounded-xl min-h-[400px]">
        <div className="blur-lg opacity-10 select-none pointer-events-none max-h-[400px] overflow-hidden bg-gray-100 h-96 rounded-xl" />
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/95 to-white/70">
          <div className="text-center max-w-sm mx-auto px-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0071e3]/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-widest mb-3">Premium Article</p>
            <h3 className="text-[32px] font-bold text-[#1d1d1f] leading-[1.1] mb-2 px-2">&ldquo;{articleTitle}&rdquo;</h3>
            {authorName && <p className="text-[14px] font-medium text-[#86868b] mb-6">by {authorName}</p>}
            <div className="mb-4 flex items-center justify-center gap-1.5">
              <span className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">{price}</span>
              <span className="text-[14px] font-medium text-[#86868b]">USDC</span>
            </div>
            {isConnected && (
              <p className="text-[12px] text-[#86868b] mb-4">
                Vault balance: ${(Number(totalUsdcValue) / 1e18).toFixed(4)} USDC
              </p>
            )}
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="btn-primary w-full disabled:opacity-50"
              id="pay-to-read-btn"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isPaying ? "Confirm in wallet…" : "Settling on-chain…"}
                </span>
              ) : `Pay ${price} to Read`}
            </button>
            <p className="text-[11px] text-[#86868b] mt-4">From your Reader Vault · Instant on Arc</p>
          </div>
        </div>
      </div>
    </div>
  );
}
