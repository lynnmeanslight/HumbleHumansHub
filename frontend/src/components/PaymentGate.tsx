"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { parseUnits } from "viem";
import { useReaderVault } from "@/hooks/useReaderVault";
import { ClapAndComment } from "@/components/ClapAndComment";

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
  const { signMessageAsync } = useSignMessage();
  const {
    totalUsdcValue,
    payForRead,
    isPaying,
    isPaySubmitting,
    isPayConfirming,
    isPaySuccess,
    payTxHash,
    payError,
    isOnArc,
    switchToArc,
    refetchActivity,
  } = useReaderVault();

  const numericPriceStr = price.replace(/[^0-9.]/g, "");
  const authorPriceNum = Number(numericPriceStr);
  const platformFeeNum = 0.001;
  const totalPriceNum = authorPriceNum + platformFeeNum;
  
  const authorPriceBigInt = parseUnits(numericPriceStr, 18);
  const totalPriceBigInt = parseUnits(totalPriceNum.toFixed(4), 18);

  const [uiState, setUiState] = useState<"locked" | "paying" | "unlocked">("locked");
  const [content, setContent] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const autoAccessAttempted = useRef(false);

  // Tracks whether the current payment was initiated by this component instance
  const paymentInitiated = useRef(false);

  // Step 2: on-chain tx confirmed → fetch gated content from API
  useEffect(() => {
    if (!isPaySuccess || !paymentInitiated.current) return;
    paymentInitiated.current = false;
    
    // Refresh reader activity counts
    if (refetchActivity) refetchActivity();

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
            value: authorPriceBigInt.toString(),
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
        setComments(data.comments ?? []);
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

  // Handle Access Bypass (Author OR Previous Payer)
  const tryAutoAccess = async () => {
    if (!address) return;
    setError(null);
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/articles/${slug}`, {
        headers: { "X-Reader-Address": address },
      });
      
      if (!res.ok) {
        // Not a previous payer or author
        setIsVerifying(false);
        return;
      }
      
      const data = await res.json();
      setContent(data.content ?? "");
      setComments(data.comments ?? []);
      setUiState("unlocked");
    } catch {
      // Fail silently for auto-check
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-check on connect or load
  useEffect(() => {
    if (isConnected && address && uiState === "locked" && !autoAccessAttempted.current && !isVerifying) {
      autoAccessAttempted.current = true;
      tryAutoAccess();
    }
  }, [isConnected, address, uiState]);

  // Step 1: validate balance then kick off on-chain payment
  const handlePay = async () => {
    setError(null);

    if (!isConnected || !address) {
      setError("Connect first to unlock this article");
      return;
    }

    // Double check auto-access just in case
    if (!autoAccessAttempted.current) {
      autoAccessAttempted.current = true;
      await tryAutoAccess();
      if (uiState === "unlocked") return;
    }

    if (!isOnArc) {
      try {
        await switchToArc();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Please switch to the payment network to continue";
        setError(msg);
        return;
      }
    }

    if (totalUsdcValue < totalPriceBigInt) {
      const have = (Number(totalUsdcValue) / 1e18).toFixed(4);
      setError(`Not enough balance — you have $${have} available and need $${totalPriceNum.toFixed(4)}. Add more funds to keep reading.`);
      return;
    }

    paymentInitiated.current = true;
    setUiState("paying");
    try {
      await payForRead(writerAddress, slug, authorPriceBigInt);
    } catch (err) {
      paymentInitiated.current = false;
      setUiState("locked");
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setError(msg);
    }
  };

  if (uiState === "unlocked" && content !== null) {
    const isAuthor = address?.toLowerCase() === writerAddress.toLowerCase();

    return (
      <div className="animate-fade-in" id="article-content-unlocked">
        <article>{renderMarkdown(content)}</article>
        
        <div className="mt-12 mb-8 flex items-center gap-2.5 border-t border-black/[0.06] pt-6">
          {isAuthor ? (
            <>
              <span className="text-[13px] text-[#0071e3] font-medium">Author View</span>
              <span className="text-[12px] text-[#86868b]">You bypass the paywall for your own article</span>
            </>
          ) : (
            <>
              <span className="text-[13px] text-[#1a8917] font-medium">✓ Settled</span>
              <span className="text-[12px] text-[#86868b]">${totalPriceNum.toFixed(3)} paid</span>
            </>
          )}
        </div>

        <ClapAndComment writerAddress={writerAddress} slug={slug} initialComments={comments} />
      </div>
    );
  }

  const isProcessing = uiState === "paying" || isPaying || isVerifying;
  const paymentStatusLabel = isPaySubmitting
    ? "Confirm in wallet…"
    : isPayConfirming
      ? "Waiting for chain confirmation…"
      : isVerifying
        ? "Checking access…"
        : "Unlocking article…";

  return (
    <div className="relative" id="payment-gate">
      <div className="relative overflow-hidden rounded-xl border border-black/[0.04] bg-gradient-to-b from-[#fbfbfd] to-white">
        <div className="py-12 md:py-16 flex items-center justify-center">
          <div className="text-center w-full max-w-sm mx-auto px-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0071e3]/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-widest mb-3">Premium Article</p>
            <h3 className="text-[32px] font-bold text-[#1d1d1f] leading-[1.1] mb-2 px-2">&ldquo;{articleTitle}&rdquo;</h3>
            {authorName && <p className="text-[14px] font-medium text-[#86868b] mb-4">by {authorName}</p>}
            
            <div className="mb-4 flex items-center justify-center gap-1.5">
              <span className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">${totalPriceNum.toFixed(3)}</span>
              <span className="text-[14px] font-medium text-[#86868b]">USDC</span>
            </div>

            <div className="mb-6 p-4 bg-[#f5f5f7] border border-black/[0.06] rounded-xl text-left">
               <div className="flex justify-between items-center text-[13px] mb-2">
                 <span className="text-[#6e6e73]">Creator Price</span>
                 <span className="text-[#1d1d1f] font-medium">${authorPriceNum.toFixed(3)}</span>
               </div>
               <div className="flex justify-between items-center text-[13px] mb-3 pb-3 border-b border-black/[0.06]">
                 <span className="text-[#6e6e73]">Platform Fee</span>
                 <span className="text-[#1d1d1f] font-medium">${platformFeeNum.toFixed(3)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[14px] font-bold text-[#1d1d1f]">Total Cost</span>
                 <span className="text-[16px] font-bold text-[#0071e3]">${totalPriceNum.toFixed(3)} USDC</span>
               </div>
            </div>

            {isConnected && (
              <p className="text-[12px] text-[#86868b] mb-4">
                Available balance: ${(Number(totalUsdcValue) / 1e18).toFixed(4)}
              </p>
            )}

            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            
            <div className="flex flex-col gap-3">
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
                    {paymentStatusLabel}
                  </span>
                ) : `Pay $${totalPriceNum.toFixed(3)} to Read`}
              </button>
            </div>

            <p className="text-[11px] text-[#86868b] mt-4">
              {isPayConfirming
                ? "Your payment is submitted. Waiting for Arc to confirm it on-chain."
                : isVerifying
                  ? "Verifying your previous payment..."
                  : "Charged from your reading balance"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
