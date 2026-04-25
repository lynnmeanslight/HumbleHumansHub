import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { fetchAllArticles } from "@/lib/db";
import { parseUnits } from "viem";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Tools for Gemini
const selectArticlesTool = {
  name: "select_articles",
  description: "Select up to 5 articles from the database that are most relevant to answering the user's query.",
  parameters: {
    type: "object",
    properties: {
      slugs: {
        type: "array",
        items: { type: "string" },
        description: "Array of slugs for the selected articles (max 5).",
      },
    },
    required: ["slugs"],
  }
};

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const articlesMeta = await fetchAllArticles();
    const availableArticlesContext = articlesMeta.map(a => `Title: ${a.title}\nAuthor: ${a.author_name}\nSlug: ${a.slug}\nExcerpt: ${a.excerpt}\nCategory: ${a.category}`).join("\n\n");

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview", 
      config: {
        systemInstruction: `You are an assistant that selects the most relevant articles for a user's query.
Users may search by topic, title, or author name. 
Be helpful and inclusive: if an article is even partially related, include it. 
Try to find as many relevant articles as possible (up to 5).

Here are the available articles in our database:
${availableArticlesContext}

Instructions:
1. If the user asks for a specific author (e.g., "by Anonymous"), prioritize all articles by that author.
2. If the user asks about a topic, find articles whose titles, categories, or excerpts match.
3. Use the 'select_articles' tool to return an array of up to 5 'slugs'. 
4. Only return an empty array if there is absolutely no connection between the query and the database.`,
        tools: [{ functionDeclarations: [selectArticlesTool as any] }],
        temperature: 0.2,
      }
    });

    const currentResponse = await chat.sendMessage({ message: prompt });
    const functionCalls = currentResponse.functionCalls;

    let selectedSlugs: string[] = [];
    if (functionCalls && functionCalls.length > 0 && functionCalls[0].name === "select_articles") {
        selectedSlugs = (functionCalls[0].args?.slugs as string[]) || [];
        // Enforce max 5
        selectedSlugs = selectedSlugs.slice(0, 5);
    }

    if (selectedSlugs.length === 0) {
        return NextResponse.json({ 
            proposal: null,
            message: "I couldn't find any relevant articles in the database for your query." 
        });
    }

    // Calculate Economics
    const selectedArticles = articlesMeta.filter(a => selectedSlugs.includes(a.slug));
    
    let totalReadPrice = 0;
    const writers: string[] = [];
    const slugs: string[] = [];
    const originalPrices: number[] = [];

    for (const a of selectedArticles) {
        totalReadPrice += a.price;
        writers.push(a.author_address);
        slugs.push(a.slug);
        originalPrices.push(a.price);
    }

    // Dynamic Fee: 50% of the total read price of the selected articles
    const searchFee = totalReadPrice * 0.50;
    
    // Distribute 50% of the search fee to authors proportionally
    const totalAuthorShare = searchFee * 0.50;
    const authorSharesAtomic: string[] = [];
    
    for (let i = 0; i < selectedArticles.length; i++) {
        // authorShare = (their price / total price) * totalAuthorShare
        const share = (originalPrices[i] / totalReadPrice) * totalAuthorShare;
        // Convert to 18 decimals and format as string for BigInt parsing on frontend
        authorSharesAtomic.push(parseUnits(share.toFixed(6), 18).toString()); 
    }

    const totalPriceAtomic = parseUnits(searchFee.toFixed(6), 18).toString();

    const proposal = {
        articles: selectedArticles.map(a => ({ title: a.title, slug: a.slug, authorAddress: a.author_address, originalPrice: a.price })),
        totalSearchFee: searchFee.toFixed(4),
        totalPriceAtomic,
        writers,
        slugs,
        authorSharesAtomic
    };

    // Save to DB
    const { prisma } = await import("@/lib/db");
    const queryRecord = await prisma.agentQuery.create({
      data: {
        userAddress: req.headers.get("X-Reader-Address") || "0x0000000000000000000000000000000000000000",
        prompt,
        proposal: proposal as any
      }
    });

    return NextResponse.json({
      queryId: queryRecord.id,
      proposal
    });

  } catch (error) {
    console.error("[Agent API Error]:", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}