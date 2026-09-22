import { supabase } from "./supabase";
import type { CostBreakdown } from "./gemini";

export interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface ProjectSession {
  id: string;
  title: string;
  messages: Message[];
  designPrompt: string | null;
  designImage: string | null;
  designImages: string[];
  design3DModel: string | null;
  costBreakdown: CostBreakdown | null;
  timestamp: number;
}

const STORAGE_KEY = "arch_agent_sessions";
const MAX_PERSISTED = 30;

export function createSession(): ProjectSession {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: "New Project",
    messages: [],
    designPrompt: null,
    designImage: null,
    designImages: [],
    design3DModel: null,
    costBreakdown: null,
    timestamp: Date.now(),
  };
}

/**
 * Strip inline base64 payloads. The Hugging Face provider returns ~1.5 MB
 * `data:` URLs and a session can hold four of them, which blows through the
 * 5 MB localStorage quota and stalls the main thread on every keystroke-driven
 * save. Remote URLs (Pollinations) survive; data URLs are dropped so the rest
 * of the session — chat, prompt, costing — still persists.
 */
function shrink(session: ProjectSession): ProjectSession {
  const isInline = (u: string | null) => !!u && u.startsWith("data:");
  return {
    ...session,
    designImages: session.designImages.filter((u) => !isInline(u)),
    designImage: isInline(session.designImage) ? null : session.designImage,
    design3DModel: isInline(session.design3DModel) ? null : session.design3DModel,
  };
}

export function loadLocal(): ProjectSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: any) => ({
      ...createSession(),
      ...s,
      designImages: s.designImages ?? (s.designImage ? [s.designImage] : []),
    }));
  } catch (err) {
    console.warn("[Sessions] Could not read local sessions:", err);
    return [];
  }
}

export function saveLocal(sessions: ProjectSession[]) {
  const recent = sessions.slice(0, MAX_PERSISTED);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Quota exceeded (or storage disabled). Retry without inline image blobs,
    // then give up quietly rather than breaking the workspace.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.map(shrink)));
    } catch (err) {
      console.warn("[Sessions] Local persistence unavailable:", err);
    }
  }
}

export async function loadRemote(): Promise<ProjectSession[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("project_sessions")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(MAX_PERSISTED);

    if (error) {
      // 42P01 = table not created yet; that's an expected first-run state.
      if (error.code !== "42P01") console.warn("[Sessions] Remote load failed:", error.message);
      return [];
    }

    return (data ?? []).map((s: any) => ({
      id: s.id,
      title: s.title,
      messages: s.messages ?? [],
      designPrompt: s.design_prompt,
      designImage: s.design_image,
      designImages: s.design_images ?? [],
      design3DModel: s.design_3d_model ?? null,
      costBreakdown: s.cost_breakdown,
      timestamp: s.timestamp,
    }));
  } catch (err) {
    console.warn("[Sessions] Supabase unreachable, using local storage:", err);
    return [];
  }
}

/**
 * Push only the sessions whose content actually changed. The previous version
 * re-upserted every session on every state update — including once per
 * streamed token — which is what saturated the network tab.
 */
export async function syncRemote(sessions: ProjectSession[], lastSynced: Map<string, string>) {
  if (!supabase) return;

  const dirty = sessions.filter((s) => {
    const fingerprint = JSON.stringify(shrink(s));
    if (lastSynced.get(s.id) === fingerprint) return false;
    lastSynced.set(s.id, fingerprint);
    return true;
  });
  if (dirty.length === 0) return;

  try {
    const { error } = await supabase.from("project_sessions").upsert(
      dirty.map(shrink).map((s) => ({
        id: s.id,
        title: s.title,
        messages: s.messages,
        design_prompt: s.designPrompt,
        design_image: s.designImage,
        design_images: s.designImages,
        cost_breakdown: s.costBreakdown,
        timestamp: s.timestamp,
      })),
    );
    if (error && error.code !== "42P01") {
      console.warn("[Sessions] Remote sync failed:", error.message);
      dirty.forEach((s) => lastSynced.delete(s.id)); // retry next time
    }
  } catch (err) {
    console.warn("[Sessions] Remote sync skipped (offline):", err);
    dirty.forEach((s) => lastSynced.delete(s.id));
  }
}
