import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
console.log("Using API Key:", apiKey ? (apiKey.substring(0, 6) + "...") : "MISSING");
if (!apiKey) {
  console.error("No API key found. Please set GOOGLE_GENAI_API_KEY or GEMINI_API_KEY.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "Hello"
    });
    console.log("Response text:", res.text);
  } catch (e) {
    console.error("Error with gemini-3.1-pro-preview:");
    console.error(e);
  }
}
run();
