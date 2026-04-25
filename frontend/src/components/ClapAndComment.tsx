"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { useReaderVault } from "@/hooks/useReaderVault";

export interface CommentData {
  id?: string;
  content: string;
  author: string;
  author_addr?: string;
  authorAddr?: string;
  tx_hash?: string | null;
  created_at?: string;
}

interface ClapAndCommentProps {
  writerAddress: `0x${string}`;
  slug: string;
  initialComments?: CommentData[];
}

export function ClapAndComment({ writerAddress, slug, initialComments = [] }: ClapAndCommentProps) {
  const { address, isConnected } = useAccount();
  const { payForClap, isClapSubmitting, payForComment, isCommentSubmitting, refetchActivity } = useReaderVault();
  
  const [claps, setClaps] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [error, setError] = useState<string | null>(null);

  const handleClap = async () => {
    if (!isConnected || !address) {
      setError("Connect wallet to clap");
      return;
    }
    setError(null);
    try {
      const txHash = await payForClap(writerAddress, slug);
      
      // Save clap directly to DB
      await fetch("/api/claps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash,
          slug,
          writerAddress,
          readerAddress: address
        }),
      });

      setClaps(c => c + 1);
      if (refetchActivity) refetchActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clap failed");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError("Connect wallet to comment");
      return;
    }
    if (!commentText.trim()) return;
    setError(null);
    
    try {
      // Fixed sub-cent fee for comments as an anti-spam measure: 0.01 USDC
      const commentPrice = parseUnits("0.01", 18);
      
      // We simulate the IPFS hash here by using the txHash after it's confirmed
      // or a mock hash for now to pass to the contract.
      const mockHash = "ipfs://" + Math.random().toString(36).substring(7);
      
      const txHash = await payForComment(writerAddress, slug, commentPrice, mockHash);
      
      // Persist to DB
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          authorAddr: address,
          content: commentText,
          txHash: txHash,
          writerAddress: writerAddress
        }),
      });

      if (!res.ok) throw new Error("Failed to save comment to database");
      const { comment } = await res.json();
      
      setComments([comment, ...comments]);
      setCommentText("");
      if (refetchActivity) refetchActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    }
  };

  const formatAddr = (addr?: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="mt-12 pt-8 border-t border-black/[0.08]">
      <h3 className="text-[20px] font-bold text-[#1d1d1f] mb-6">Community</h3>
      
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      
      {/* Claps */}
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={handleClap} 
          disabled={isClapSubmitting}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-black/[0.08] hover:bg-black/[0.02] transition-colors disabled:opacity-50"
        >
          <span className="text-xl">👏</span>
          <span className="text-[14px] font-medium">{claps} {claps === 1 ? 'Clap' : 'Claps'}</span>
        </button>
        <span className="text-[12px] text-[#86868b]">($0.001 per clap)</span>
      </div>

      {/* Comments */}
      <div className="mb-8">
        <h4 className="text-[16px] font-semibold text-[#1d1d1f] mb-4">Leave a Comment (Anti-Spam)</h4>
        <p className="text-[12px] text-[#86868b] mb-4">To prevent bots, leaving a comment requires a $0.01 micro-payment directly to the author.</p>
        
        <form onSubmit={handleComment} className="mb-6">
          <textarea 
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full p-4 rounded-xl border border-black/[0.08] mb-3 focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-[14px]"
            rows={3}
            disabled={isCommentSubmitting}
          />
          <button 
            type="submit" 
            disabled={!commentText.trim() || isCommentSubmitting}
            className="btn-primary px-6 py-2 rounded-full disabled:opacity-50 text-[14px]"
          >
            {isCommentSubmitting ? "Paying..." : "Pay $0.01 & Post Comment"}
          </button>
        </form>

        {/* List of comments */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-[13px] text-[#86868b] text-center py-4">No comments yet. Be the first!</p>
          ) : (
            comments.map((c, idx) => (
              <div key={c.id || idx} className="p-4 rounded-xl bg-gray-50 border border-black/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold text-[#1d1d1f]">{c.author}</p>
                  <p className="text-[11px] text-[#86868b]">{formatAddr(c.author_addr || c.authorAddr)}</p>
                </div>
                <p className="text-[14px] text-[#424245] leading-relaxed">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
