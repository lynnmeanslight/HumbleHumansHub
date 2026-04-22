"use client";

import { useState } from "react";

interface PaymentGateProps { articleTitle: string; price?: string; onPayment?: () => Promise<void>; children: React.ReactNode; }

export function PaymentGate({ articleTitle, price = "$0.001", onPayment, children }: PaymentGateProps) {
  const [state, setState] = useState<"locked"|"paying"|"unlocked">("locked");

  const handlePay = async () => {
    setState("paying");
    try {
      if (onPayment) await onPayment(); else await new Promise(r => setTimeout(r, 1200));
      setState("unlocked");
    } catch { setState("locked"); }
  };

  if (state === "unlocked") return <div className="animate-fade-in" id="article-content-unlocked">{children}</div>;

  return (
    <div className="relative" id="payment-gate">
      <div className="relative overflow-hidden rounded-xl">
        <div className="blur-lg opacity-30 select-none pointer-events-none max-h-[400px] overflow-hidden">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/95 to-white/70">
          <div className="text-center max-w-sm mx-auto px-6">
            <div className="mx-auto w-14 h-14 rounded-xl bg-[#f5f5f7] border border-black/[0.08] flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-title mb-2">Unlock this article</h3>
            <p className="text-[13px] text-[#86868b] mb-5">&ldquo;{articleTitle}&rdquo;</p>
            <div className="mb-6">
              <span className="text-[36px] font-bold text-[#1d1d1f]">{price}</span>
              <span className="text-[14px] text-[#86868b] ml-2">USDC</span>
            </div>
            <button onClick={handlePay} disabled={state==="paying"} className="btn-primary w-full disabled:opacity-50" id="pay-to-read-btn">
              {state === "paying" ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Settling on Our Infrastructure…
                </span>
              ) : `Pay ${price} to Read`}
            </button>
            <p className="text-[11px] text-[#86868b] mt-4">From your USYC balance · Instant on Our Infrastructure</p>
          </div>
        </div>
      </div>
    </div>
  );
}
