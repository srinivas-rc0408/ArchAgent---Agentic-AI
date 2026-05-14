import { useState, useEffect, useRef, type MouseEvent, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Viewer3D from "@/components/Viewer3D";
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
  Mail,
  MessageCircle,
  Palette,
  PanelLeftOpen,
  PanelLeftClose,
  Menu,
  ChevronRight,
  X,
  Maximize,
  Box,
  TrendingUp,
} from "lucide-react";
import { generateProjectPDF } from "@/services/pdfService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "motion/react";
import {
  getArchitectStream,
  getCostEstimation,
  generateDesignImage,
  generateMultipleDesignImages,
  generateProjectTitle,
  enhancePrompt,
  type CostBreakdown,
} from "@/lib/gemini";
import { generateProfessionalPDF } from "@/lib/pdfHelper";
import { cn } from "@/lib/utils";
import { useLoading } from "@/lib/LoadingContext";
import { Logo } from "@/components/Logo";
import { Progress } from "@/components/ui/interfaces-progress";
import SilkBackground from "@/components/ui/silk-background-animation";
import { STYLE_PRESETS, type StylePreset, type DesignConcept } from "@/types";
import Markdown from "react-markdown";

function ProgressiveImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-[#1A1A1A]", className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/5" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-all duration-700 ease-out",
          loaded ? "opacity-100 blur-none scale-100" : "opacity-0 blur-xl scale-105",
          className
        )}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export async function safeRequest<T>(
  action: () => Promise<T>,
  onRetry?: (attempt: number) => void,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await action();
    } catch (error: any) {
      if (attempt < maxRetries) {
        attempt++;
        if (onRetry) onRetry(attempt);
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error("safeRequest failed.");
}

interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

interface ProjectSession {
  id: string;
  title: string;
  messages: Message[];
  designPrompt: string | null;
  designImage: string | null;
  designImages: string[]; // Multiple generated variants
  design3DModel: string | null; // URL to the generated GLB
  costBreakdown: null | CostBreakdown;
  timestamp: number;
}

import ChatGPTInput from "../components/ui/prompt-input-dynamic-grow";
import { LoadingBreadcrumb } from "../components/ui/animated-loading-svg-text-shimmer";
import confetti from "canvas-confetti";

const playSuccessSound = () => {
  try {
    const audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();

    // Create oscillator
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Set properties for a pleasant bright "ding"
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(
      1046.5,
      audioCtx.currentTime + 0.1,
    ); // Slide up to C6

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.5,
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (error) {
    console.error("Audio API not supported or blocked", error);
  }
};

const triggerSuccessFeedback = () => {
  // Play subtle satisfying completion ping
  playSuccessSound();

  // Fire delightful low-key confetti burst from bottom center
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.9 },
    colors: ["#ffffff", "#aaaaaa", "#555555"],
  });
};

const ArchAgentLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-full w-full p-2 text-white"
  >
    <path
      d="M12 2C7.02944 2 3 6.02944 3 11C3 15.9706 7.02944 20 12 20C16.9706 20 21 15.9706 21 11C21 6.02944 16.9706 2 12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="11"
      r="4"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="11" r="1.5" fill="currentColor" />
  </svg>
);

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

import { supabase } from "@/lib/supabase";

function OrchestrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"chat" | "cost" | "visual">(
    "chat",
  );
  const [hasNewEstimation, setHasNewEstimation] = useState(false);
  const [hasNewVisualization, setHasNewVisualization] = useState(false);

  useEffect(() => {
    if (activeTab === "cost") setHasNewEstimation(false);
    if (activeTab === "visual") setHasNewVisualization(false);
  }, [activeTab]);
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      } else if (localStorage.getItem("auth_token") === "mock") {
        setUser({ email: "srinivasrc0408@gmail.com", displayName: "Srinivas" });
      } else {
        // Not authenticated, redirect to login
        navigate("/login?redirect=/orchestration");
      }
    });

    // HF Warmup
    fetch("/api/warmup-hf", { method: "POST" }).catch(() => {});
  }, [navigate]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryToast, setRetryToast] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<{ label: string; action: () => void } | null>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEstimatingCost, setIsEstimatingCost] = useState(false);
  const [costInput, setCostInput] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [copied, setCopied] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(
    STYLE_PRESETS[0],
  );
  const [showImmersiveViewer, setShowImmersiveViewer] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [immersiveConcept, setImmersiveConcept] =
    useState<DesignConcept | null>(null);

  const { isSyncing, startSyncSequence } = useLoading();

  // Sticky flag to suppress internal loader if we mounted during a global sync
  const [mountedDuringSync] = useState(isSyncing);

  // Hide initialization overlay if we're already syncing globally OR if we started with one
  const showInitializingOverlay = isInitializing && !isSyncing && !mountedDuringSync;

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session || !session.costBreakdown || session.designImages.length < 3) return;
    
    setIsGeneratingPDF(true);
    try {
      await generateProjectPDF({
        projectName: session.title,
        prompt: session.designPrompt || "Architectural Synthesis",
        estimation: session.costBreakdown.items.map(item => ({
          category: item.category,
          spec: `${item.material} - ${item.specification}`,
          qty: item.quantity,
          rate: item.unitPrice,
          total: item.total
        })),
        images: session.designImages.slice(0, 4)
      });
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleBack = () => {
    startSyncSequence("/");
  };

  // Handle auto-triggers from showcase or other pages
  useEffect(() => {
    if (location.state?.autoTrigger === "estimate" && location.state?.prompt && sessions.length > 0) {
      const targetSessionId = currentSessionId || sessions[0].id;
      const p = location.state.prompt;
      setInput(p);
      
      // Navigate to cost tab first for better UX
      setActiveTab("cost");
      
      // Small delay to ensure state has settled
      setTimeout(() => {
        handleEstimateCost(p, undefined, targetSessionId);
      }, 500);
      
      // Clear location state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sessions, currentSessionId]);

  // Sync current session ID if it gets lost
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    if (activeTab === "chat" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab]);

  const startRename = (session: ProjectSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const finishRename = (session: ProjectSession) => {
    updateSession(session.id, { title: editingTitle });
    setEditingSessionId(null);
  };

  // Function to sync sessions with Supabase
  const syncWithSupabase = async (sessionsToSync: ProjectSession[]) => {
    if (!supabase) return;

    try {
      // For simplicity in this demo, we'll store all sessions as a single record or multiple.
      // Ideally, each session is a row. Let's try to upsert them.
      for (const session of sessionsToSync) {
        try {
          const { error } = await supabase.from("project_sessions").upsert({
            id: session.id,
            title: session.title,
            messages: session.messages,
            design_prompt: session.designPrompt,
            design_image: session.designImage,
            design_images: session.designImages,
            // design_3d_model: session.design3DModel, // Disabled until column is added to Supabase
            cost_breakdown: session.costBreakdown,
            timestamp: session.timestamp,
          });

          if (error) {
            if (error.code === "42P01") {
              console.warn("Supabase table 'project_sessions' not found. Falling back to local storage.");
              break;
            }
            // Quiet network errors
            if (error.message?.includes("Failed to fetch") || error.message?.includes("TypeError")) {
               console.warn("Supabase network issue. Syncing to local only.");
            } else {
               console.error("Supabase sync error:", error.message);
            }
          }
        } catch (itemError) {
          // Catch fetch errors per item
          if (itemError instanceof TypeError && itemError.message === 'Failed to fetch') {
            console.warn("Supabase unreachable. Continuing with local storage.");
            return; // Stop trying for now if network is failing
          }
          throw itemError;
        }
      }
    } catch (e) {
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        console.warn("Supabase connection issues. Working offline.");
      } else {
        console.error("Supabase communication failed", e);
      }
    }
  };

  // Load sessions from Supabase and localStorage
  useEffect(() => {
    const loadSessions = async () => {
      try {
        let savedSessions: ProjectSession[] = [];

        // Try Supabase first
        if (import.meta.env.VITE_SUPABASE_URL) {
          try {
            const { data, error } = await supabase
              .from("project_sessions")
              .select("*")
              .order("timestamp", { ascending: false });

            if (!error && data && data.length > 0) {
              savedSessions = data.map((s) => ({
                id: s.id,
                title: s.title,
                messages: s.messages,
                designPrompt: s.design_prompt,
                designImage: s.design_image,
                designImages: s.design_images || [],
                design3DModel: null, // Keep the structure
                costBreakdown: s.cost_breakdown,
                timestamp: s.timestamp,
              }));
              console.log("Loaded sessions from Supabase");
            } else if (error) {
              // Ignore table not found error as it's expected if migration hasn't run
              if (error.code !== "42P01") {
                console.warn("Supabase fetch failed, trying local storage:", error.message);
              }
            }
          } catch (fetchErr) {
            if (fetchErr instanceof TypeError && fetchErr.message === 'Failed to fetch') {
              console.warn("Supabase unreachable. Falling back to local storage.");
            } else {
              console.error("Supabase load error:", fetchErr);
            }
          }
        }

        // If Supabase empty or failed, try localStorage
        if (savedSessions.length === 0) {
          const saved = localStorage.getItem("arch_agent_sessions");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              savedSessions = parsed.map((s: any) => ({
                ...s,
                designImages:
                  s.designImages || (s.designImage ? [s.designImage] : []),
              }));
              console.log("Loaded sessions from localStorage");
            }
          }
        }

        if (savedSessions.length > 0) {
          setSessions(savedSessions);
          setCurrentSessionId(savedSessions[0].id);
        } else {
          createNewSession();
        }
      } catch (err) {
        console.error("Session initialization failed", err);
        createNewSession();
      } finally {
        setIsInitializing(false);
      }
    };

    loadSessions();
  }, []);

  // Save sessions to localStorage and sync with Supabase
  useEffect(() => {
    if (sessions.length > 0 && !isInitializing) {
      localStorage.setItem("arch_agent_sessions", JSON.stringify(sessions));
      // Debounced sync or immediate for critical changes
      syncWithSupabase(sessions);
    }
  }, [sessions, isInitializing]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      // Scroll to bottom with a slight delay to ensure content is measured
      const timeoutId = setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [sessions, currentSessionId, streamingText, activeTab]);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const createNewSession = () => {
    const newSession: ProjectSession = {
      id: Math.random().toString(36).substring(7),
      title: "New Project",
      messages: [],
      designPrompt: null,
      designImage: null,
      designImages: [],
      design3DModel: null,
      costBreakdown: null,
      timestamp: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleSend = async (overrideMessage?: string) => {
    const textToSend = overrideMessage || input;
    if (!textToSend.trim() || isLoading) return;

    let targetSessionId = currentSessionId;

    // If no active session, create a new one instantly before proceeding
    if (!targetSessionId) {
      const newSession: ProjectSession = {
        id: Math.random().toString(36).substring(7),
        title: "New Project",
        messages: [],
        designPrompt: null,
        designImage: null,
        designImages: [],
        design3DModel: null,
        costBreakdown: null,
        timestamp: Date.now(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      targetSessionId = newSession.id;
    }

    const currentSessionRef = sessions.find((s) => s.id === targetSessionId);

    const userMessage: Message = {
      role: "user",
      parts: [{ text: textToSend }],
    };
    const baseMessages = currentSessionRef ? currentSessionRef.messages : [];
    const updatedMessages = [...baseMessages, userMessage];

    // Auto-hide sidebar when interacting with chat
    setIsSidebarOpen(false);

    // Update local state immediately
    updateSession(targetSessionId, { messages: updatedMessages });
    setInput("");
    setIsLoading(true);

    try {
      const stream = await getArchitectStream(updatedMessages);
      let fullResponse = "";
      setStreamingText("");

      for await (const chunk of stream) {
        const chunkText = chunk.text || "";
        fullResponse += chunkText;
        setStreamingText(fullResponse);
      }

      setStreamingText(null);

      // Extract design prompt if present
      const promptMatch = fullResponse.match(
        /\[DESIGN_PROMPT\](.*?)\[\/DESIGN_PROMPT\]/s,
      );
      const designPrompt = promptMatch ? promptMatch[1].trim() : null;
      const cleanResponse = fullResponse
        .replace(/\[DESIGN_PROMPT\].*?\[\/DESIGN_PROMPT\]/gs, "")
        .trim();

      const finalModelMessage: Message = {
        role: "model",
        parts: [
          {
            text:
              cleanResponse ||
              (designPrompt
                ? "I've generated a design prompt for you. Visualizing now..."
                : "I'm here to help with your architectural needs."),
          },
        ],
      };
      const finalMessages = [...updatedMessages, finalModelMessage];

      updateSession(targetSessionId, {
        messages: finalMessages,
        designPrompt:
          designPrompt ||
          (currentSessionRef ? currentSessionRef.designPrompt : null),
      });

      // Smart Title Generation if it's the first few messages
      if (
        finalMessages.length >= 2 &&
        (!currentSessionRef || currentSessionRef.title === "New Project")
      ) {
        generateProjectTitle(finalMessages).then((title) => {
          updateSession(targetSessionId, { title });
        });
      }

      // AUTO-TRIGGER: If a design prompt was generated, automatically trigger image and cost
      if (designPrompt) {
        handleGenerateDesign(designPrompt, targetSessionId);
      }
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        role: "model",
        parts: [
          { text: "I'm sorry, I encountered an error. Please try again." },
        ],
      };
      updateSession(targetSessionId, {
        messages: [...updatedMessages, errorMessage],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDesign = async (
    prompt: string,
    overrideSessionId?: string,
  ) => {
    const targetSessionId = overrideSessionId || currentSessionId;
    if (!targetSessionId || !prompt?.trim()) return;

    // Run-Once Logic
    const session = sessions.find(s => s.id === targetSessionId);
    if (session?.designImages && session.designImages.length > 0 && !overrideSessionId) {
      setActiveTab("visual");
      return;
    }
    
    if (!user && !user?.email) {
       navigate("/login");
       return;
    }

    setIsProcessing(true);
    setIsGeneratingImage(true);
    setIsSidebarOpen(false); // Auto-hide sidebar to focus on canvas
    setRetryToast(null);
    setRetryAction(null);

    // AUTO-TRIGGER: Launch cost estimation entirely in parallel so it isn't blocked by image failure
    handleEstimateCost(prompt, undefined, targetSessionId);

    try {
      // Enhance the prompt using the selected style preset keywords
      let enhancedPrompt = prompt;
      try {
        const result = await enhancePrompt(prompt, selectedStyle.keywords);
        // Only use enhanced result if it's meaningful
        if (result && result.trim().length > 0) {
          enhancedPrompt = result;
          console.log(
            `[Style] Enhanced prompt with '${selectedStyle.name}' style`,
          );
        }
      } catch (err) {
        console.warn(
          "[Style] Prompt enhancement failed, using original prompt",
          err,
        );
      }

      // Safety: ensure we never pass an empty prompt
      const finalPrompt = enhancedPrompt?.trim() || prompt;

      // Generate 4 design variants in parallel
      const images = await safeRequest(
        () => generateMultipleDesignImages(finalPrompt, 4, imageSize),
        (attempt) => setRetryToast(`Neural Link Interrupted - Re-synchronizing... (Attempt ${attempt})`)
      );

      updateSession(targetSessionId, {
        designImages: images,
        designImage: images[0],
      });

      if (activeTab !== "visual") {
        setHasNewVisualization(true);
      }

      triggerSuccessFeedback();
    } catch (error) {
      console.error(error);
      setRetryAction({
        label: "Visual Synthesis Failed",
        action: () => handleGenerateDesign(prompt, overrideSessionId)
      });
      const errorMessage: Message = {
        role: "model",
        parts: [{ text: "Architectural synthesis encountered an obstruction. I've attempted to optimize the render parameters, but the cluster is under high load. Please retry or adjust the design prompt." }]
      };
      updateSession(targetSessionId, { 
        messages: [...(sessions.find(s => s.id === targetSessionId)?.messages || []), errorMessage] 
      });
    } finally {
      setIsGeneratingImage(false);
      setIsProcessing(false);
      setRetryToast(null);
    }
  };

  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGenerate3D = async () => {
    if (!currentSession?.designPrompt || !currentSession?.designImage) return;
    
    setImmersiveConcept({
      id: currentSessionId!,
      url: currentSession.designImage,
      prompt: currentSession.designPrompt,
      style: selectedStyle.name,
      timestamp: Date.now()
    });
    setShowImmersiveViewer(true);

    if (currentSession?.design3DModel) {
      return; // Run-once logic
    }
    
    setIsGenerating3D(true);
    setRetryToast("Initializing Neural Mesh...");
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
              unlit: false,
              pbr: true,
              mesh_density: "high",
              texture_size: 4096,
              export_format: "glb_compressed"
            })
          });
          if (!response.ok) throw new Error("3D Generation returned " + response.status);
          return response.json();
        },
        (attempt) => setRetryToast(`Server Waking Up - Retrying... (Attempt ${attempt})`)
      );

      if (data.modelUrl) {
         updateSession(currentSessionId!, { design3DModel: data.modelUrl });
         triggerSuccessFeedback();
      }
    } catch (err) {
      console.error("3D Gen Error:", err);
      setRetryAction({
        label: "Neural Mesh Generation Failed",
        action: () => handleGenerate3D()
      });
    } finally {
      setIsGenerating3D(false);
    }
  };

  const handleEnterRoom = (imageUrl: string) => {
    const concept: DesignConcept = {
      id: currentSessionId || "viewer",
      url: imageUrl,
      prompt: currentSession?.designPrompt || "",
      style: selectedStyle.name,
      timestamp: Date.now(),
    };
    setImmersiveConcept(concept);
    setShowImmersiveViewer(true);
  };

  const handleEstimateCost = async (
    prompt: string,
    constraints?: string,
    overrideSessionId?: string,
  ) => {
    const targetSessionId = overrideSessionId || currentSessionId;
    if (!targetSessionId) return;

    // Run-Once Logic & Auth Guard
    const session = sessions.find(s => s.id === targetSessionId);
    if (session?.costBreakdown && !constraints && !overrideSessionId) {
      setActiveTab("cost");
      return;
    }

    if (!user && !user?.email) {
       navigate("/login");
       return;
    }

    setIsProcessing(true);
    setIsEstimatingCost(true);
    setRetryToast(null);
    setRetryAction(null);
    try {
      const breakdown = await safeRequest(
        () => getCostEstimation(prompt, constraints),
        (attempt) => setRetryToast(`Neural Link Interrupted - Re-synchronizing... (Attempt ${attempt})`)
      );
      updateSession(targetSessionId, { costBreakdown: breakdown });

      if (activeTab !== "cost") {
        setHasNewEstimation(true);
      }

      setTimeout(triggerSuccessFeedback, 300);
    } catch (error) {
      console.error(error);
      setRetryAction({
        label: "Market Analysis Failed",
        action: () => handleEstimateCost(prompt, constraints, overrideSessionId)
      });
    } finally {
      setIsEstimatingCost(false);
      setIsProcessing(false);
      setRetryToast(null);
    }
  };

  const updateSession = (id: string, updates: Partial<ProjectSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    startSyncSequence("/"); 
    // Perform cleanup after transition starts, but before reload kills the animation
    setTimeout(async () => {
      try {
        if (supabase) await supabase.auth.signOut();
      } catch (err) {
        console.error("Sign out error:", err);
      }
      localStorage.removeItem("auth_token");
      // Redirect via hard navigation to ensure clean state
      window.location.href = "/";
    }, 2800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)", scale: 0.99 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-screen w-full bg-transparent text-white overflow-hidden font-sans relative"
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
                provider="twentyfirst"
                label="21st"
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
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-white/5 text-xs font-bold text-white/50">
                      <UserProfileLogo />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight text-white">
                      {user?.displayName || "Srinivas"}
                    </span>
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest truncate max-w-[120px]">
                      Architect Lead
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[9px] text-white/30 font-medium italic leading-relaxed">
                    Welcome back, Srinivas. Your orchestration environment is active and optimized.
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
                  {currentSession?.costBreakdown && currentSession?.designImages && currentSession.designImages.length >= 3 && (
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
                      className="flex-1 min-h-0 h-[calc(100vh-180px)] overflow-y-auto px-4 p-6 scroll-smooth custom-scrollbar"
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

                          {currentSession.messages.map((msg, i) => {
                            const msgId = `${i}-${msg.role}`;
                            return (
                              <motion.div
                                key={msgId}
                                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                  duration: 0.5,
                                  ease: [0.16, 1, 0.3, 1],
                                  delay: 0.05
                                }}
                                layout
                                className={cn(
                                  "flex gap-4 relative z-10 max-w-3xl flex-row",
                                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                                )}
                              >
                                <div
                                  className={cn(
                                    "text-[10px] font-bold font-jetbrains-mono uppercase tracking-widest pt-1 shrink-0 w-14",
                                    msg.role === "user"
                                      ? "text-[#FFFFFF]/40 text-right pr-1"
                                      : "text-[#FFFFFF]/60",
                                  )}
                                >
                                  [{msg.role === "user" ? "USER" : "AGENT"}]
                                </div>
                                <div
                                  className={cn(
                                    "group p-0 text-[14px] leading-relaxed relative min-w-[200px] bg-transparent text-white border-l border-white/10 pl-6 font-sans shadow-none whitespace-pre-wrap",
                                    msg.role === "user"
                                      ? "font-normal text-white/90"
                                      : "font-light tracking-wide",
                                  )}
                                >
                                  {msg.role !== "user" ? (
                                    <div className="prose prose-invert prose-sm max-w-none prose-headings:font-jetbrains-mono prose-headings:text-[#FFFFFF] prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-xs">
                                      <Markdown>{msg.parts[0].text}</Markdown>
                                    </div>
                                  ) : (
                                    msg.parts[0].text
                                  )}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        msg.parts[0].text,
                                      );
                                      setCopiedId(msgId);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="absolute bottom-0 -right-12 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-xl backdrop-blur-md border border-[#1E1E20] hover:border-white/30 text-white/50 hover:text-white bg-black/40"
                                  >
                                    {copiedId === msgId ? (
                                      <Check className="h-3.5 w-3.5 text-[#FFFFFF]" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}

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

                    <div className="flex-1 min-h-0 h-[calc(100vh-180px)] overflow-y-auto pb-24 px-4 custom-scrollbar">
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
                          className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/10 bg-white/5 backdrop-blur-md rounded-xl"
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 min-h-0 h-[calc(100vh-180px)] overflow-y-auto pb-24 px-4 custom-scrollbar">
                      {/* ── Style Preset Selector ── */}
                      <div className="px-8 pt-8 pb-10 space-y-4 relative z-10">
                          <div className="flex items-center gap-2">
                            <Palette className="h-3.5 w-3.5 text-white/20" />
                            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">
                              Aesthetic Presets
                            </label>
                          </div>
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
                        <div className="flex-1 min-h-0 h-[calc(100vh-180px)] overflow-y-auto p-8 flex flex-col gap-10 max-w-5xl mx-auto w-full relative z-10 custom-scrollbar">
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

                          {isGeneratingImage && (
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

                          {!isGeneratingImage &&
                            currentSession.designImages &&
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
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = selectedImage;
                    a.download = `arch-design-${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
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
            <Viewer3D
              design={immersiveConcept}
              is3D={isGenerating3D || !!currentSession?.design3DModel}
              modelUrl={currentSession?.design3DModel}
              onClose={() => {
                setShowImmersiveViewer(false);
                setImmersiveConcept(null);
              }}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default OrchestrationPage;
