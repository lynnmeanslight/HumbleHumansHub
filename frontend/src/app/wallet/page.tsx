"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WalletBalance } from "@/components/WalletBalance";
import { useReaderVault } from "@/hooks/useReaderVault";
import Link from "next/link";

export default function WalletPage() {
  const [amt, setAmt] = useState("");
  const [txMsg, setTxMsg] = useState<string | null>(null);

  const { isConnected } = useAccount();
  const {
    usdcFloat, totalUsdcValue,
    deposit, isDepositing, isDepositSuccess, depositError,
    withdraw, isWithdrawing, isWithdrawSuccess,
    refetchBalance,
    isOnArc, switchToArcAsync,
  } = useReaderVault();

  const floatUsdc = Number(usdcFloat) / 1e18;
  const total     = Number(totalUsdcValue) / 1e18;
  const stakedUsdc = total - floatUsdc;

  // Refetch + notify after deposit
  useEffect(() => {
    if (!isDepositSuccess) return;
    refetchBalance();
    setAmt("");
    setTxMsg("Deposit confirmed ✓");
    setTimeout(() => setTxMsg(null), 4000);
  }, [isDepositSuccess, refetchBalance]);

  // Notify on deposit error
  useEffect(() => {
    if (!depositError) return;
    const msg = (depositError as { shortMessage?: string }).shortMessage ?? depositError.message ?? "Deposit failed";
    setTxMsg(`Error: ${msg}`);
    setTimeout(() => setTxMsg(null), 6000);
  }, [depositError]);

  // Refetch + notify after withdraw
  useEffect(() => {
    if (!isWithdrawSuccess) return;
    refetchBalance();
    setTxMsg("Withdrawal confirmed ✓");
    setTimeout(() => setTxMsg(null), 4000);
  }, [isWithdrawSuccess, refetchBalance]);

  const handleDeposit = async () => {
    // Ensure we're on Arc before attempting deposit (awaits MetaMask prompt)
    if (!isOnArc) {
      try {
        await switchToArcAsync();
      } catch {
        setTxMsg("Error: Please switch to Arc Testnet to deposit");
        setTimeout(() => setTxMsg(null), 6000);
        return;
      }
    }
    const amtNum = Number(amt);
    if (!amtNum || amtNum <= 0) return;
    // Arc uses USDC as native token with 18 decimals
    const amtAtomic = BigInt(Math.round(amtNum * 1e18));
    try {
      deposit(amtAtomic);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deposit failed";
      setTxMsg(`Error: ${msg}`);
      setTimeout(() => setTxMsg(null), 6000);
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdraw();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Withdraw failed";
      setTxMsg(`Error: ${msg}`);
      setTimeout(() => setTxMsg(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
            <div className="hidden md:flex items-center gap-5">
              <Link href="/read" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Publish</Link>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      <section className="pt-12">
        <div className="max-w-content mx-auto px-6 py-14 md:py-20 text-center">
          <h1 className="text-hero mb-3">Wallet.</h1>
          <p className="text-[17px] text-[#86868b]">Deposit, earn yield, pay <span className="text-[#0071e3]">$0.001</span> per read.</p>
        </div>
      </section>

      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-10 md:py-14">
          {txMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-[13px] font-medium text-center ${txMsg.startsWith("Error:") ? "bg-[#fff1f1] border border-[#fecaca] text-[#dc2626]" : "bg-[#f0fdf4] border border-[#bbf7d0] text-[#1a8917]"}`}>
              {txMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <WalletBalance />

              {/* ── Deposit ── */}
              <div className="card p-5">
                <span className="text-label">Deposit USDC</span>
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <input
                      type="number"
                      value={amt}
                      onChange={e => setAmt(e.target.value)}
                      placeholder="0.10"
                      step="0.01"
                      min="0.01"
                      disabled={!isConnected}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#f5f5f7] border border-black/[0.08] text-[#1d1d1f] placeholder-[#86868b] text-[14px] focus:outline-none focus:border-[#0071e3]/50 focus:ring-1 focus:ring-[#0071e3]/20 transition-all disabled:opacity-50"
                      id="deposit-amount-input"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#86868b]">$</span>
                  </div>
                  <div className="flex gap-1.5">
                    {["0.05", "0.10", "0.50", "1.00"].map(v => (
                      <button key={v} onClick={() => setAmt(v)}
                        className="flex-1 py-1.5 text-[11px] text-[#6e6e73] bg-[#f5f5f7] border border-black/[0.06] rounded-lg hover:border-black/[0.15] hover:text-[#1d1d1f] transition-all">
                        ${v}
                      </button>
                    ))}
                  </div>
                  {amt && Number(amt) > 0 && (
                    <div className="p-3 rounded-lg bg-[#f5f5f7] border border-black/[0.06] space-y-1.5">
                      <div className="text-[11px] text-[#86868b]">Allocation:</div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#6e6e73]">USDC Float</span>
                        <span className="text-[#1d1d1f]">${Math.min(Number(amt), 0.01).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#6e6e73]">→ USYC (yield)</span>
                        <span className="text-[#1a8917]">${Math.max(0, Number(amt) - 0.01).toFixed(4)}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleDeposit}
                    disabled={!isConnected || (isOnArc && (!Number(amt) || isDepositing))}
                    className="btn-accent w-full disabled:opacity-50"
                    id="deposit-btn"
                  >
                    {isDepositing ? "Confirming…" : !isConnected ? "Connect wallet" : !isOnArc ? "Switch to Arc Testnet" : !Number(amt) ? "Enter an amount" : "Deposit"}
                  </button>
                  {!isConnected && (
                    <p className="text-[11px] text-[#86868b] text-center">Connect wallet to deposit</p>
                  )}
                </div>
              </div>

              {/* ── Withdraw ── */}
              <div className="card p-5">
                <span className="text-label">Withdraw</span>
                <div className="mt-2 mb-3">
                  <div className="text-[12px] text-[#86868b] mb-1">Available (USDC est.)</div>
                  <div className="text-[20px] font-bold text-[#1d1d1f]">${total.toFixed(4)}</div>
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={!isConnected || (isOnArc && total === 0) || isWithdrawing}
                  className="btn-secondary w-full disabled:opacity-50"
                  id="withdraw-reader-btn"
                >
                  {isWithdrawing ? "Withdrawing…" : !isOnArc ? "Switch to Arc Testnet" : "Withdraw to USDC"}
                </button>
                <p className="text-[11px] text-[#86868b] mt-2 text-center">USYC → USDC instantly</p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between">
                  <span className="text-label">Balance Breakdown</span>
                  <span className="text-[11px] text-[#86868b]">Live</span>
                </div>
                {isConnected ? (
                  <div className="px-5 py-5 space-y-3">
                    {[
                      { label: "USDC Float (instant reads)", value: `$${floatUsdc.toFixed(6)}`, note: "~" + Math.floor(floatUsdc / 0.001) + " reads available" },
                      { label: "USYC Staked (yield-bearing)", value: `$${stakedUsdc.toFixed(6)}`, note: "Auto-staked on deposit" },
                      { label: "Total Estimated Value",        value: `$${total.toFixed(6)}`,     note: "Float + USYC in USDC" },
                    ].map(row => (
                      <div key={row.label} className="flex items-start justify-between py-2.5 border-b border-black/[0.05] last:border-0">
                        <div>
                          <div className="text-[13px] text-[#1d1d1f] font-medium">{row.label}</div>
                          <div className="text-[11px] text-[#86868b] mt-0.5">{row.note}</div>
                        </div>
                        <div className="text-[14px] font-semibold text-[#1d1d1f] tabular-nums">{row.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center text-[13px] text-[#86868b]">
                    Connect your wallet to view balance details
                  </div>
                )}
              </div>

              <div className="card p-5">
                <h3 className="text-title mb-4">How it works.</h3>
                <div className="space-y-3">
                  {[
                    "Deposit USDC — $0.01 stays as liquid float for instant reads.",
                    "Rest auto-stakes into USYC — earning yield while you browse.",
                    "Each read deducts $0.001 from float, or redeems USYC if float is low.",
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0071e3] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] text-white font-bold">{i + 1}</span>
                      </div>
                      <p className="text-[14px] text-[#6e6e73] leading-relaxed">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
