"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { useReaderVault } from "@/hooks/useReaderVault";

interface Message {
  role: "user" | "agent" | "system";
  text: string;
  proposal?: {
    articles: { title: string; slug: string; author: string; originalPrice: number }[];
    totalSearchFee: string;
    totalPriceAtomic: string;
    writers: string[];
    slugs: string[];
    authorSharesAtomic: string[];
  };
}

export function AgentChat() {
  const { address, isConnected } = useAccount();
  const { payForAgentSearch, isAgentSearchSubmitting } = useReaderVault();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Track the current active proposal
  const [activeProposal, setActiveProposal] = useState<Message["proposal"] | null>(null);
  const [activePrompt, setActivePrompt] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!isConnected) {
      setMessages(prev => [...prev, { role: "system", text: "Please connect your wallet to use the Agentic Search feature." }]);
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);
    setActiveProposal(null);
    setActivePrompt(userMessage);

    try {
      const response = await fetch("/api/agent/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.proposal) {
          setMessages(prev => [
            ...prev,
            { 
              role: "agent", 
              text: `I found ${data.proposal.articles.length} premium articles that match your query. To process them and generate a comprehensive answer, the dynamic search fee is $${data.proposal.totalSearchFee} USDC (50% of their total read price).`,
              proposal: data.proposal 
            }
          ]);
          setActiveProposal(data.proposal);
        } else {
           setMessages(prev => [...prev, { role: "agent", text: data.message || "I couldn't find anything relevant." }]);
        }
      } else {
        setMessages(prev => [...prev, { role: "system", text: `Error: ${data.error || "Failed to search."}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "system", text: "Error: Network issue or server is down." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayAndGenerate = async () => {
    if (!activeProposal || !activePrompt) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "system", text: "Awaiting wallet confirmation..." }]);

    try {
      // 1. Pay On-Chain
      const txHash = await payForAgentSearch(
        activeProposal.writers as `0x${string}`[],
        activeProposal.slugs,
        activeProposal.authorSharesAtomic.map(s => BigInt(s)),
        BigInt(activeProposal.totalPriceAtomic)
      );

      setMessages(prev => [...prev, { role: "system", text: `Payment confirmed! Generating your answer... (TX: ${txHash?.slice(0,10)}...)` }]);
      
      // Clear proposal so they can't click pay again
      const currentProposal = activeProposal;
      setActiveProposal(null); 

      // 2. Fetch Final Answer
      const response = await fetch("/api/agent/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: activePrompt,
          txHash: txHash,
          slugs: currentProposal.slugs
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, { role: "agent", text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: "system", text: `Error generating answer: ${data.error}` }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "system", text: `Payment failed: ${error instanceof Error ? error.message : "Unknown error"}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a 
            key={i} 
            href={match[2]} 
            className="inline-flex items-center gap-1 text-[#0071e3] font-medium hover:underline bg-[#0071e3]/10 px-2 py-0.5 rounded-md mt-1"
          >
            {match[1]}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
            </svg>
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-16 rounded-2xl overflow-hidden shadow-xl border border-black/[0.06] bg-white flex flex-col h-[500px]">
      <div className="bg-[#f5f5f7] px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0071e3] to-[#42a1ff] flex items-center justify-center text-white font-bold">
            G
          </div>
          <div>
            <h3 className="font-bold text-[#1d1d1f]">Hyper-Personalized Research Assistant</h3>
            <p className="text-[12px] text-[#86868b]">AI-powered article curation</p>
          </div>
        </div>
        <div className="badge badge-accent text-[10px]">Powered by Gemini 3 Flash Preview</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafafa]">
        {messages.length === 0 && (
          <div className="text-center text-[#86868b] mt-10">
            <p className="mb-4">Ask me to research a topic. I will find relevant premium articles, calculate a dynamic search fee, and synthesize a complete answer for you. Authors get paid instantly.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => setInput("What are the benefits of micro-payments over subscriptions?")} className="text-[13px] bg-white border border-black/[0.08] rounded-full px-4 py-2 hover:border-[#0071e3] transition-colors">"What are the benefits of micro-payments over subscriptions?"</button>
              <button onClick={() => setInput("Research the future of the creator economy on Web3.")} className="text-[13px] bg-white border border-black/[0.08] rounded-full px-4 py-2 hover:border-[#0071e3] transition-colors">"Research the future of the creator economy on Web3."</button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : msg.role === "system" ? "items-center" : "items-start"}`}>
            
            {msg.role === "system" ? (
               <div className="text-[12px] text-[#86868b] italic my-2">{msg.text}</div>
            ) : (
              <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                msg.role === "user" 
                  ? "bg-[#0071e3] text-white rounded-br-none" 
                  : "bg-white border border-black/[0.08] text-[#1d1d1f] rounded-bl-none shadow-sm"
              }`}>
                <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
                  {renderMessageContent(msg.text)}
                </div>

                {/* Render Payment Proposal if it exists */}
                {msg.proposal && activeProposal === msg.proposal && (
                  <div className="mt-4 p-4 bg-[#f5f5f7] border border-black/[0.06] rounded-xl">
                    <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider mb-2">Sources to process:</p>
                    <ul className="space-y-2 mb-4">
                      {msg.proposal.articles.map((a, i) => (
                        <li key={i} className="text-[13px] flex justify-between">
                          <span className="truncate pr-4">"{a.title}"</span>
                          <span className="text-[#86868b]">${a.originalPrice.toFixed(3)}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex justify-between items-center border-t border-black/[0.06] pt-3 mb-4">
                      <span className="text-[14px] font-semibold text-[#1d1d1f]">Total Search Fee</span>
                      <span className="text-[14px] font-bold text-[#0071e3]">${msg.proposal.totalSearchFee}</span>
                    </div>

                    <button 
                      onClick={handlePayAndGenerate}
                      disabled={isLoading || isAgentSearchSubmitting}
                      className="w-full btn-primary py-2.5 text-[13px] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAgentSearchSubmitting ? (
                        <>
                           <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Approving Transaction...
                        </>
                      ) : (
                        `Pay $${msg.proposal.totalSearchFee} & Generate Answer`
                      )}
                    </button>
                    <p className="text-center text-[10px] text-[#86868b] mt-2">50% of this fee goes directly to the authors.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && !isAgentSearchSubmitting && (
          <div className="flex items-start">
            <div className="bg-white border border-black/[0.08] rounded-2xl rounded-bl-none px-5 py-4 shadow-sm flex gap-1">
              <div className="w-2 h-2 bg-[#0071e3] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-[#0071e3] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-[#0071e3] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-black/[0.06]">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent to research..."
            className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-full pl-5 pr-12 py-3 text-[14px] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-colors"
            disabled={isLoading || !!activeProposal}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading || !!activeProposal}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#0071e3] text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
