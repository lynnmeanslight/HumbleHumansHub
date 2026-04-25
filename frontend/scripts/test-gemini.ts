import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
import { GoogleGenAI } from "@google/genai";

async function main() {
  console.log("Checking API Key exists:", !!process.env.GEMINI_API_KEY);
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash",
      config: { temperature: 0.1 }
    });
    const resp = await chat.sendMessage({ message: "Hello" });
    console.log("Success:", resp.text);
  } catch (err: any) {
    console.error("Gemini 3 Flash Error:", err.message);
    try {
        const chat2 = ai.chats.create({
            model: "gemini-2.5-flash",
            config: { temperature: 0.1 }
        });
        const resp2 = await chat2.sendMessage({ message: "Hello" });
        console.log("Fallback to Gemini 2.5 Flash Success:", resp2.text);
    } catch (e: any) {
        console.error("Fallback Error:", e.message);
    }
  }
}

main();