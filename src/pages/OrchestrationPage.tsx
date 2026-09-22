import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  memo,
  Suspense,
  type MouseEvent,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Plus,
  Send,
  Image as ImageIcon,
  History,
  LogOut,
  User,
  Copy,
  Check,
  Loader2,
  Download,
  Trash2,
  Sparkles,
  ChevronLeft,
  Bot,
  IndianRupee,
  Share2,
  MessageCircle,
  Palette,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronRight,
  X,
  Maximize,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "motion/react";
import {
  getArchitectStream,
  getCostEstimation,
  generateMultipleDesignImages,
  generateProjectTitle,
  enhancePrompt,
  type ImageSize,
} from "@/lib/gemini";
import { cn } from "@/lib/utils";
import { safeRequest } from "@/lib/safeRequest";
import { useLoading } from "@/lib/LoadingContext";
import { useAuth, signOut } from "@/lib/useAuth";
import {
  createSession,
  loadLocal,
  loadRemote,
  saveLocal,
  syncRemote,
  type Message,
  type ProjectSession,
} from "@/lib/sessionStore";
import { Logo } from "@/components/Logo";
import { STYLE_PRESETS, type StylePreset, type DesignConcept } from "@/types";
import Markdown from "react-markdown";
import ChatGPTInput from "@/components/ui/prompt-input-dynamic-grow";
import { LoadingBreadcrumb } from "@/components/ui/animated-loading-svg-text-shimmer";

// three.js + drei + postprocessing is ~1 MB. Only pull it when someone
// actually opens the immersive viewer.
const Viewer3D = lazy(() => import("@/components/Viewer3D"));

function ProgressiveImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  // Reset when the source changes, otherwise a regenerated variant inherits
  // the previous image's loaded/failed state.
  useEffect(() => setState("loading"), [src]);

  if (state === "error") {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-[#141414] flex flex-col items-center justify-center gap-3 text-center px-4",
          className,
        )}
      >
        <ImageIcon className="h-7 w-7 text-white/20" />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
          Render unavailable
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-[#1A1A1A]", className)}>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-white/5" />}
      <img
        src={src}
        alt={alt}
        decoding="async"
        onLoad={() => setState("loaded")}
        // Without this a provider hiccup leaves a skeleton pulsing forever,
        // with no way for the user to tell it from a slow render.
        onError={() => setState("error")}
        className={cn(
          "w-full h-full object-cover transition-all duration-700 ease-out",
          state === "loaded" ? "opacity-100 blur-none scale-100" : "opacity-0 blur-xl scale-105",
          className,
        )}
      />
    </div>
  );
}


// Feedback effects are a nice-to-have; confetti is ~7 KB and only needed
// on a successful render, so it loads on demand.
const fireConfetti = async () => {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 70,
    spread: 70,
    origin: { y: 0.9 },
    disableForReducedMotion: true,
    colors: ["#ffffff", "#aaaaaa", "#555555"],
  });
};


// One shared AudioContext. The previous version constructed a new one per
// success ping; Chrome caps a page at ~6, so the sound silently stopped
// working after the sixth render and leaked every context.
let audioCtx: AudioContext | null = null;

const playSuccessSound = () => {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, now); // C5
    oscillator.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); // → C6

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.22, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    oscillator.start(now);
    oscillator.stop(now + 0.5);
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch {
    /* audio blocked by autoplay policy — not worth surfacing */
  }
};

const triggerSuccessFeedback = () => {
  playSuccessSound();
  void fireConfetti();
};

const StatusBadge = memo(
  ({
    endpoint,
    provider,
    label,
  }: {
    endpoint: string;
    provider: string;
    label: string;
  }) => {
    const [status, setStatus] = useState<boolean | null>(null);

    useEffect(() => {
      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => setStatus(!!data[provider]))
        .catch(() => setStatus(false));
    }, [endpoint, provider]);

    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-500",
          status === null
            ? "bg-white/5 border-white/5 animate-pulse"
            : status
              ? "bg-white/10 border-white/20 shadow-xl"
              : "bg-white/5 border-white/5 opacity-50",
        )}
      >
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full mb-0.5",
            status === null
              ? "bg-white/20"
              : status
                ? "bg-white"
                : "bg-white/10",
          )}
        />
        <span
          className={cn(
            "text-[8px] font-black uppercase tracking-widest",
            status === null
              ? "text-white/20"
              : status
                ? "text-white/80"
                : "text-white/20",
          )}
        >
          {label}
        </span>
      </div>
    );
  },
);

const UserProfileLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-full w-full p-2 text-white"
  >
    <circle
      cx="12"
      cy="8"
      r="4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * One chat row. Memoised because the streaming cursor updates state on every
 * token — without this, a 20-turn conversation re-parsed 20 markdown trees
 * per token and the whole panel juddered.
 */
const ChatMessage = memo(
  ({
    msg,
    msgId,
    copiedId,
    onCopy,
  }: {
    msg: Message;
    msgId: string;
    copiedId: string | null;
    onCopy: (id: string, text: string) => void;
  }) => {
    const text = msg.parts[0]?.text ?? "";
    const isUser = msg.role === "user";

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "flex gap-4 relative z-10 max-w-3xl flex-row",
          isUser ? "ml-auto flex-row-reverse" : "mr-auto",
        )}
      >
        <div
          className={cn(
            "text-[10px] font-bold font-jetbrains-mono uppercase tracking-widest pt-1 shrink-0 w-14",
            isUser ? "text-white/40 text-right pr-1" : "text-white/60",
          )}
        >
          [{isUser ? "USER" : "AGENT"}]
        </div>
        <div
          className={cn(
            "group p-0 text-[14px] leading-relaxed relative min-w-[200px] bg-transparent text-white border-l border-white/10 pl-6 font-sans",
            isUser ? "font-normal text-white/90 whitespace-pre-wrap" : "font-light tracking-wide",
          )}
        >
          {isUser ? (
            text
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-jetbrains-mono prose-headings:text-white prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-xs prose-table:text-xs">
              <Markdown>{text}</Markdown>
            </div>
          )}
          <button
            onClick={() => onCopy(msgId, text)}
            title="Copy message"
            className="absolute bottom-0 -right-12 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-2 rounded-xl backdrop-blur-md border border-white/10 hover:border-white/30 text-white/50 hover:text-white bg-black/40"
          >
            {copiedId === msgId ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </motion.div>
    );
  },
);
ChatMessage.displayName = "ChatMessage";

