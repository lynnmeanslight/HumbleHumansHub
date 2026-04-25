"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-4 text-3xl font-bold text-[#1d1d1f]">Not Found</h2>
      <p className="mb-8 text-[17px] text-[#86868b]">Could not find requested resource.</p>
      <Link href="/" className="btn-primary">Return Home</Link>
    </div>
  );
}
