"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";

interface UserProfile {
  displayName: string | null;
  username: string | null;
  bio: string | null;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();

  const [profile, setProfile] = useState<UserProfile>({ displayName: "", username: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    fetch(`/api/user?address=${address}`)
      .then(r => r.json())
      .then((data: { user: UserProfile | null }) => {
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
    if (!address) return;
    setSaving(true);
    setError(null);
    setSaved(false);
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
        </div>
      </nav>

      <main className="max-w-content mx-auto px-6 pt-28 pb-20">
        <div className="max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight mb-1">Profile</h1>
            <p className="text-[14px] text-[#6e6e73]">How you appear to other readers and writers.</p>
          </div>

          {!isConnected ? (
            <div className="rounded-xl border border-black/[0.08] p-8 text-center">
              <p className="text-[14px] text-[#6e6e73] mb-4">Connect your wallet to manage your profile.</p>
              <Link href="/" className="btn-primary text-[13px] py-2 px-5">Go to home</Link>
            </div>
          ) : loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-lg bg-black/[0.05]" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Wallet address (read-only) */}
              <div>
                <label className="block text-[12px] font-medium text-[#1d1d1f] mb-2">Wallet address</label>
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
                  value={profile.displayName ?? ""}
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
                    value={profile.username ?? ""}
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
                  value={profile.bio ?? ""}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell readers a bit about yourself…"
                  maxLength={200}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.12] text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]/20 transition-all resize-none"
                />
                <p className="mt-1 text-[11px] text-[#86868b] text-right">{(profile.bio ?? "").length}/200</p>
              </div>

              {/* Error */}
              {error && (
                <p className="text-[13px] text-red-500 bg-red-50 px-3.5 py-2.5 rounded-lg">{error}</p>
              )}

              {/* Save */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-[14px] py-2.5 px-6 disabled:opacity-50"
                >
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
          )}
        </div>
      </main>
    </div>
  );
}
