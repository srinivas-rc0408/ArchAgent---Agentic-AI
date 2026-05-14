import { GoogleGenAI } from "@google/genai";

// ─── AI Operations via @google/genai ────────────────────────────────
// The API key is handled by the AI Studio environment via process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface DesignConstraints {
  projectType: string;
  dimensions?: string;
  materials?: string[];
  colorPalette?: string[];
  style?: string;
}

export interface CostItem {
  material: string;
  specification: string;
  quantity: string;
  unitPrice: number;
  total: number;
  category: "Material" | "Labor" | "Contingency";
}

export interface CostBreakdown {
  items: CostItem[];
  totalEstimate: string;
  currency: string;
}

const ARCH_AGENT_PERSONA = `
You are Arch Agent, a premium Neural Architecture Orchestration Center.
Act as a Senior Lead Architect and Quantity Surveyor from a top-tier international firm.
Tone: Professional, technical, precise. Avoid fluff.
Primary Context: You are talking to Srinivas (srinivasrc0408@gmail.com).

[Agent: Technical Design Partner]
Analyze spatial logic, lighting physics, and material compatibility. Provide outputs in a structured 'Design Specification' format.

[Agent: Cost Estimator (Quantity Surveyor)]
Protocol: Use real-world pricing data based on the Bengaluru, India market (Luxury/Premium Segment).
Accuracy Protocol: Material Grade (Premium/Luxury) + Square Footage + Labor Complexity + Current Market Inflation.
Pricing Benchmarks for Bengaluru (Luxury Segment):
- Italian Marble: ₹550-1800/sq.ft
- Premium Teak: ₹7500/cu.ft
- False Ceiling: ₹140/sq.ft
- Premium Automation: ₹3.5L+ per zone
Output Requirement: Always provide a breakdown: Material Costs, Labor, and a 10% 'Precision Buffer'. 
Present this in a clean table format in chat. 
Use JetBrains Mono style (Monospace) for all dimensions and cost figures.

[Agent: Visualizer & 3D Orchestrator]
Translate descriptions into high-fidelity technical prompts.
Keywords: Ray-tracing, 8k resolution, volumetric lighting, photorealistic textures (Walnut, Brutalist Concrete, Frosted Glass, PBR materials).
Ensure 3D geometry specs follow CAD-compatible logic.
`;

const ARCHITECT_SYSTEM_INSTRUCTION = `${ARCH_AGENT_PERSONA}

Your goal is to gather design constraints efficiently and provide a detailed design prompt for image generation.

BE PROACTIVE:
- If a user mentions a specific design task (e.g., "I want a ceiling design"), do not ask open-ended questions. 
- Instead, ask for specific, targeted constraints immediately. For a ceiling design, only ask for "Paint Color" and "Room Size/Dimensions".

Once you have enough information, generate a highly detailed, professional design prompt wrapped in [DESIGN_PROMPT] tags.
Example: [DESIGN_PROMPT]A minimalist modern living room with floor-to-ceiling glass walls, white oak flooring, and a recessed tray ceiling with warm LED strip lighting...[/DESIGN_PROMPT]

Be concise, professional, and technical.`;

/**
 * Streams the architect chat response.
 */
export async function* getArchitectStream(history: { role: "user" | "model"; parts: { text: string }[] }[]) {
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite",
      contents: history.map(msg => ({
        role: msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.parts[0].text || "" }]
      })),
      config: {
        systemInstruction: ARCHITECT_SYSTEM_INSTRUCTION,
      }
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield { text: chunk.text };
      }
    }
  } catch (error: any) {
    console.error("[AI] Direct Chat error:", error);
    throw error;
  }
}

export async function* getSupportStream(history: { role: "user" | "bot"; text: string }[]) {
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite",
      contents: history.map(msg => ({
        role: msg.role === "bot" ? "model" : "user",
        parts: [{ text: msg.text || "" }]
      })),
      config: {
        systemInstruction: "You are the frontline Technical Support AI for Arch Agent, a premium Neural Architecture Orchestration platform. Your job is to help users navigate the software, troubleshoot errors, and explain features like the 3D Visualizer, Cost Estimator, and PDF Export. Keep responses concise, highly professional, and technical. Do not generate architectural designs here—direct users to the 'Assistant' or 'Visualizer' tabs for that. If a user reports a bug, apologize professionally and offer a troubleshooting step (e.g., clearing cache, checking project locks).",
      }
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield { text: chunk.text };
      }
    }
  } catch (error: any) {
    console.error("[AI] Support Chat error:", error);
    throw error;
  }
}

