import express, { type Request, type Response } from "express";
import compression from "compression";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  ARCHITECT_SYSTEM_INSTRUCTION,
  SUPPORT_SYSTEM_INSTRUCTION,
  SURVEYOR_SYSTEM_INSTRUCTION,
  PROMPT_ENGINEER_INSTRUCTION,
  TITLE_INSTRUCTION,
  COST_SCHEMA,
  buildCostPrompt,
  CHAT_MODEL,
} from "./server/prompts";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || "";

// One client for the whole process. `null` when unconfigured so every route can
// answer with a clear 503 instead of throwing on the first request.
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

type ChatTurn = { role: "user" | "model"; text: string };

/** Drop empty turns and make sure history starts with a user turn (Gemini rejects otherwise). */
function toContents(history: unknown): { role: "user" | "model"; parts: { text: string }[] }[] {
  if (!Array.isArray(history)) return [];
  const turns = (history as ChatTurn[])
    .filter((m) => m && typeof m.text === "string" && m.text.trim() !== "")
    .map((m) => ({
      role: m.role === "model" ? ("model" as const) : ("user" as const),
      parts: [{ text: String(m.text) }],
    }));
  while (turns.length > 0 && turns[0].role === "model") turns.shift();
  return turns;
}

function requireAI(res: Response): boolean {
  if (ai) return true;
  res.status(503).json({
    error: "GEMINI_API_KEY is not configured. Copy env.example to .env and add your key.",
  });
  return false;
}

/** Stream a Gemini response to the browser as Server-Sent Events. */
async function streamChat(req: Request, res: Response, systemInstruction: string) {
  if (!requireAI(res)) return;

  const contents = toContents(req.body?.history);
  if (contents.length === 0) {
    res.status(400).json({ error: "history must contain at least one user message" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Abort the upstream call if the browser navigates away mid-stream.
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const stream = await ai!.models.generateContentStream({
      model: CHAT_MODEL,
      contents,
      config: { systemInstruction, abortSignal: controller.signal },
    });

    for await (const chunk of stream) {
      if (controller.signal.aborted) break;
      const text = chunk.text;
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    if (!controller.signal.aborted) {
      console.error("[AI] stream failed:", err?.message || err);
      res.write(`data: ${JSON.stringify({ error: err?.message || "Stream failed" })}\n\n`);
    }
  } finally {
    res.end();
  }
}

/**
 * Serialises image fetches.
 *
 * The keyless fallback provider rate-limits to roughly one request per client
 * IP: generating four variants at once reliably returned 429 for three of
 * them, so three of four cards came back empty. The limit is per-IP and the
 * server *is* the IP, so the queue belongs here, not in the browser.
 *
 * ponytail: a single global slot. If a real image key is configured and
 * throughput matters, raise `SLOTS` or key the queue per provider.
 */
const SLOTS = 1;
let active = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(job: () => Promise<T>): Promise<T> {
  if (active >= SLOTS) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await job();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/**
 * Fetch an image, retrying on rate limits and transient upstream errors.
 */
async function fetchImage(url: string, attempts = 4): Promise<globalThis.Response> {
  let lastStatus = 0;

  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (r.ok) return r;

      lastStatus = r.status;
      if (r.status !== 429 && r.status < 500) return r; // not worth retrying

      // Exponential backoff with jitter so parallel variants stop colliding.
      const wait = 1500 * 2 ** i + Math.random() * 800;
      await new Promise((resolve) => setTimeout(resolve, wait));
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 900 * 2 ** i));
    }
  }

  throw new Error(`provider returned ${lastStatus} after ${attempts} attempts`);
}

