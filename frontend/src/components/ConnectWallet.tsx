"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { useState } from "react";

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [showMenu, setShowMenu] = useState(false);

  const truncated = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const bal = balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : "";

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
        {isPending ? "Connecting…" : "Connect"}
      </button>
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
        <span className="text-[13px] font-medium text-[#1d1d1f]">{truncated}</span>
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
              <div className="text-label mb-1.5">Wallet</div>
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
            {chain && (
              <>
                <div className="h-px bg-black/[0.06] mx-2" />
                <div className="px-3 py-2.5">
                  <div className="text-label mb-1.5">Network</div>
                  <div className="text-[13px] text-[#1d1d1f]">{chain.name}</div>
                </div>
              </>
            )}
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
