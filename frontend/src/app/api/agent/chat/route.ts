import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { fetchAllArticles, fetchArticle } from "@/lib/db";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Tools for Gemini
const searchAndReadDatabaseTool = {
  name: "search_and_read_database",
  description: "Search the platform's database for premium articles and read their full content internally to evaluate if they match the user's query.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The topic or keyword to search for." },
    },
    required: ["query"],
  }
};

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured. Please add it to your .env file." }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    console.log(`[Agent] Received prompt: ${prompt}`);

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are the "Hyper-Personalized Research Assistant" for HumbleHumansHub, a pay-per-read article platform where users pay $0.001 to read premium content.

Your job is to help users find the exact articles they need based on their questions. 
When a user asks a question:
1. Use the 'search_and_read_database' tool to find relevant articles.
2. You will receive the full content of those articles. 
3. CRITICAL RULE: DO NOT answer the user's question directly by giving away the premium content. If you do, the authors won't get paid.
4. INSTEAD: Act as a brilliant curator. Tell the user a tiny, intriguing hint about what the article covers regarding their specific question, and then highly recommend they read it.
5. Provide a clear Markdown link to the article using its slug. Format: [Read 'Article Title' for $0.001](/read/slug)

Tone: Professional, helpful, concise, and persuasive. You are a premium matchmaker connecting curious readers with expert authors.`,
        tools: [{
          functionDeclarations: [searchAndReadDatabaseTool as any]
        }],
        temperature: 0.4,
      }
    });

    let currentResponse = await chat.sendMessage({ message: prompt });
    let functionCalls = currentResponse.functionCalls;
    let finalAnswer = "";

    // Loop to handle tool calls
    while (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      console.log(`[Agent] Calling tool: ${call.name}`, call.args);

      if (call.name === "search_and_read_database") {
        const articlesMeta = await fetchAllArticles();
        
        // Simple client-side search simulation
        const query = ((call.args?.query as string) || "").toLowerCase();
        const matchedMeta = articlesMeta.filter(a => 
          a.title.toLowerCase().includes(query) || 
          a.excerpt.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query)
        );

        // Fetch full content for the matches so the AI can evaluate them
        const fullArticles = [];
        for (const meta of matchedMeta) {
            const full = await fetchArticle(meta.slug);
            if (full) {
                fullArticles.push({
                    title: full.title,
                    slug: full.slug,
                    authorAddress: full.author_address,
                    price: full.price,
                    full_content_for_ai_eyes_only: full.content // The AI reads this, but shouldn't leak it
                });
            }
        }

        currentResponse = await chat.sendMessage({
          message: [{
            functionResponse: {
              name: call.name,
              response: { 
                  results: fullArticles.length > 0 ? fullArticles : "No articles found matching this topic in the database." 
              }
            }
          }]
        });
      } 

      functionCalls = currentResponse.functionCalls;
    }

    finalAnswer = currentResponse.text || "I was unable to formulate an answer.";

    return NextResponse.json({
      answer: finalAnswer
    });

  } catch (error) {
    console.error("[Agent API Error]:", error);
    return NextResponse.json({ 
      error: `Agent Error: ${error instanceof Error ? error.message : JSON.stringify(error)}` 
    }, { status: 500 });
  }
}