async function startServer() {
  const app = express();

  app.use(
    compression({
      // Images and SSE are already compressed or must flush immediately;
      // buffering either through gzip is worse than skipping it.
      filter: (req, res) => {
        const type = String(res.getHeader("Content-Type") || "");
        if (type.startsWith("image/") || type.includes("event-stream")) return false;
        return compression.filter(req, res);
      },
    }),
  );
  app.use(express.json({ limit: "8mb" }));

  // ─── Status ──────────────────────────────────────────────────────
  app.get("/api/status", (_req, res) => {
    res.json({
      gemini: !!GEMINI_API_KEY,
      huggingface: !!HF_API_KEY,
      images: true, // Pollinations fallback needs no key
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ─── Chat (streamed) ─────────────────────────────────────────────
  app.post("/api/chat", (req, res) => streamChat(req, res, ARCHITECT_SYSTEM_INSTRUCTION));
  app.post("/api/support", (req, res) => streamChat(req, res, SUPPORT_SYSTEM_INSTRUCTION));

  // ─── Project title ───────────────────────────────────────────────
  app.post("/api/title", async (req, res) => {
    if (!requireAI(res)) return;
    try {
      const contents = toContents(req.body?.history);
      contents.push({
        role: "user",
        parts: [
          {
            text: "Generate a concise, professional project title for this architectural design conversation. Return ONLY the title string, no quotes or punctuation.",
          },
        ],
      });
      const response = await ai!.models.generateContent({
        model: CHAT_MODEL,
        contents,
        config: { systemInstruction: TITLE_INSTRUCTION, maxOutputTokens: 64 },
      });
      res.json({ title: response.text?.trim().replace(/^["'#\s*-]+|["'\s]+$/g, "") || "New Project" });
    } catch (e: any) {
      console.warn("[AI] title generation failed:", e?.message);
      res.json({ title: "New Project" });
    }
  });

  // ─── Prompt enhancement ──────────────────────────────────────────
  app.post("/api/enhance", async (req, res) => {
    const { prompt, style } = req.body ?? {};
    if (!prompt?.trim()) return res.json({ prompt: prompt || "" });
    if (!ai) return res.json({ prompt }); // degrade to the raw prompt, never fail the render

    try {
      const response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: [{ role: "user", parts: [{ text: `User Wish: ${prompt}\nStyle: ${style || "modern"}` }] }],
        config: { systemInstruction: PROMPT_ENGINEER_INSTRUCTION, maxOutputTokens: 320 },
      });
      res.json({ prompt: response.text?.trim() || prompt });
    } catch (e: any) {
      console.warn("[AI] prompt enhancement failed:", e?.message);
      res.json({ prompt });
    }
  });

  // ─── Cost estimation (schema-constrained JSON) ───────────────────
  app.post("/api/cost", async (req, res) => {
    if (!requireAI(res)) return;
    const { prompt, constraints } = req.body ?? {};
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

    try {
      const response = await ai!.models.generateContent({
        model: CHAT_MODEL,
        contents: [{ role: "user", parts: [{ text: buildCostPrompt(prompt, constraints) }] }],
        config: {
          systemInstruction: SURVEYOR_SYSTEM_INSTRUCTION,
          // Schema-constrained output removes the markdown-fence/JSON.parse failure mode.
          responseMimeType: "application/json",
          responseSchema: COST_SCHEMA,
        },
      });

      const raw = response.text?.trim() || "";
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      res.json(parsed);
    } catch (e: any) {
      console.error("[AI] cost estimation failed:", e?.message);
      res.status(502).json({ error: "Failed to generate the cost breakdown. Please try again." });
    }
  });

  // ─── Image generation ────────────────────────────────────────────
  const RENDER_SUFFIX =
    "high-end architectural photography, 8k visualization, cinematic lighting, sharp materials, professional architectural render, global illumination, photorealistic, no people, wide angle.";

  // The UI's 1K/2K/4K selector now actually changes the render, instead of
  // being a decorative toggle over a hardcoded 1024px request.
  const SIZE_PX: Record<string, number> = { "1K": 1024, "2K": 1440, "4K": 2048 };

  app.post("/api/generate-image", async (req, res) => {
    const { prompt, seed, size } = req.body ?? {};
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

    const useSeed = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 999999);
    const px = SIZE_PX[size as string] ?? SIZE_PX["1K"];
    const fullPrompt = `${prompt}, ${RENDER_SUFFIX}`;

    // ── Primary: Hugging Face FLUX.1-schnell ──
    if (HF_API_KEY) {
      // Bound the wait so a cold HF worker can't hang the request for minutes.
      const timeout = AbortSignal.timeout(45_000);
      try {
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            signal: timeout,
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              "Content-Type": "application/json",
              "X-Wait-For-Model": "true",
            },
            body: JSON.stringify({
              inputs: fullPrompt,
              parameters: { seed: useSeed, width: px, height: px, num_inference_steps: 4 },
            }),
          },
        );

        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("image")) {
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength > 1000) {
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            return res.json({
              imageUrl: `data:${contentType};base64,${base64}`,
              provider: "huggingface",
            });
          }
        }
        console.warn(`[Image] HF returned ${response.status}; falling back.`);
      } catch (hfErr: any) {
        console.warn("[Image] HF unavailable:", hfErr?.message);
      }
    }

    // ── Fallback: Pollinations (keyless) ──
    // Hand back a same-origin URL rather than the provider's. A third-party
    // image URL is at the mercy of the visitor's network: corporate proxies,
    // extensions and strict CSPs all block it, and the browser gives no
    // useful signal — the card just stays blank forever. Proxying also keeps
    // the canvas untainted so PDF export and "download render" work.
    const encoded = encodeURIComponent(fullPrompt);
    return res.json({
      imageUrl: `/api/image?p=${encoded}&seed=${useSeed}&px=${px}`,
      provider: "pollinations",
    });
  });

  // Streams a generated image back through our own origin.
  app.get("/api/image", async (req, res) => {
    const prompt = typeof req.query.p === "string" ? req.query.p : "";
    if (!prompt) return res.status(400).json({ error: "p is required" });

    const seed = Number(req.query.seed) || Math.floor(Math.random() * 999999);
    const px = Number(req.query.px) || 1024;
    const upstream = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=${px}&height=${px}&nologo=true`;

    try {
      const r = await withSlot(() => fetchImage(upstream));
      if (!r.ok || !r.body) throw new Error(`provider returned ${r.status}`);

      res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
      // Deterministic for a given prompt+seed, so it is safe to cache hard.
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const reader = r.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (e: any) {
      console.warn("[Image] proxy failed:", e?.message);
      if (!res.headersSent) res.status(502).json({ error: "Image provider unavailable." });
      else res.end();
    }
  });

  // ─── 3D synthesis via TRELLIS ────────────────────────────────────
  app.post("/api/generate-3d", async (req, res) => {
    if (!HF_API_KEY) {
      return res.status(503).json({
        error: "HUGGINGFACE_API_KEY is not configured, so 3D mesh synthesis is unavailable.",
      });
    }

    const { prompt, imageUrl } = req.body ?? {};
    if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

    try {
      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/JeffreyXiang/TRELLIS",
        {
          method: "POST",
          signal: AbortSignal.timeout(120_000),
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
            "X-Wait-For-Model": "true",
          },
          body: JSON.stringify({
            inputs: {
              prompt: `${prompt}, 4k texture resolution, physically based rendering (PBR), high-poly architectural mesh.`,
              image: imageUrl,
            },
            parameters: { sampling_steps: 50, guidance_scale: 7.5 },
          }),
        },
      );

      if (!response.ok) throw new Error(`TRELLIS returned ${response.status}`);

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return res.json(await response.json());
      }

      const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
      return res.json({
        modelUrl: `data:model/gltf-binary;base64,${base64}`,
        engine: "Neural Synthesis (TRELLIS)",
      });
    } catch (e: any) {
      console.error("[3D] synthesis failed:", e?.message);
      res.status(502).json({ error: "3D synthesis failed. The rendering cluster is busy." });
    }
  });

  // ─── Static assets / Vite dev middleware ─────────────────────────
  if (IS_PROD) {
    const distPath = path.join(process.cwd(), "dist");
    // Hashed bundles are immutable; index.html must never be cached.
    app.use(
      express.static(distPath, {
        maxAge: "1y",
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
        },
      }),
    );
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  Arch Agent → http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) console.warn("  ⚠  GEMINI_API_KEY missing — chat, titles and cost estimation are disabled.");
    if (!HF_API_KEY) console.warn("  ⚠  HUGGINGFACE_API_KEY missing — images use the Pollinations fallback, 3D is disabled.");
    console.log("");
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
