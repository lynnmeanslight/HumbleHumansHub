import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { fetchAllArticles } from "@/lib/db";
import { parseUnits } from "viem";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Tools for Gemini
const selectArticlesTool = {
  name: "select_articles",
  description: "Select up to 3 articles from the database that are most relevant to answering the user's query.",
  parameters: {
    type: "object",
    properties: {
      slugs: {
        type: "array",
        items: { type: "string" },
        description: "Array of slugs for the selected articles (max 3).",
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
    const availableArticlesContext = articlesMeta.map(a => `Title: ${a.title}\nSlug: ${a.slug}\nExcerpt: ${a.excerpt}\nCategory: ${a.category}`).join("\n\n");

    const chat = ai.chats.create({
      model: "gemini-2.5-flash", // Good for quick parsing
      config: {
        systemInstruction: `You are an assistant that selects the most relevant articles for a user's query.
Here are the available articles in our database:
${availableArticlesContext}

Based on the user's query, use the 'select_articles' tool to return an array of up to 3 'slugs' that best match the topic. If nothing matches, return an empty array.`,
        tools: [{ functionDeclarations: [selectArticlesTool] }],
        temperature: 0.1,
      }
    });

    const currentResponse = await chat.sendMessage({ message: prompt });
    const functionCalls = currentResponse.functionCalls;

    let selectedSlugs: string[] = [];
    if (functionCalls && functionCalls.length > 0 && functionCalls[0].name === "select_articles") {
        selectedSlugs = (functionCalls[0].args.slugs as string[]) || [];
        // Enforce max 3
        selectedSlugs = selectedSlugs.slice(0, 3);
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

    return NextResponse.json({
      proposal: {
          articles: selectedArticles.map(a => ({ title: a.title, slug: a.slug, author: a.author, originalPrice: a.price })),
          totalSearchFee: searchFee.toFixed(4),
          totalPriceAtomic,
          writers,
          slugs,
          authorSharesAtomic
      }
    });

  } catch (error) {
    console.error("[Agent API Error]:", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}