const ProjectTab = memo(
  ({
    id,
    label,
    icon: Icon,
    active,
    hasBadge,
    onClick,
  }: {
    id: string;
    label: string;
    icon: any;
    active: boolean;
    hasBadge?: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all",
        active
          ? "bg-white text-black shadow-lg"
          : "text-zinc-500 hover:text-white hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="relative">
        {label}
        {hasBadge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-[#00F0FF]"
          >
            <motion.div
              animate={{
                scale: [1, 2, 1],
                opacity: [1, 0, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full bg-[#00F0FF] opacity-50"
            />
          </motion.div>
        )}
      </span>
    </button>
  ),
);

function OrchestrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSyncing, startSyncSequence } = useLoading();
  const { user, ready: authReady } = useAuth();

  const [activeTab, setActiveTab] = useState<"chat" | "cost" | "visual">("chat");
  const [hasNewEstimation, setHasNewEstimation] = useState(false);
  const [hasNewVisualization, setHasNewVisualization] = useState(false);

  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [retryToast, setRetryToast] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<{ label: string; action: () => void } | null>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEstimatingCost, setIsEstimatingCost] = useState(false);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [costInput, setCostInput] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(STYLE_PRESETS[0]);
  const [showImmersiveViewer, setShowImmersiveViewer] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [immersiveConcept, setImmersiveConcept] = useState<DesignConcept | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Abort every in-flight request when the page unmounts so a background
  // stream can't call setState on a dead component.
  const abortRef = useRef<AbortController | null>(null);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentSessionId) ?? null,
    [sessions, currentSessionId],
  );

  const updateSession = useCallback((id: string, updates: Partial<ProjectSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  // ── Auth guard ────────────────────────────────────────────────────
  // Wait for `authReady`; redirecting while auth is still resolving bounced
  // signed-in users straight back to /login on a slow connection.
  useEffect(() => {
    if (authReady && !user) navigate("/login?redirect=/orchestration", { replace: true });
  }, [authReady, user, navigate]);

  useEffect(() => {
    if (activeTab === "cost") setHasNewEstimation(false);
    if (activeTab === "visual") setHasNewVisualization(false);
    if (activeTab === "chat") inputRef.current?.focus();
  }, [activeTab]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  // ── Load sessions once ────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    (async () => {
      let loaded = await loadRemote();
      if (loaded.length === 0) loaded = loadLocal();
      if (!active) return;

      if (loaded.length > 0) {
        setSessions(loaded);
        setCurrentSessionId(loaded[0].id);
      } else {
        const fresh = createSession();
        setSessions([fresh]);
        setCurrentSessionId(fresh.id);
      }
      setIsInitializing(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  // ── Persist sessions (debounced) ──────────────────────────────────
  // The old version serialised every session to localStorage *and*
  // re-upserted all of them to Supabase on every state change — including
  // once per streamed token. Both now run at most once per idle 700ms.
  const syncFingerprints = useRef(new Map<string, string>());
  useEffect(() => {
    if (isInitializing || sessions.length === 0) return;
    const t = window.setTimeout(() => {
      saveLocal(sessions);
      void syncRemote(sessions, syncFingerprints.current);
    }, 700);
    return () => window.clearTimeout(t);
  }, [sessions, isInitializing]);

  // Keep a valid selection if the active session is deleted.
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) setCurrentSessionId(sessions[0].id);
  }, [sessions, currentSessionId]);

  // ── Chat autoscroll ───────────────────────────────────────────────
  // Smooth scrolling restarted on every token, so the container never
  // settled and the whole chat juddered. Stream with instant jumps; save the
  // smooth animation for completed turns.
  const messageCount = currentSession?.messages.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: streamingText !== null ? "auto" : "smooth",
    });
  }, [messageCount, streamingText, currentSessionId, activeTab]);

  const createNewSession = useCallback(() => {
    const fresh = createSession();
    setSessions((prev) => [fresh, ...prev]);
    setCurrentSessionId(fresh.id);
    setActiveTab("chat");
  }, []);

  const deleteSession = useCallback(
    (id: string, e: MouseEvent) => {
      e.stopPropagation();
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (currentSessionId === id) setCurrentSessionId(filtered[0]?.id ?? null);
        return filtered;
      });
    },
    [currentSessionId],
  );

  const startRename = (session: ProjectSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const finishRename = (session: ProjectSession) => {
    const next = editingTitle.trim();
    if (next) updateSession(session.id, { title: next });
    setEditingSessionId(null);
  };

  // ── Cost estimation ───────────────────────────────────────────────
  const handleEstimateCost = useCallback(
    async (prompt: string, constraints?: string, overrideSessionId?: string) => {
      const targetSessionId = overrideSessionId ?? currentSessionId;
      if (!targetSessionId || !prompt?.trim()) return;

      // Already costed and no new constraints? Just reveal the existing result.
      const existing = sessions.find((s) => s.id === targetSessionId);
      if (existing?.costBreakdown && !constraints && !overrideSessionId) {
        setActiveTab("cost");
        return;
      }

      setIsProcessing(true);
      setIsEstimatingCost(true);
      setRetryToast(null);
      setRetryAction(null);

      try {
        const breakdown = await safeRequest(
          () => getCostEstimation(prompt, constraints, abortRef.current?.signal),
          (attempt) => setRetryToast(`Re-synchronizing market data… (attempt ${attempt})`),
        );
        updateSession(targetSessionId, { costBreakdown: breakdown });
        setHasNewEstimation((prev) => (activeTab === "cost" ? prev : true));
        triggerSuccessFeedback();
      } catch (error) {
        console.error("[Cost]", error);
        setRetryAction({
          label: "Market analysis failed",
          action: () => void handleEstimateCost(prompt, constraints, overrideSessionId),
        });
      } finally {
        setIsEstimatingCost(false);
        setIsProcessing(false);
        setRetryToast(null);
      }
    },
    [currentSessionId, sessions, activeTab, updateSession],
  );

  // ── Visual synthesis ──────────────────────────────────────────────
  const handleGenerateDesign = useCallback(
    async (prompt: string, overrideSessionId?: string, force = false) => {
      const targetSessionId = overrideSessionId ?? currentSessionId;
      if (!targetSessionId || !prompt?.trim()) return;

      const existing = sessions.find((s) => s.id === targetSessionId);
      // Already rendered? Reveal what's there — unless the user explicitly
      // asked to regenerate. Without the `force` flag, "Regenerate
      // Collection" just switched tabs and produced nothing.
      if (existing?.designImages.length && !overrideSessionId && !force) {
        setActiveTab("visual");
        return;
      }

      setIsProcessing(true);
      setIsGeneratingImage(true);
      setIsSidebarOpen(false);
      setRetryToast(null);
      setRetryAction(null);
      // Clear first so progressively-revealed variants replace the old set
      // instead of appending to it.
      updateSession(targetSessionId, { designImages: [], designImage: null });

      // Costing runs alongside rendering rather than behind it.
      void handleEstimateCost(prompt, undefined, targetSessionId);

      try {
        const finalPrompt = (await enhancePrompt(prompt, selectedStyle.keywords)).trim() || prompt;

        const images = await safeRequest(
          () =>
            generateMultipleDesignImages(
              finalPrompt,
              4,
              imageSize,
              abortRef.current?.signal,
              // Show each render the moment it lands rather than holding the
              // whole grid hostage to the slowest variant.
              (url) =>
                setSessions((prev) =>
                  prev.map((sess) =>
                    sess.id === targetSessionId
                      ? {
                          ...sess,
                          designImages: [...sess.designImages, url],
                          designImage: sess.designImage ?? url,
                        }
                      : sess,
                  ),
                ),
            ),
          (attempt) => setRetryToast(`Neural link interrupted — retrying… (attempt ${attempt})`),
        );

        updateSession(targetSessionId, { designImages: images, designImage: images[0] });
        setHasNewVisualization((prev) => (activeTab === "visual" ? prev : true));
        triggerSuccessFeedback();
      } catch (error) {
        console.error("[Visual]", error);
        setRetryAction({
          label: "Visual synthesis failed",
          action: () => void handleGenerateDesign(prompt, overrideSessionId, true),
        });
      } finally {
        setIsGeneratingImage(false);
        setIsProcessing(false);
        setRetryToast(null);
      }
    },
    [currentSessionId, sessions, selectedStyle, imageSize, activeTab, updateSession, handleEstimateCost],
  );

  // ── Chat ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideMessage?: string) => {
      const textToSend = (overrideMessage ?? input).trim();
      if (!textToSend || isLoading) return;

      let targetSessionId = currentSessionId;
      let baseMessages: Message[] = [];

      if (!targetSessionId) {
        const fresh = createSession();
        setSessions((prev) => [fresh, ...prev]);
        setCurrentSessionId(fresh.id);
        targetSessionId = fresh.id;
      } else {
        baseMessages = sessions.find((s) => s.id === targetSessionId)?.messages ?? [];
      }

      const previousTitle = sessions.find((s) => s.id === targetSessionId)?.title ?? "New Project";
      const updatedMessages: Message[] = [
        ...baseMessages,
        { role: "user", parts: [{ text: textToSend }] },
      ];

      setIsSidebarOpen(false);
      updateSession(targetSessionId, { messages: updatedMessages });
      setInput("");
      setIsLoading(true);
      setStreamingText("");

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        let fullResponse = "";
        for await (const chunk of getArchitectStream(updatedMessages, abortRef.current.signal)) {
          fullResponse += chunk.text;
          setStreamingText(fullResponse);
        }
        setStreamingText(null);

        const promptMatch = fullResponse.match(/\[DESIGN_PROMPT\](.*?)\[\/DESIGN_PROMPT\]/s);
        const designPrompt = promptMatch ? promptMatch[1].trim() : null;
        const cleanResponse = fullResponse
          .replace(/\[DESIGN_PROMPT\].*?\[\/DESIGN_PROMPT\]/gs, "")
          .trim();

        const finalMessages: Message[] = [
          ...updatedMessages,
          {
            role: "model",
            parts: [
              {
                text:
                  cleanResponse ||
                  (designPrompt
                    ? "Design specification locked. Rendering now…"
                    : "I'm here to help with your architectural needs."),
              },
            ],
          },
        ];

        updateSession(targetSessionId, {
          messages: finalMessages,
          ...(designPrompt ? { designPrompt } : {}),
        });

        if (previousTitle === "New Project" && finalMessages.length >= 2) {
          void generateProjectTitle(finalMessages).then((title) =>
            updateSession(targetSessionId!, { title }),
          );
        }

        if (designPrompt) void handleGenerateDesign(designPrompt, targetSessionId);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        console.error("[Chat]", error);
        setStreamingText(null);
        updateSession(targetSessionId, {
          messages: [
            ...updatedMessages,
            {
              role: "model",
              parts: [
                {
                  text: `I couldn't reach the design engine. ${
                    (error as Error)?.message ?? "Please try again."
                  }`,
                },
              ],
            },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, currentSessionId, sessions, updateSession, handleGenerateDesign],
  );

  // ── 3D mesh ───────────────────────────────────────────────────────
  const handleGenerate3D = useCallback(async () => {
    if (!currentSession?.designPrompt || !currentSession.designImage || !currentSessionId) return;

    setImmersiveConcept({
      id: currentSessionId,
      url: currentSession.designImage,
      prompt: currentSession.designPrompt,
      style: selectedStyle.name,
      timestamp: Date.now(),
    });
    setShowImmersiveViewer(true);

    if (currentSession.design3DModel) return; // already synthesised

    setIsGenerating3D(true);
    setRetryToast("Initializing neural mesh…");
    setRetryAction(null);

    try {
      const data = await safeRequest(
        async () => {
          const response = await fetch("/api/generate-3d", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: currentSession.designPrompt,
              imageUrl: currentSession.designImage,
            }),
          });
          if (!response.ok) {
            const detail = await response.json().catch(() => ({}));
            throw new Error(detail.error || `3D generation returned ${response.status}`);
          }
          return response.json();
        },
        (attempt) => setRetryToast(`Waking the render cluster… (attempt ${attempt})`),
      );

      if (data.modelUrl) {
        updateSession(currentSessionId, { design3DModel: data.modelUrl });
        triggerSuccessFeedback();
      }
    } catch (err) {
      console.error("[3D]", err);
      setRetryAction({ label: "Neural mesh generation failed", action: () => void handleGenerate3D() });
    } finally {
      setIsGenerating3D(false);
      setRetryToast(null);
    }
  }, [currentSession, currentSessionId, selectedStyle, updateSession]);

  const handleEnterRoom = useCallback(
    (imageUrl: string) => {
      setImmersiveConcept({
        id: currentSessionId ?? "viewer",
        url: imageUrl,
        prompt: currentSession?.designPrompt ?? "",
        style: selectedStyle.name,
        timestamp: Date.now(),
      });
      setShowImmersiveViewer(true);
    },
    [currentSessionId, currentSession, selectedStyle],
  );

  // ── Export ────────────────────────────────────────────────────────
  const canExportPDF = !!currentSession?.costBreakdown && (currentSession?.designImages.length ?? 0) > 0;

  const handleDownloadPDF = useCallback(async () => {
    if (!currentSession?.costBreakdown) return;
    setIsGeneratingPdf(true);
    try {
      // jsPDF + its canvas/DOM shims are ~800 KB. Pull them only when
      // someone actually exports, not on every workspace load.
      const { generateProjectPDF } = await import("@/services/pdfService");
      await generateProjectPDF({
        projectName: currentSession.title,
        prompt: currentSession.designPrompt ?? "Architectural Synthesis",
        estimation: currentSession.costBreakdown.items.map((item) => ({
          category: item.category,
          spec: `${item.material} — ${item.specification}`,
          qty: item.quantity,
          rate: item.unitPrice,
          total: item.total,
        })),
        images: currentSession.designImages.slice(0, 4),
      });
    } catch (e) {
      console.error("[PDF]", e);
      setRetryAction({ label: "PDF export failed", action: () => void handleDownloadPDF() });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [currentSession]);

  const downloadImage = useCallback(async (url: string) => {
    try {
      // Remote renders need a blob hop; a bare <a download> on a cross-origin
      // URL is ignored by the browser and just navigates away.
      const href = url.startsWith("data:") ? url : URL.createObjectURL(await (await fetch(url)).blob());
      const a = document.createElement("a");
      a.href = href;
      a.download = `arch-agent-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (!url.startsWith("data:")) URL.revokeObjectURL(href);
    } catch (e) {
      console.error("[Download]", e);
      window.open(url, "_blank", "noopener");
    }
  }, []);

  const handleCopyMessage = useCallback((id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleBack = useCallback(() => startSyncSequence("/"), [startSyncSequence]);

  const handleLogout = useCallback(async () => {
    abortRef.current?.abort();
    await signOut();
    startSyncSequence("/");
  }, [startSyncSequence]);

  // ── Deep link from the showcase ("Estimate Cost" on a template) ───
  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (autoTriggeredRef.current || isInitializing) return;
    if (location.state?.autoTrigger !== "estimate" || !location.state?.prompt) return;
    if (!currentSessionId) return;

    autoTriggeredRef.current = true;
    setActiveTab("cost");
    void handleEstimateCost(location.state.prompt, undefined, currentSessionId);
    window.history.replaceState({}, document.title);
  }, [location.state, isInitializing, currentSessionId, handleEstimateCost]);

  const showInitializingOverlay = isInitializing && !isSyncing;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      // The workspace is a reading surface, so it gets its own near-opaque
      // backdrop. Letting the global photo through at full strength made chat
      // text and cost tables sit on tree branches. A blur/scale entrance was
      // also animating a full-viewport filter on every mount — expensive and
      // the one thing guaranteed to be janky on first paint.
      className="flex h-screen w-full bg-[#050505]/92 text-white overflow-hidden font-sans relative"
    >
      <AnimatePresence>
        {(retryToast || retryAction) && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[3000] bg-black/90 border border-white/20 text-white px-6 py-4 rounded-2xl flex items-center gap-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/30"
          >
            <div className="flex items-center gap-3">
              {retryAction ? (
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-white/50" />
              )}
              <span className="text-xs font-bold tracking-[0.15em] uppercase whitespace-nowrap">
                {retryAction ? retryAction.label : retryToast}
              </span>
            </div>
            {retryAction && (
              <button
                onClick={() => {
                  const action = retryAction.action;
                  setRetryAction(null);
                  setRetryToast(null);
                  action();
                }}
                className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Retry Request
              </button>
            )}
            {retryAction && (
              <button
                onClick={() => {
                  setRetryAction(null);
                  setRetryToast(null);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-Page Initialization Overlay - only shows if global sync isn't already covering it */}
      <AnimatePresence>
        {showInitializingOverlay && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-6 relative z-20">
              <LoadingBreadcrumb
                status="Synchronizing Project Sessions..."
                className="scale-125 text-white drop-shadow-lg"
              />
              <div className="flex gap-2 drop-shadow-md">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.2,
                    }}
                    className="w-1.5 h-1.5 bg-white rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Sidebar Toggle Ghost Handle */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-3 h-24 hover:w-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer z-[60] flex items-center justify-center group overflow-hidden",
          isSidebarOpen ? "left-[320px]" : "left-0",
        )}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <div className="absolute left-0 w-1 h-full bg-white/10 group-hover:bg-white/30 transition-colors rounded-r-md" />
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center translate-x-1">
          {isSidebarOpen ? (
            <ChevronLeft className="w-3 h-3 text-white/70" />
          ) : (
            <ChevronRight className="w-3 h-3 text-white/70" />
          )}
        </div>
      </div>

      {/* Sidebar - Collapsible */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: 320, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-xl z-[50] relative overflow-hidden shrink-0 will-change-transform transform-gpu"
          >
            <div className="p-6 flex items-center gap-4">
              <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="rounded-full hover:bg-white/10 p-0 overflow-hidden"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </motion.div>
              <Logo iconSize={6} textSize="text-xl" />
            </div>

            {/* API Status Indicators */}
            <div className="px-8 mb-6 grid grid-cols-3 gap-2">
              <StatusBadge
                endpoint="/api/status"
                provider="gemini"
                label="Gem"
              />
              <StatusBadge
                endpoint="/api/status"
                provider="huggingface"
                label="HF"
              />
              <StatusBadge
                endpoint="/api/status"
                provider="images"
                label="IMG"
              />
            </div>

            <div className="px-6 mb-8 group/newbtn relative">
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-8 bg-white/20 blur-2xl rounded-full opacity-0 group-hover/newbtn:opacity-100 transition-opacity duration-500" />
              <Button
                onClick={createNewSession}
                variant="ghost"
                className="relative w-full flex flex-row items-center justify-center gap-3 bg-white/[0.03] text-white hover:bg-white hover:text-black border border-white/10 hover:border-white/40 h-12 rounded-xl transition-all duration-300 ease-out shadow-sm overflow-hidden group-active/newbtn:scale-[0.98] group whitespace-nowrap flex-nowrap"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                <Plus className="relative z-10 w-4 h-4 opacity-50 group-hover:opacity-100 shrink-0" />
                <span className="relative z-10 font-sans text-[11px] font-bold uppercase tracking-[0.25em] pt-[1px] opacity-80 group-hover:opacity-100">
                  New Project
                </span>
              </Button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-8 mb-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                <History className="h-3 w-3" />
                Project History
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin px-4">
                <div className="space-y-2 py-2">
                  <AnimatePresence>
                    {sessions.map((session) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={session.id}
                        onClick={() => setCurrentSessionId(session.id)}
                        className={cn(
                          "group relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 ease-out border border-transparent",
                          currentSessionId === session.id
                            ? "bg-white/5 text-white"
                            : "text-white/40 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {currentSessionId === session.id && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3/4 bg-white rounded-r-full shadow-md shadow-white/50" />
                        )}
                        <div className="flex items-center gap-3 truncate flex-1 ml-2">
                          {editingSessionId === session.id ? (
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => finishRename(session)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && finishRename(session)
                              }
                              className="h-8 bg-white/20 border-white/20 text-sm font-semibold p-2"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="truncate text-sm font-medium tracking-wide">
                              {session.title
                                .replace(/^[\d\.\*\-#\s]+/, "")
                                .trim() || "New Project"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              startRename(session);
                            }}
                            className="h-8 w-8 hover:bg-white/20 rounded-xl"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => deleteSession(session.id, e)}
                            className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border border-white/20 shadow-xl">
                    <AvatarFallback className="bg-white/5 text-xs font-bold text-white/50">
                      <UserProfileLogo />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight text-white">
                      {user?.displayName ?? "Architect"}
                    </span>
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest truncate max-w-[120px]">
                      Architect Lead
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[9px] text-white/30 font-medium italic leading-relaxed">
                    {user?.email ?? "Local session"} — orchestration environment active.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full mt-2 h-10 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden z-10">
        <AnimatePresence mode="wait">
          {currentSession && !isSyncing ? (
            <motion.div
              key="workspace-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Workspace Top Navigation */}
              <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 backdrop-blur-2xl">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        className="rounded-full hover:bg-white/10 p-0 overflow-hidden text-white/70 hover:text-white transition-colors h-10 w-10"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    </motion.div>

                    <div 
                      onClick={handleBack}
                      className="cursor-pointer transition-all hover:opacity-80 active:scale-95"
                    >
                      <Logo
                        iconSize={6}
                        textSize="text-lg"
                        transparent
                        className="hidden sm:flex"
                      />
                    </div>
                  </div>

                  {!isSidebarOpen && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                        className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <PanelLeftOpen className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2">
                    {[
                      { id: "chat", label: "Assistant", icon: Bot },
                      { id: "cost", label: "Estimation", icon: IndianRupee },
                      { id: "visual", label: "Visualizer", icon: ImageIcon },
                    ].map((tab) => (
                      <ProjectTab
                        key={tab.id}
                        id={tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        active={activeTab === tab.id}
                        hasBadge={
                          tab.id === "cost"
                            ? hasNewEstimation
                            : tab.id === "visual"
                              ? hasNewVisualization
                              : false
                        }
                        onClick={() => setActiveTab(tab.id as any)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2 border-r border-[#1E1E20]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#FFFFFF] shadow-glow animate-pulse" />
                    <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase font-jetbrains-mono mr-2">
                      Sync
                    </span>
                  </div>
                  {canExportPDF && (
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isProcessing || isGeneratingPdf}
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-xl shadow-white/20 active:scale-95",
                        (isProcessing || isGeneratingPdf) ? "bg-white/10 text-white/50 cursor-not-allowed" : "bg-white text-black hover:bg-zinc-100"
                      )}
                    >
                      {isGeneratingPdf ? (
                        <>
                          <div className="h-3 w-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                          GENERATING...
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3" />                
                          DOWNLOAD PDF
                        </>
                      )}
                    </button>
                  )}
                  {user && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={handleBack}
                        className="h-9 gap-1.5 px-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all border border-transparent hover:border-white/10 hidden md:flex"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="text-xs font-medium">BACK</span>
                      </Button>
                      <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                    className={cn(
                      "h-8 w-8 rounded-lg border flex items-center justify-center transition-all shrink-0",
                      isInspectorOpen
                        ? "bg-[#FFFFFF]/10 border-[#FFFFFF]/30 text-[#FFFFFF]"
                        : "bg-transparent border-transparent text-white/40 hover:text-white",
                    )}
                  >
                    <PanelLeftClose className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              </header>

              <section className="flex-1 min-h-0 flex overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1 min-h-0 flex flex-col relative overflow-hidden"
                  >
                    {/* View: Architect Chatbot */}
                    {activeTab === "chat" && (
                  <div className="flex-1 min-h-0 flex flex-col bg-transparent overflow-hidden relative text-white">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl z-10 shrink-0">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-white/30" />
                        <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/30">
                          Technical Design Partner
                        </h2>
                      </div>
                    </div>

                    <div
                      className="flex-1 min-h-0 overflow-y-auto px-4 p-6 scroll-smooth custom-scrollbar"
                      ref={scrollRef}
                    >
                      <div className="space-y-8 max-w-2xl mx-auto py-10 relative z-10">
                        <AnimatePresence initial={false}>
                          {currentSession.messages.length === 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-col items-center justify-center h-[50vh] text-center space-y-10"
                            >
                              <div className="space-y-4">
                                <h3 className="text-3xl font-bold tracking-tight text-white/90">
                                  Quick Action Dashboard
                                </h3>
                                <p className="text-white/40 text-sm max-w-sm mx-auto font-geist-mono">
                                  Neural Architecture Orchestration Center
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mx-auto">
                                {[
                                  {
                                    label: "Initiate New Blueprint",
                                    icon: Palette,
                                    prompt:
                                      "I want to start a new architectural blueprint.",
                                  },
                                  {
                                    label: "Upload Context/Images",
                                    icon: ImageIcon,
                                    prompt:
                                      "I need to upload site images and context for analysis.",
                                  },
                                  {
                                    label: "Resume Latest Session",
                                    icon: History,
                                    prompt:
                                      "Resume my previous session and context.",
                                  },
                                ].map((item) => (
                                  <button
                                    key={item.label}
                                    onClick={() => handleSend(item.prompt)}
                                    className="flex flex-row items-center justify-start px-6 py-5 rounded-xl bg-black/40 border border-[#1E1E20] hover:bg-white-[0.03] hover:border-white/20 transition-all group gap-4 relative overflow-hidden backdrop-blur-xl w-full text-left"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="h-10 w-10 shrink-0 rounded-full border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-white/50 group-hover:text-white text-white/50 transition-colors">
                                      <item.icon className="h-4 w-4" />
                                    </div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/60 group-hover:text-white transition-colors">
                                      {item.label}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {currentSession.messages.map((msg, i) => (
                            <ChatMessage
                              key={`${i}-${msg.role}`}
                              msg={msg}
                              msgId={`${i}-${msg.role}`}
                              copiedId={copiedId}
                              onCopy={handleCopyMessage}
                            />
                          ))}

                          {streamingText && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className="flex gap-4 relative z-10 max-w-3xl mr-auto flex-row"
                              layout
                            >
                              <div className="text-[10px] font-bold font-jetbrains-mono uppercase tracking-widest text-[#FFFFFF]/60 pt-1 shrink-0 w-14">
                                [AGENT]
                              </div>
                              <div className="group p-0 text-[14px] leading-relaxed relative min-w-[200px] bg-transparent text-white border-l border-white/10 pl-6 font-sans shadow-none font-light tracking-wide">
                                <div className="prose prose-invert prose-sm max-w-none prose-headings:font-jetbrains-mono prose-headings:text-[#FFFFFF] prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-xs">
                                  <Markdown>{streamingText}</Markdown>
                                  <motion.span
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 0.8,
                                    }}
                                    className="inline-block w-1.5 h-4 bg-[#FFFFFF] ml-1 align-middle"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {isLoading && !streamingText && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-4 relative z-10 max-w-3xl mr-auto flex-row"
                            >
                              <div className="text-[10px] font-bold font-jetbrains-mono uppercase tracking-widest text-[#FFFFFF]/60 pt-1 shrink-0 w-14">
                                [AGENT]
                              </div>
                              <div className="group p-0 text-[14px] leading-relaxed relative min-w-[200px] bg-transparent border-l border-white/10 pl-6 flex items-center gap-1.5 shadow-none pt-2">
                                <motion.div
                                  animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.3, 1, 0.3],
                                  }}
                                  transition={{ repeat: Infinity, duration: 1 }}
                                  className="w-1.5 h-1.5 bg-[#FFFFFF] rounded-full"
                                />
                                <motion.div
                                  animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.3, 1, 0.3],
                                  }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1,
                                    delay: 0.2,
                                  }}
                                  className="w-1.5 h-1.5 bg-[#FFFFFF] rounded-full"
                                />
                                <motion.div
                                  animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.3, 1, 0.3],
                                  }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1,
                                    delay: 0.4,
                                  }}
                                  className="w-1.5 h-1.5 bg-[#FFFFFF] rounded-full"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="p-4 md:p-8 bg-transparent relative z-10 w-full flex flex-col items-center justify-center mt-auto">
                      {currentSession?.designPrompt && (
                        <div className="flex gap-4 mb-6 relative z-20">
                          <Button
                            onClick={() => handleGenerateDesign(currentSession.designPrompt!)}
                            disabled={isProcessing}
                            className={cn(
                              "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                              currentSession.designImages.length > 0
                                ? "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                                : "bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/20",
                              isProcessing && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            {currentSession.designImages.length > 0
                              ? "View Visualization"
                              : "Generate Visuals"}
                          </Button>
                          <Button
                            onClick={() => handleEstimateCost(currentSession.designPrompt!)}
                            disabled={isProcessing}
                            className={cn(
                              "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                              currentSession.costBreakdown
                                ? "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                                : "bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/20",
                              isProcessing && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <IndianRupee className="h-4 w-4 mr-2" />
                            {currentSession.costBreakdown
                              ? "View Breakdown"
                              : "Generate Estimation"}
                          </Button>
                        </div>
                      )}
                      <ChatGPTInput
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onSubmit={() => handleSend()}
                        placeholder="Specify design parameters or upload blueprints..."
                        disabled={isLoading || isProcessing}
                        isLoading={isLoading}
                        className="w-full"
                      />
                      <p className="text-center mt-4 text-[8px] uppercase tracking-[0.5em] font-black text-white/10">
                        Neural Architecture Orchestration Center
                      </p>
                    </div>
                  </div>
                )}

                {/* View: Cost Breakdown */}
                {activeTab === "cost" && (
                  <div className="flex-1 min-h-0 flex flex-col bg-transparent overflow-hidden relative text-white">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-10">
                      <div className="flex items-center gap-3">
                        <IndianRupee className="h-4 w-4 text-white/30" />
                        <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/30">
                          Cost Breakdown
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20">
                        <span className="text-xs font-black text-white tracking-tight">
                          {currentSession?.costBreakdown?.totalEstimate
                            ? `${currentSession.costBreakdown.totalEstimate}`
                            : "ESTIMATING..."}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto pb-24 px-4 custom-scrollbar">
                      <div className="px-8 pt-6 max-w-3xl mx-auto w-full relative z-10">
                        <div className="relative group">
                          <Input
                            placeholder="Add budget or constraints (e.g. 'Budget $5k')"
                            value={costInput}
                            onChange={(e) => setCostInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                currentSession?.designPrompt
                              ) {
                                handleEstimateCost(
                                  currentSession.designPrompt,
                                  costInput,
                                );
                                setCostInput("");
                              }
                            }}
                            className="bg-black text-white h-12 rounded-2xl text-sm pr-12 font-medium shadow-2xl border border-white/20 focus-visible:ring-offset-0 focus-visible:ring-white/10 placeholder:text-white/20 backdrop-blur-md"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1 h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 transition-colors rounded-xl"
                            onClick={() => {
                              if (currentSession?.designPrompt) {
                                handleEstimateCost(
                                  currentSession.designPrompt,
                                  costInput,
                                );
                                setCostInput("");
                              }
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
                        {isEstimatingCost ? (
                          <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <LoadingBreadcrumb
                              status="Parsing Material Data..."
                              className="text-white scale-125"
                            />
                          </div>
                        ) : currentSession?.costBreakdown ? (
                          <div className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {["Material", "Labor", "Contingency"].map(
                                (cat) => {
                                  const items =
                                    currentSession.costBreakdown!.items.filter(
                                      (i) => i.category === cat,
                                    );
                                  if (items.length === 0) return null;
                                  return (
                                    <div key={cat} className="space-y-5">
                                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">
                                        {cat}s
                                      </h3>
                                      <div className="space-y-4">
                                        {items.map((item, idx) => (
                                          <div
                                            key={idx}
                                            className="p-6 rounded-[2rem] bg-black border border-white/10 text-white shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all duration-300 backdrop-blur-md"
                                          >
                                            <div className="flex flex-col gap-1">
                                              <span className="text-[15px] font-bold tracking-tight">
                                                {item.material}
                                              </span>
                                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                                {item.quantity} × ₹
                                                {item.unitPrice.toLocaleString(
                                                  "en-IN",
                                                )}
                                              </span>
                                            </div>
                                            <span className="text-sm font-black tracking-tighter">
                                              ₹
                                              {item.total.toLocaleString(
                                                "en-IN",
                                              )}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>

                            <Separator className="bg-white/10" />

                            <div className="p-10 rounded-[3rem] bg-black border border-white/20 text-white shadow-2xl max-w-md mx-auto text-center backdrop-blur-xl">
                              <div className="flex flex-col gap-6">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">
                                    Total Estimated Investment
                                  </span>
                                  <span className="text-6xl font-black tracking-tighter text-white">
                                    {currentSession.costBreakdown.totalEstimate}
                                  </span>
                                </div>
                                <div className="flex items-center justify-center gap-4 text-[10px] text-white/50 font-bold leading-relaxed border-t border-white/5 pt-6">
                                  <div className="h-2 w-2 rounded-full bg-white shadow-glow" />
                                  <span>
                                    ALGORITHMIC ESTIMATE BASED ON SPECS
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 text-white/10 relative z-10">
                            <div className="h-24 w-24 rounded-[2.5rem] bg-black flex items-center justify-center border border-white/20 shadow-2xl">
                              <IndianRupee className="h-12 w-12 text-white/40" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold tracking-tight text-white/20">
                                Awaiting Specifications
                              </h3>
                              <p className="text-xs max-w-[220px] mx-auto leading-relaxed text-white/40">
                                Please use the chat assistant first to generate
                                a design concept.
                              </p>
                              <Button
                                variant="ghost"
                                onClick={() => setActiveTab("chat")}
                                className="text-white/40 hover:text-white mt-4 bg-transparent underline"
                              >
                                Go to Chat
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* View: Visualizer */}
                {activeTab === "visual" && (
                  <div className="flex-1 min-h-0 flex flex-col bg-transparent overflow-hidden relative text-white">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-10">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <ImageIcon className="h-4 w-4 text-white/30" />
                          <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-white/30">
                            Generated Design
                          </h2>
                        </div>
                        <div className="flex items-center bg-black rounded-lg p-1 border border-white/20 shadow-xl">
                          {(["1K", "2K", "4K"] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => setImageSize(size)}
                              className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                imageSize === size
                                  ? "bg-white/10 text-white shadow-xl shadow-white/10"
                                  : "text-white/40 hover:text-white",
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                      {currentSession?.designImage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download the active render"
                          onClick={() => downloadImage(currentSession.designImage!)}
                          className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/10 bg-white/5 backdrop-blur-md rounded-xl"
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto pb-24 px-4 custom-scrollbar">
                      {/* ── Style Preset Selector ── */}
                      <div className="px-8 pt-8 pb-10 space-y-4 relative z-10">
                        <div className="flex items-center gap-2">
                          <Palette className="h-3.5 w-3.5 text-white/20" />
                          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
                            Aesthetic Presets
                          </label>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          {STYLE_PRESETS.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => setSelectedStyle(style)}
                              className={cn(
                                "p-3 px-4 rounded-[1.5rem] flex flex-row items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group border",
                                selectedStyle.id === style.id
                                  ? "bg-black text-white border-white/40 shadow-[0_10px_40px_rgba(255,255,255,0.1)] scale-105"
                                  : "bg-black text-white/40 border-white/10 hover:bg-black hover:text-white hover:border-white/20",
                              )}
                            >
                              <div
                                className={cn(
                                  "h-6 w-6 shrink-0 rounded-full flex items-center justify-center transition-colors relative z-10",
                                  selectedStyle.id === style.id
                                    ? "bg-white/10"
                                    : "bg-white/5",
                                )}
                              >
                                <style.icon className="h-3 w-3" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest relative z-10 truncate">
                                {style.name}
                              </span>
                              {selectedStyle.id === style.id && (
                                <motion.div
                                  layoutId="preset-indicator"
                                  className="absolute inset-0 border-2 border-white/50 rounded-[1.5rem] pointer-events-none"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {!currentSession?.designPrompt ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
                          <div className="h-24 w-24 rounded-[2.5rem] bg-black flex items-center justify-center border border-white/20 shadow-2xl relative">
                            <ImageIcon className="h-12 w-12 text-white/20" />
                            <Bot className="h-6 w-6 text-white/60 absolute -bottom-2 -right-2" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-extrabold tracking-tight text-white">
                              Awaiting Visual Vision
                            </h3>
                            <p className="text-white/40 max-w-sm mx-auto text-sm leading-relaxed italic">
                              "Use chat to describe your idea, then finalize the visual render here."
                            </p>
                            <div className="pt-4">
                              <Button
                                onClick={() => setActiveTab("chat")}
                                className="bg-white text-black hover:bg-white/90 rounded-xl font-bold"
                              >
                                Go to Architecture Chat
                              </Button>
                            </div>
                          </div>
                        </div>
                     ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto p-8 flex flex-col gap-10 max-w-5xl mx-auto w-full relative z-10 custom-scrollbar">
                           <div className="space-y-2">
                            <div className="flex items-center justify-between px-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-black shadow-lg">
                                  <Bot className="h-4 w-4" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                                  Technical Design Concept
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  copyToClipboard(currentSession.designPrompt!)
                                }
                                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all shadow-lg"
                              >
                                {copied ? (
                                  <Check className="h-4 w-4 text-white" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            <div className="p-8 rounded-[2.5rem] bg-black text-white shadow-2xl shadow-white/10 relative overflow-hidden group backdrop-blur-xl border border-white/10">
                              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Palette className="h-32 w-32 -rotate-12 text-white" />
                              </div>
                              <p className="text-[17px] font-medium leading-[1.6] tracking-tight relative z-10 antialiased text-white">
                                {currentSession.designPrompt}
                              </p>

                              <div className="mt-8 flex flex-wrap gap-2 relative z-10 pt-6 border-t border-white/10">
                                <div className="px-4 py-1.5 rounded-full bg-black border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
                                  {selectedStyle.name}
                                </div>
                                <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/5 text-white text-[10px] font-black uppercase tracking-widest">
                                  {imageSize} RESOLUTION
                                </div>
                              </div>
                            </div>

                            {(!currentSession.designImages ||
                              currentSession.designImages.length === 0) &&
                              !isGeneratingImage && (
                                <div className="pt-4 flex justify-center">
                                  <Button
                                    onClick={() =>
                                      handleGenerateDesign(
                                        currentSession.designPrompt!,
                                      )
                                    }
                                    className="bg-white text-black hover:bg-white/90 h-14 px-10 rounded-2xl text-md font-black shadow-2xl transition-all active:scale-95 group"
                                  >
                                    <Sparkles className="h-5 w-5 mr-3 group-hover:animate-pulse" />
                                    Finalize Visual Render
                                  </Button>
                                </div>
                              )}
                          </div>

                          {isGeneratingImage && currentSession.designImages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 space-y-6 relative z-10">
                              <div className="relative h-32 w-32 mb-4">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 8,
                                    ease: "linear",
                                  }}
                                  className="absolute inset-0 rounded-[2.5rem] border-2 border-dashed border-white/20"
                                />
                                <motion.div
                                  animate={{ rotate: -360 }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 12,
                                    ease: "linear",
                                  }}
                                  className="absolute inset-4 rounded-[2rem] border-2 border-dashed border-white/20"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Bot className="h-8 w-8 text-white/40" />
                                </div>
                              </div>
                              <LoadingBreadcrumb className="text-white scale-125" />
                              <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold animate-pulse">
                                Running Neural Rendering Engine v4.2
                              </p>
                            </div>
                          )}

                          {currentSession.designImages &&
                            currentSession.designImages.length > 0 && (
                              <div className="shrink-0 space-y-6 relative z-10">
                                <div className="flex items-center justify-between px-2">
                                  <div className="flex items-center gap-4">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                                      Design Matrix{" "}
                                      <span className="text-white/20 ml-2">
                                        [{currentSession.designImages.length}{" "}
                                        DESIGNS]
                                      </span>
                                    </h3>
                                  </div>
                                  <Button
                                    onClick={() =>
                                      handleGenerateDesign(
                                        currentSession.designPrompt!,
                                        undefined,
                                        true,
                                      )
                                    }
                                    disabled={isGeneratingImage}
                                    size="sm"
                                    className="h-10 px-6 text-[10px] tracking-widest uppercase font-black bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                                  >
                                    ⟳ Regenerate Collection
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-2">
                                  {currentSession.designImages.map(
                                    (img, idx) => (
                                      <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() =>
                                          updateSession(currentSessionId!, {
                                            designImage: img,
                                          })
                                        }
                                        className={cn(
                                          "relative group rounded-[2.5rem] overflow-hidden border-2 cursor-pointer transition-all aspect-square shadow-2xl",
                                          currentSession.designImage === img
                                            ? "border-white shadow-white/10 ring-4 ring-white/10 scale-[1.03] z-10"
                                            : "border-white/5 hover:border-white/20 grayscale-[0.4] hover:grayscale-0",
                                        )}
                                      >
                                        <ProgressiveImage
                                          src={img}
                                          alt={`Design variant ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                        />

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedImage(img);
                                            }}
                                            className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/40"
                                          >
                                            <Maximize size={14} />
                                          </button>
                                        </div>

                                        {currentSession.designImage === img && (
                                          <div className="absolute top-4 left-4 bg-white text-black rounded-full px-3 py-1 font-black text-[9px] tracking-[0.1em] shadow shadow-white/40">
                                            SELECTED
                                          </div>
                                        )}

                                        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between translate-y-2 group-hover:translate-y-0 transition-transform">
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                              Variant
                                            </span>
                                            <span className="text-2xl font-black text-white">
                                              0{idx + 1}
                                            </span>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEnterRoom(img);
                                            }}
                                            className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                                          >
                                            <Sparkles size={16} />
                                          </button>
                                        </div>
                                      </motion.div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {currentSession.designImage && !isGeneratingImage && (
                            <div className="space-y-6 relative z-10 pt-10 border-t border-white/5">
                              <div className="flex items-end justify-between px-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                                    Active Selection
                                  </span>
                                  <h3 className="text-xl font-bold text-white tracking-tight">
                                    Main Visualization Focus
                                  </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Button
                                    onClick={() =>
                                      handleEnterRoom(
                                        currentSession.designImage!,
                                      )
                                    }
                                    className="bg-black text-white hover:bg-white/10 h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest border border-white/10 transition-all active:scale-95"
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    360 Immersive
                                  </Button>
                                  <Button
                                    onClick={handleGenerate3D}
                                    disabled={isGenerating3D}
                                    className="bg-white text-black hover:bg-zinc-200 h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_8px_25px_rgba(255,255,255,0.2)] transition-all active:scale-95 disabled:opacity-50"
                                  >
                                    <Box className="h-4 w-4 mr-2" />
                                    {isGenerating3D ? "Synthesizing..." : "Neural 3D Mesh"}
                                  </Button>
                                </div>
                              </div>

                              <motion.div
                                layoutId="active-image"
                                className="relative rounded-[3rem] overflow-hidden border border-white/10 bg-black min-h-[500px] group shadow-2xl cursor-pointer"
                                onClick={() =>
                                  setSelectedImage(currentSession.designImage!)
                                }
                              >
                                <ProgressiveImage
                                  src={currentSession.designImage}
                                  alt="Main Selection"
                                  className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40" />
                                <div className="absolute bottom-10 left-10 flex flex-col gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">
                                    Master Visual
                                  </span>
                                  <p className="text-white/60 text-xs font-medium max-w-md line-clamp-2 italic">
                                    "{currentSession.designPrompt}"
                                  </p>
                                </div>
                              </motion.div>
                            </div>
                          )}

                          {!currentSession.designImage &&
                            !isGeneratingImage &&
                            (!currentSession.designImages ||
                              currentSession.designImages.length === 0) && (
                              <div className="flex-[2] relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-black min-h-[500px] flex items-center justify-center relative z-10">
                                <div className="flex flex-col items-center text-white/20">
                                  <ImageIcon className="h-24 w-24 mb-6 opacity-40" />
                                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">
                                    Visualization Engine Ready
                                  </p>
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {showInitializingOverlay && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center bg-black/80 backdrop-blur-xl"
            >
              <LoadingBreadcrumb
                status="Initializing Agent Intelligence..."
                className="text-white"
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </AnimatePresence>
  </main>

      {/* Inspector Panel - Collapsible right sidebar */}
      <AnimatePresence mode="wait">
        {isInspectorOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0, x: 20 }}
            animate={{ width: 320, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-l border-white/5 flex flex-col bg-black/40 backdrop-blur-xl z-[50] relative overflow-hidden shrink-0 h-full will-change-transform transform-gpu"
          >
            <div className="p-6 border-b border-[#1E1E20] flex items-center justify-between">
              <h3 className="font-jetbrains-mono text-xs uppercase tracking-widest text-[#FFFFFF] font-bold">
                Project Metadata
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsInspectorOpen(false)}
                className="rounded-full hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 hide-scrollbar">
              {currentSession && (
                <>
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Session ID
                    </div>
                    <div className="font-jetbrains-mono text-xs text-white/80 p-3 bg-black border border-white/10 rounded-lg break-all">
                      {currentSession.id}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Current State
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <div className="h-2 w-2 rounded-full bg-white" />
                      <span className="capitalize">
                        {activeTab} Mode Active
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Context Stats
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black border border-[#1E1E20] p-4 rounded-xl text-center space-y-1">
                        <div className="text-2xl font-jetbrains-mono text-white/80">
                          {currentSession.messages.length}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">
                          Tokens Exchanged
                        </div>
                      </div>
                      <div className="bg-black border border-[#1E1E20] p-4 rounded-xl text-center space-y-1">
                        <div className="text-2xl font-jetbrains-mono text-white/80">
                          {currentSession.designImages?.length || 0}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">
                          Stored Renders
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Project Settings
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-black border border-[#1E1E20] rounded-lg">
                        <span className="text-xs text-white/60">
                          Unit System
                        </span>
                        <span className="text-xs font-jetbrains-mono text-white/90">
                          Metric
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-black border border-[#1E1E20] rounded-lg">
                        <span className="text-xs text-white/60">
                          Style Engine
                        </span>
                        <span className="text-xs font-jetbrains-mono text-white/90">
                          Stable Diffusion
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-5xl w-full flex flex-col gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 -right-12 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 rounded-full h-10 w-10 backdrop-blur-md z-[110]"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative overflow-hidden rounded-[2.5rem] border border-white/20 shadow-2xl bg-black aspect-video"
              >
                <img
                  src={selectedImage}
                  alt="High Resolution Design"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              <div className="flex flex-wrap items-center justify-center gap-3 bg-white/5 p-4 rounded-[2rem] border border-white/10 backdrop-blur-md">
                <Button
                  onClick={() => {
                    setSelectedImage(null);
                    handleEnterRoom(selectedImage);
                  }}
                  className="gap-2 h-12 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 border-0"
                >
                  Enter Room
                </Button>

                <Button
                  onClick={() => {
                    const text = encodeURIComponent(
                      "Check out this architectural design!",
                    );
                    const url = encodeURIComponent(window.location.href);
                    window.open(
                      `https://wa.me/?text=${text}%20${url}`,
                      "_blank",
                    );
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-12 px-5 gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    WhatsApp
                  </span>
                </Button>

                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedImage);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-12 px-5 gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {copied ? "Copied!" : "Image Link"}
                  </span>
                </Button>

                <Button
                  onClick={() => downloadImage(selectedImage)}
                  className="bg-white text-black hover:bg-white/90 rounded-xl h-12 px-8 gap-2 ml-auto"
                >
                  <Download className="h-4 w-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Download High-Res
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* StudioAI Immersive 3D Viewer */}
      <AnimatePresence>
        {showImmersiveViewer && immersiveConcept && (
          <ErrorBoundary>
            <Suspense fallback={null}>
            <Viewer3D
              design={immersiveConcept}
              is3D={isGenerating3D || !!currentSession?.design3DModel}
              modelUrl={currentSession?.design3DModel}
              onClose={() => {
                setShowImmersiveViewer(false);
                setImmersiveConcept(null);
              }}
            />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default OrchestrationPage;
