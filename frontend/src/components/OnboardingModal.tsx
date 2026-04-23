"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

interface UserProfile {
  displayName: string | null;
  username: string | null;
  bio: string | null;
}

/**
 * Shown once after wallet connects if the user has no profile yet.
 * They can set a name or skip to stay Anonymous.
 */
export function OnboardingModal() {
  const { address, isConnected } = useAccount();

  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState<string | null>(null); // address we've checked
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When address connects, check if profile exists
  useEffect(() => {
    if (!isConnected || !address || address === checked) return;
    setChecked(address);

    fetch(`/api/user?address=${address}`)
      .then(r => r.json())
      .then((data: { user: UserProfile | null }) => {
        if (!data.user) setShow(true); // new user — show onboarding
      })
      .catch(() => {}); // silently ignore network errors
  }, [address, isConnected, checked]);

  // When wallet disconnects, reset so next connect rechecks
  useEffect(() => {
    if (!isConnected) {
      setChecked(null);
      setShow(false);
    }
  }, [isConnected]);

  async function handleSave() {
    if (!address) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          displayName: name.trim() || "Anonymous",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setShow(false);
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!address) { setShow(false); return; }
    // Create profile silently with Anonymous
    await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, displayName: "Anonymous" }),
    }).catch(() => {});
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleSkip} />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-8 pb-5">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-5">
            <svg className="w-5 h-5 text-[#1d1d1f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-[#1d1d1f] leading-tight mb-1.5">
            Welcome to HumbleHumansHub
          </h2>
          <p className="text-[14px] text-[#6e6e73] leading-relaxed">
            What should people call you? You can always change this later.
          </p>
        </div>

        {/* Input */}
        <div className="px-7 pb-5">
          <label className="block text-[12px] font-medium text-[#1d1d1f] mb-2">
            Display name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder="Anonymous"
            maxLength={60}
            autoFocus
            className="w-full h-10 px-3.5 rounded-lg border border-black/[0.12] text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/20 transition-all bg-white"
          />
          {error && (
            <p className="mt-2 text-[12px] text-red-500">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-7 pb-7 flex gap-2.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] active:bg-[#006edb] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
          <button
            onClick={handleSkip}
            disabled={saving}
            className="h-10 px-4 rounded-lg border border-black/[0.1] text-[14px] text-[#6e6e73] hover:text-[#1d1d1f] hover:border-black/[0.2] transition-all disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
