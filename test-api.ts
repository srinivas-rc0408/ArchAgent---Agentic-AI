import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: "Hello"
    });
    for await (const chunk of stream) {
      console.log(chunk.text);
    }
  } catch (e: any) {
    console.error("Error:", JSON.stringify(e));
  }
}
run();
