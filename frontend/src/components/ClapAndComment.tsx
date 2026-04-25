"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { useReaderVault } from "@/hooks/useReaderVault";

export function ClapAndComment({ writerAddress, slug }: { writerAddress: `0x${string}`; slug: string }) {
  const { isConnected } = useAccount();
  const { payForClap, isClapSubmitting, payForComment, isCommentSubmitting } = useReaderVault();
  
  const [claps, setClaps] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<{ text: string, sender: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleClap = async () => {
    if (!isConnected) {
      setError("Connect wallet to clap");
      return;
    }
    setError(null);
    try {
      await payForClap(writerAddress, slug);
      setClaps(c => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clap failed");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Connect wallet to comment");
      return;
    }
    if (!commentText.trim()) return;
    setError(null);
    
    try {
      // In production, you would upload the comment to IPFS and get the hash.
      // We simulate it here by using a mock hash.
      const mockHash = "ipfs://" + Math.random().toString(36).substring(7);
      
      // Fixed sub-cent fee for comments as an anti-spam measure: 0.01 USDC
      const commentPrice = parseUnits("0.01", 18);
      
      await payForComment(writerAddress, slug, commentPrice, mockHash);
      
      setComments([...comments, { text: commentText, sender: "You" }]);
      setCommentText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    }
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
            className="w-full p-4 rounded-xl border border-black/[0.08] mb-3 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            rows={3}
            disabled={isCommentSubmitting}
          />
          <button 
            type="submit" 
            disabled={!commentText.trim() || isCommentSubmitting}
            className="btn-primary px-6 py-2 rounded-full disabled:opacity-50"
          >
            {isCommentSubmitting ? "Paying..." : "Pay $0.01 & Post Comment"}
          </button>
        </form>

        {/* List of comments */}
        <div className="space-y-4">
          {comments.map((c, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-black/[0.04]">
              <p className="text-[13px] font-medium text-[#1d1d1f] mb-1">{c.sender}</p>
              <p className="text-[14px] text-[#424245]">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
