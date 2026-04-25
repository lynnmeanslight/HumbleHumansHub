"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
      <p className="mb-8 text-[#86868b]">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-full bg-[#0071e3] px-6 py-2 text-white hover:bg-blue-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
