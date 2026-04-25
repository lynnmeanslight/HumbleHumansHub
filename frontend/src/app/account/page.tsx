"use client";

import { useEffect, useState, Suspense } from "react";
import { useAccount } from "wagmi";
import { useSearchParams, useRouter } from "next/navigation";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WalletBalance } from "@/components/WalletBalance";
import { useReaderVault } from "@/hooks/useReaderVault";
import Link from "next/link";

// ─── Profile tab ────────────────────────────────────────────────────────────

function ProfileTab({ address }: { address: string }) {
  const [profile, setProfile] = useState({ displayName: "", username: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/user?address=${address}`)
      .then(r => r.json())
      .then((data: { user: { displayName: string | null; username: string | null; bio: string | null } | null }) => {
        setProfile({
          displayName: data.user?.displayName ?? "",
          username: data.user?.username ?? "",
          bio: data.user?.bio ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          displayName: profile.displayName?.trim() || "Anonymous",
          username: profile.username?.trim() || undefined,
          bio: profile.bio?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse max-w-md">
        {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-black/[0.05]" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-md">
      {/* Wallet address (read-only) */}
      <div>
        <label className="block text-[12px] font-medium text-[#1d1d1f] mb-2">Account address</label>
        <div className="h-10 px-3.5 rounded-lg border border-black/[0.08] bg-black/[0.02] flex items-center">
          <span className="text-[13px] text-[#86868b] font-mono truncate">{address}</span>
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-[12px] font-medium text-[#1d1d1f] mb-2">
          Display name
          <span className="ml-1.5 text-[#86868b] font-normal">Shown on your articles</span>
        </label>
        <input
          type="text"
          value={profile.displayName}
          onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
          placeholder="Anonymous"
          maxLength={60}
          className="w-full h-10 px-3.5 rounded-lg border border-black/[0.12] text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/20 transition-all"
        />
      </div>

      {/* Username */}
      <div>
        <label className="block text-[12px] font-medium text-[#1d1d1f] mb-2">
          Username
          <span className="ml-1.5 text-[#86868b] font-normal">Optional — letters, numbers, underscores</span>
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#86868b]">@</span>
          <input
            type="text"
            value={profile.username}
            onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
            placeholder="yourname"
            maxLength={30}
            pattern="[a-zA-Z0-9_]*"
            className="w-full h-10 pl-7 pr-3.5 rounded-lg border border-black/[0.12] text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/20 transition-all"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-[12px] font-medium text-[#1d1d1f] mb-2">
          Bio
          <span className="ml-1.5 text-[#86868b] font-normal">Max 200 characters</span>
        </label>
        <textarea
          value={profile.bio}
          onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
          placeholder="Tell readers a bit about yourself…"
          maxLength={200}
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.12] text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/20 transition-all resize-none"
        />
        <p className="mt-1 text-[11px] text-[#86868b] text-right">{profile.bio.length}/200</p>
      </div>

      {error && (
        <p className="text-[13px] text-red-500 bg-red-50 px-3.5 py-2.5 rounded-lg">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary text-[14px] py-2.5 px-6 disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="text-[13px] text-[#1a8917] flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

// ─── Wallet tab ──────────────────────────────────────────────────────────────

function WalletTab() {
  const [amt, setAmt] = useState("");
  const [txMsg, setTxMsg] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const {
    usdcFloat, totalUsdcValue,
    deposit, isDepositing, isDepositSuccess, depositError,
    withdraw, isWithdrawing, isWithdrawSuccess,
    refetchBalance,
    totalReadsPerformed, totalClapsGiven, totalCommentsGiven,
    isOnArc, switchToArcAsync,
  } = useReaderVault();

  const floatUsdc  = Number(usdcFloat) / 1e18;
  const total      = Number(totalUsdcValue) / 1e18;
  const stakedUsdc = total - floatUsdc;

  useEffect(() => {
    if (!isDepositSuccess) return;
    refetchBalance(); setAmt(""); setTxMsg("Funds added ✓");
    setTimeout(() => setTxMsg(null), 4000);
  }, [isDepositSuccess, refetchBalance]);

  useEffect(() => {
    if (!depositError) return;
    const msg = (depositError as { shortMessage?: string }).shortMessage ?? depositError.message ?? "Could not add funds";
    setTxMsg(`Error: ${msg}`);
    setTimeout(() => setTxMsg(null), 6000);
  }, [depositError]);

  useEffect(() => {
    if (!isWithdrawSuccess) return;
    refetchBalance(); setTxMsg("Cash out confirmed ✓");
    setTimeout(() => setTxMsg(null), 4000);
  }, [isWithdrawSuccess, refetchBalance]);

  const handleDeposit = async () => {
    if (!isOnArc) {
      try { await switchToArcAsync(); } catch {
        setTxMsg("Error: Please switch to the payment network to add funds");
        setTimeout(() => setTxMsg(null), 6000); return;
      }
    }
    const amtNum = Number(amt);
    if (!amtNum || amtNum <= 0) return;
    const amtAtomic = BigInt(Math.round(amtNum * 1e18));
    try { deposit(amtAtomic); } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not add funds";
      setTxMsg(`Error: ${msg}`); setTimeout(() => setTxMsg(null), 6000);
    }
  };

  const handleWithdraw = async () => {
    try { await withdraw(); } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cash out failed";
      setTxMsg(`Error: ${msg}`); setTimeout(() => setTxMsg(null), 6000);
    }
  };

  return (
    <div>
      {txMsg && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-[13px] font-medium text-center ${txMsg.startsWith("Error:") ? "bg-[#fff1f1] border border-[#fecaca] text-[#dc2626]" : "bg-[#f0fdf4] border border-[#bbf7d0] text-[#1a8917]"}`}>
          {txMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <WalletBalance />

          {/* Deposit */}
          <div className="card p-5">
            <span className="text-label">Add Funds</span>
            <div className="mt-3 space-y-3">
              <div className="relative">
                <input
                  type="number" value={amt} onChange={e => setAmt(e.target.value)}
                  placeholder="0.10" step="0.01" min="0.01" disabled={!isConnected}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#f5f5f7] border border-black/[0.08] text-[#1d1d1f] placeholder-[#86868b] text-[14px] focus:outline-none focus:border-[#0071e3]/50 focus:ring-1 focus:ring-[#0071e3]/20 transition-all disabled:opacity-50"
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
                  <div className="text-[11px] text-[#86868b]">Where your money goes:</div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#6e6e73]">Ready to spend</span>
                    <span className="text-[#1d1d1f]">${Math.min(Number(amt), 0.01).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#6e6e73]">Savings that keep growing</span>
                    <span className="text-[#1a8917]">${Math.max(0, Number(amt) - 0.01).toFixed(4)}</span>
                  </div>
                </div>
              )}
              <button onClick={handleDeposit}
                disabled={!isConnected || (isOnArc && (!Number(amt) || isDepositing))}
                className="btn-accent w-full disabled:opacity-50">
                {isDepositing ? "Confirming…" : !isConnected ? "Connect to continue" : !isOnArc ? "Switch Payment Network" : !Number(amt) ? "Enter an amount" : "Add Funds"}
              </button>
              {!isConnected && <p className="text-[11px] text-[#86868b] text-center">Connect to add money to your reading balance</p>}
            </div>
          </div>

          {/* Withdraw */}
          <div className="card p-5">
            <span className="text-label">Cash Out</span>
            <div className="mt-2 mb-3">
              <div className="text-[12px] text-[#86868b] mb-1">Available to cash out</div>
              <div className="text-[20px] font-bold text-[#1d1d1f]">${total.toFixed(4)}</div>
            </div>
            <button onClick={handleWithdraw}
              disabled={!isConnected || (isOnArc && total === 0) || isWithdrawing}
              className="btn-secondary w-full disabled:opacity-50">
              {isWithdrawing ? "Cashing out…" : !isOnArc ? "Switch Payment Network" : "Cash Out"}
            </button>
            <p className="text-[11px] text-[#86868b] mt-2 text-center">We convert everything back for you automatically</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Activity summary */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between">
              <span className="text-label">My Activity</span>
              <span className="text-[11px] text-[#86868b]">History</span>
            </div>
            {isConnected ? (
              <div className="px-5 py-5 grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-[#f5f5f7]">
                  <div className="text-[20px] font-bold text-[#1d1d1f]">{totalReadsPerformed.toString()}</div>
                  <div className="text-[11px] text-[#86868b] uppercase tracking-wider font-medium">Reads</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#f5f5f7]">
                  <div className="text-[20px] font-bold text-[#1d1d1f]">{totalClapsGiven.toString()}</div>
                  <div className="text-[11px] text-[#86868b] uppercase tracking-wider font-medium">Claps</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#f5f5f7]">
                  <div className="text-[20px] font-bold text-[#1d1d1f]">{totalCommentsGiven.toString()}</div>
                  <div className="text-[11px] text-[#86868b] uppercase tracking-wider font-medium">Comments</div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-[13px] text-[#86868b]">Connect to view your activity</div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between">
              <span className="text-label">Balance Breakdown</span>
              <span className="text-[11px] text-[#86868b]">Live</span>
            </div>
            {isConnected ? (
              <div className="px-5 py-5 space-y-3">
                {[
                  { label: "Ready to spend", value: `$${floatUsdc.toFixed(6)}`, note: "~" + Math.floor(floatUsdc / 0.001) + " reads available right now" },
                  { label: "Growing in savings", value: `$${stakedUsdc.toFixed(6)}`, note: "Unused funds keep working in the background" },
                  { label: "Total balance", value: `$${total.toFixed(6)}`, note: "Spendable now plus savings balance" },
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
              <div className="px-5 py-10 text-center text-[13px] text-[#86868b]">Connect to view your balance details</div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-title mb-4">How it works.</h3>
            <div className="space-y-3">
              {[
                "Add funds once. A tiny amount stays ready so article unlocks feel instant.",
                "The rest moves into a background savings balance while you browse.",
                "Each article unlock uses your ready balance first, then quietly refills if needed.",
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
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

type Tab = "wallet" | "profile";

function AccountContent() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) ?? "wallet");

  function switchTab(t: Tab) {
    setTab(t);
    router.replace(`/account?tab=${t}`, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
            <div className="hidden md:flex items-center gap-5">
              <Link href="/read"   className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Publish</Link>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-12">
        <div className="max-w-content mx-auto px-6 py-14 md:py-20 text-center">
          <h1 className="text-hero mb-3">Account.</h1>
          <p className="text-[17px] text-[#86868b]">Manage your balance, payouts, and profile.</p>
        </div>
      </section>

      {/* Tab bar */}
      <div className="sticky top-12 z-40 bg-white border-b border-black/[0.08]">
        <div className="max-w-content mx-auto px-6">
          <div className="flex gap-0">
            {(["wallet", "profile"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`px-5 py-3 text-[13px] font-medium capitalize border-b-2 transition-all ${
                  tab === t
                    ? "border-[#0071e3] text-[#0071e3]"
                    : "border-transparent text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                {t === "wallet" ? "Balance" : "Profile"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-10 md:py-14">
          {!isConnected ? (
            <div className="max-w-sm mx-auto text-center py-10">
              <p className="text-[14px] text-[#6e6e73] mb-4">Connect to manage your account.</p>
            </div>
          ) : tab === "wallet" ? (
            <WalletTab />
          ) : (
            <ProfileTab address={address!} />
          )}
        </div>
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountContent />
    </Suspense>
  );
}