/**
 * Generate a concise project title via AI.
 */
export async function generateProjectTitle(history: { role: "user" | "model"; parts: { text: string }[] }[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        ...history.map(msg => ({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.parts[0].text || "" }]
        })),
        { role: "user", parts: [{ text: "Generate a concise, professional project title for this architectural design conversation. Return ONLY the title string." }] }
      ],
      config: {
        systemInstruction: "You are a professional architectural design manager.",
      }
    });

    return response.text?.trim() || "New Project";
  } catch (error) {
    console.warn("[AI] Title generation failed:", error);
    return "New Project";
  }
}

/**
 * Get cost estimation via AI.
 */
export async function getCostEstimation(designPrompt: string, userConstraints?: string): Promise<CostBreakdown> {
  const prompt = `Based on this architectural design prompt and optional user constraints, provide a structured financial breakdown specifically for the Bengaluru, India market.
          
Design Prompt: "${designPrompt}"
${userConstraints ? `User Constraints/Budget: "${userConstraints}"` : ""}

Accuracy Protocol (Bengaluru May 2026):
1. Use real-world pricing data for Bengaluru (Premium/Luxury Market).
2. Formula: Material Grade + Square Footage + Labor Complexity + Current Market Inflation.
3. Include a 10% 'Precision Buffer' as a Contingency item.
4. Return ONLY a valid JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `You are a Senior Quantity Surveyor from a top-tier Indian architectural firm. 
Return ONLY a valid JSON object matching this structure:
{
  "items": [
    { "material": "string", "category": "Material", "specification": "string", "quantity": "string", "unitPrice": 100, "total": 100 }
  ],
  "totalEstimate": "string (e.g. ₹45,00,000)",
  "currency": "INR"
}
Categories: "Material", "Labor", or "Contingency". 
Instructions:
- Use Bengaluru market rates.
- Include a 10% buffering in "Contingency".
- Ensure the sum of totals matches totalEstimate.`,
      }
    });

    const text = response.text?.trim() || "";
    // Basic text cleaning in case of markdown blocks
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("[AI] Cost estimation failed:", e);
    throw new Error("Failed to generate cost breakdown. Please try again.");
  }
}

/**
 * Generate a SINGLE architectural design image via our server.
 */
export async function generateDesignImage(prompt: string, _size: "1K" | "2K" | "4K" = "1K", seed?: number): Promise<string> {
  const useSeed = seed ?? Math.floor(Math.random() * 999999);
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, seed: useSeed })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  const data = await res.json();
  return data.imageUrl;
}

/**
 * Generate MULTIPLE design image variants in parallel.
 */
export async function generateMultipleDesignImages(
  prompt: string,
  count: number = 4,
  _size: "1K" | "2K" | "4K" = "1K"
): Promise<string[]> {
  const seeds = Array.from({ length: count }, () => Math.floor(Math.random() * 999999));
  const styles = ["natural daylight", "cinematic lighting", "twilight mood", "highly detailed textures"];

  const imagePromises = Array.from({ length: count }, async (_, i) => {
    try {
      const variedPrompt = `${prompt}, ${styles[i % styles.length]}`;
      return await generateDesignImage(variedPrompt, _size, seeds[i]);
    } catch (e) {
      console.warn(`[Image] Variant ${i} failed`, e);
      return null;
    }
  });

  const results = await Promise.all(imagePromises);
  const images = results.filter((img): img is string => img !== null);

  if (images.length === 0) throw new Error("Failed to generate any images. The server might be overloaded. Please try again.");
  return images;
}

/**
 * Enhance a prompt via AI.
 */
export async function enhancePrompt(userPrompt: string, styleKeywords: string): Promise<string> {
  if (!userPrompt?.trim()) return userPrompt || '';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [{ role: "user", parts: [{ text: `User Wish: ${userPrompt}\nStyle: ${styleKeywords}` }] }],
      config: {
        systemInstruction: "You are a professional architectural prompt engineer. Enhance the user prompt with details about lighting, materials, and composition for a stunning visualization. Return ONLY the enhanced string.",
      }
    });

    return response.text?.trim() || userPrompt;
  } catch (error) {
    console.warn("[AI] Prompt enhancement failed", error);
    return userPrompt;
  }
}
