/**
 * Thin client for the server-side AI proxy.
 *
 * No API key ever reaches the browser: every call below hits our own Express
 * routes, which hold the credentials. See `server.ts`.
 */

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

async function postJSON<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as any).error || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Consume a Server-Sent Events stream from one of our chat routes.
 * Yields incremental text chunks exactly like the old direct-SDK generator did.
 */
async function* streamSSE(url: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as any).error || `${res.status} ${res.statusText}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;

      // SSE frames are separated by a blank line; keep the trailing partial.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;

        const parsed = JSON.parse(payload) as { text?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) yield { text: parsed.text };
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export function getArchitectStream(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  signal?: AbortSignal,
) {
  return streamSSE(
    "/api/chat",
    { history: history.map((m) => ({ role: m.role, text: m.parts[0]?.text ?? "" })) },
    signal,
  );
}

export function getSupportStream(
  history: { role: "user" | "bot"; text: string }[],
  signal?: AbortSignal,
) {
  return streamSSE(
    "/api/support",
    { history: history.map((m) => ({ role: m.role === "bot" ? "model" : "user", text: m.text })) },
    signal,
  );
}

export async function generateProjectTitle(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
): Promise<string> {
  try {
    const { title } = await postJSON<{ title: string }>("/api/title", {
      history: history.map((m) => ({ role: m.role, text: m.parts[0]?.text ?? "" })),
    });
    return title || "New Project";
  } catch {
    return "New Project";
  }
}

export function getCostEstimation(
  designPrompt: string,
  userConstraints?: string,
  signal?: AbortSignal,
): Promise<CostBreakdown> {
  return postJSON<CostBreakdown>("/api/cost", { prompt: designPrompt, constraints: userConstraints }, signal);
}

/** Enhancement is best-effort: a failure returns the original prompt rather than blocking the render. */
export async function enhancePrompt(userPrompt: string, styleKeywords: string): Promise<string> {
  if (!userPrompt?.trim()) return userPrompt || "";
  try {
    const { prompt } = await postJSON<{ prompt: string }>("/api/enhance", {
      prompt: userPrompt,
      style: styleKeywords,
    });
    return prompt || userPrompt;
  } catch {
    return userPrompt;
  }
}

export type ImageSize = "1K" | "2K" | "4K";

export async function generateDesignImage(
  prompt: string,
  size: ImageSize = "1K",
  seed?: number,
  signal?: AbortSignal,
): Promise<string> {
  const { imageUrl } = await postJSON<{ imageUrl: string }>(
    "/api/generate-image",
    { prompt, size, seed: seed ?? Math.floor(Math.random() * 999999) },
    signal,
  );
  return imageUrl;
}

const VARIANT_STYLES = [
  "natural daylight",
  "cinematic lighting",
  "twilight mood",
  "highly detailed textures",
];

/**
 * Generate N variants; succeeds as long as at least one lands.
 *
 * `onImage` fires as each variant completes so the grid can fill in
 * progressively. Waiting for `Promise.allSettled` meant the user watched a
 * spinner until the *slowest* variant returned — on the keyless fallback
 * provider that can be a minute, even though the first render was ready in
 * seconds.
 */
export async function generateMultipleDesignImages(
  prompt: string,
  count = 4,
  size: ImageSize = "1K",
  signal?: AbortSignal,
  onImage?: (url: string, index: number) => void,
): Promise<string[]> {
  const images: string[] = [];

  // Requests are queued server-side (see withSlot in server.ts), where the
  // provider's per-IP rate limit actually applies, so fan out freely here.
  await Promise.allSettled(
    Array.from({ length: count }, async (_, i) => {
      const url = await generateDesignImage(
        `${prompt}, ${VARIANT_STYLES[i % VARIANT_STYLES.length]}`,
        size,
        undefined,
        signal,
      );
      images.push(url);
      onImage?.(url, i);
    }),
  );

  if (images.length === 0) {
    throw new Error("Image synthesis failed for every variant. Please try again.");
  }
  return images;
}
