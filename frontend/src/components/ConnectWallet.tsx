"use client";

import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from "wagmi";
import { useState, useEffect } from "react";
import { arcTestnet, ensureArcWalletChain } from "@/lib/arc";
import Link from "next/link";

export function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const [showMenu, setShowMenu] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const isOnArc = chainId === arcTestnet.id;
  const truncated = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const bal = balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : "";

  // Fetch display name whenever address changes
  useEffect(() => {
    if (!address) { setDisplayName(null); return; }
    fetch(`/api/user?address=${address}`)
      .then(r => r.json())
      .then((data: { user: { displayName: string | null } | null }) => {
        setDisplayName(data.user?.displayName ?? null);
      })
      .catch(() => {});
  }, [address]);

  async function handleSwitchNetwork() {
    setSwitchError(null);

    try {
      await switchChain({ chainId: arcTestnet.id });
    } catch {
      try {
        await ensureArcWalletChain();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to switch payment network";
        setSwitchError(msg);
      }
    }
  }

  if (!isConnected) {
    return (
      <button
        onClick={() => {
          const mm = connectors.find((c) => c.id === "metaMaskSDK" || c.id === "metaMask" || c.name === "MetaMask");
          if (mm) connect({ connector: mm });
          else if (connectors[0]) connect({ connector: connectors[0] });
        }}
        disabled={isPending}
        className="btn-primary text-[13px] py-2 px-4 disabled:opacity-50"
        id="connect-wallet-btn"
      >
        {isPending ? "Connecting…" : "Get Started"}
      </button>
    );
  }

  // Wrong network — show prominent switch button instead of account menu
  if (!isOnArc) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitching}
          className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-red-50 border border-red-200 text-[13px] font-medium text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
          id="switch-network-btn"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {isSwitching ? "Switching…" : "Switch Payment Network"}
        </button>
        {switchError && <p className="max-w-60 text-right text-[11px] text-red-500">{switchError}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg border border-black/[0.08] hover:border-black/[0.2] hover:bg-black/[0.02] transition-all"
        id="account-btn"
      >
        <span className="live-dot" />
        <span className="text-[13px] font-medium text-[#1d1d1f]">
          {displayName && displayName !== "Anonymous" ? displayName : truncated}
        </span>
        {bal && (
          <>
            <span className="w-px h-3.5 bg-black/[0.1]" />
            <span className="text-[13px] text-[#6e6e73]">{bal}</span>
          </>
        )}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-white border border-black/[0.1] rounded-xl p-2 shadow-xl animate-slide-down">
            <div className="px-3 py-2.5">
              <div className="text-label mb-1.5">Account</div>
              <div className="text-[13px] text-[#1d1d1f] break-all font-mono">{address}</div>
            </div>
            {bal && (
              <>
                <div className="h-px bg-black/[0.06] mx-2" />
                <div className="px-3 py-2.5">
                  <div className="text-label mb-1.5">Balance</div>
                  <div className="text-[13px] text-[#1d1d1f]">{bal}</div>
                </div>
              </>
            )}
            <div className="h-px bg-black/[0.06] mx-2" />
            <div className="px-3 py-2.5">
              <div className="text-label mb-1.5">Payment Network</div>
              <div className="flex items-center gap-1.5">
                <span className="live-dot" />
                <span className="text-[13px] text-[#1d1d1f]">{arcTestnet.name}</span>
              </div>
            </div>
            <div className="h-px bg-black/[0.06] mx-2" />
            <Link
              href="/account"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-[13px] text-[#1d1d1f] hover:bg-black/[0.04] transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-[#6e6e73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {displayName ?? "Anonymous"}
              <span className="ml-auto text-[11px] text-[#86868b]">Profile</span>
            </Link>
            <div className="h-px bg-black/[0.06] mx-2" />
            <button
              onClick={() => { disconnect(); setShowMenu(false); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] text-red-500 hover:bg-red-50 transition-colors"
              id="disconnect-btn"
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
