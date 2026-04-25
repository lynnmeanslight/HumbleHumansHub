import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { fetchArticle } from "@/lib/db";
import { createPublicClient, http, decodeEventLog, parseAbiItem, type Hash } from "viem";
import { contracts } from "@/lib/arc";

const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002");
const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";

const arcClient = createPublicClient({
  chain: {
    id: ARC_CHAIN_ID,
    name: "Arc Testnet",
    nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [ARC_RPC] } },
  },
  transport: http(ARC_RPC),
});

const AGENT_SEARCH_PAID_EVENT = parseAbiItem(
  "event AgentSearchPaid(address indexed reader, uint256 totalFee, uint256 platformFee)"
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
  }

  try {
    const { prompt, txHash, slugs, queryId } = await req.json();

    if (!prompt || !txHash || !slugs || slugs.length === 0 || !queryId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // 1. Verify Payment On-Chain
    let receipt;
    try {
      receipt = await arcClient.getTransactionReceipt({ hash: txHash as Hash });
    } catch {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction reverted" }, { status: 400 });
    }

    let searchPaidFound = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== (contracts.readerVault || "").toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: [AGENT_SEARCH_PAID_EVENT],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "AgentSearchPaid") {
          searchPaidFound = true;
          break;
        }
      } catch {}
    }

    if (!searchPaidFound) {
      return NextResponse.json({ error: "No valid AgentSearchPaid event found in tx" }, { status: 400 });
    }

    // 2. Fetch Full Articles for Context
    const fullArticles = [];
    for (const slug of slugs) {
        const full = await fetchArticle(slug);
        if (full) {
            fullArticles.push({
                title: full.title,
                slug: full.slug,
                content: full.content 
            });
        }
    }

    // 3. Generate Final Answer
    const context = fullArticles.map(a => `Title: ${a.title}\nSlug: ${a.slug}\nContent:\n${a.content}`).join("\n\n---\n\n");

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are the "Hyper-Personalized Research Assistant" for HumbleHumansHub. 
The user has paid a dynamic search fee to have you curate answers from premium articles.

Here are the full texts of the 1 to 5 premium articles they paid you to analyze:
${context}

Your Task:
1. Synthesize a brilliant, helpful answer to the user's prompt using ONLY the information provided in the articles above.
2. Underneath your answer, you MUST provide "Read More" markdown links to the source articles so the user can read the full context if they choose. Format: [Read 'Article Title' for full context](/read/{Slug})

Tone: Professional, highly intelligent, and helpful. You are justifying the fee they just paid you.`,
        temperature: 0.4,
      }
    });

    const response = await chat.sendMessage({ message: prompt });
    const finalAnswer = response.text || "I was unable to formulate an answer from the provided texts.";

    // Save final answer and txHash to DB
    const { prisma } = await import("@/lib/db");
    try {
      await prisma.agentQuery.update({
        where: { id: queryId },
        data: { txHash, finalAnswer }
      });
    } catch (e) {
      console.error("Failed to update query record:", e);
    }

    return NextResponse.json({ answer: finalAnswer });

  } catch (error) {
    console.error("[Agent API Error]:", error);
    return NextResponse.json({ error: `Agent Error: ${error instanceof Error ? error.message : JSON.stringify(error)}` }, { status: 500 });
  }
}
