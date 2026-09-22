import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Lenis from "@studio-freight/lenis";
import { Bot } from "lucide-react";
import { BackToTop } from "./BackToTop";
import { useLoading } from "@/lib/LoadingContext";

/**
 * Backdrop plates. Sized to 1600px and served as WebP — the originals were
 * 2070px JPEGs, roughly 4x the bytes for pixels nobody sees behind a 50%
 * brightness veil.
 */
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?q=70&w=1600&fm=webp&auto=format&fit=crop`;

export const ARCH_IMAGES = [
  unsplash("1600585154340-be6161a56a0c"),
  unsplash("1600607687920-4e2a09cf159d"),
  unsplash("1512917774080-9991f1c4c750"),
  unsplash("1600566753376-12c8ab7fb75b"),
  unsplash("1600607686527-6fb886090705"),
  unsplash("1600047509807-ba8f99d2cdde"),
];

const ROTATE_MS = 12_000;

export function GlobalLayout() {
  const [bgIndex, setBgIndex] = useState(0);
  const { isSyncing } = useLoading();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);

  // ── Smooth scroll. Exactly one instance for the whole app; pages must not
  //    create their own or the two rAF loops fight over scrollTop. ──
  useEffect(() => {
    if (reduceMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduceMotion]);

  // Reset scroll position on route change (Lenis keeps its own offset).
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ── Backdrop rotation. Paused while the tab is hidden so a backgrounded
  //    tab isn't burning GPU on crossfades nobody can see. ──
  useEffect(() => {
    if (reduceMotion) return;

    let timer: number | undefined;
    const tick = () => setBgIndex((i) => (i + 1) % ARCH_IMAGES.length);

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(tick, ROTATE_MS);
    };
    const onVisibility = () => (document.hidden ? window.clearInterval(timer) : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduceMotion]);

  // Warm the next plate so the crossfade never reveals a blank frame.
  useEffect(() => {
    const next = new Image();
    next.src = ARCH_IMAGES[(bgIndex + 1) % ARCH_IMAGES.length];
  }, [bgIndex]);

  return (
    <div className="relative min-h-screen w-full bg-[#050505] font-sans text-white overflow-x-hidden">
      {/*
        Only the active plate is mounted. The previous version kept all six
        full-bleed layers alive and animated every one on each rotation.
        `AnimatePresence` + opacity-only transitions stay on the compositor.
      */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatePresence initial={false}>
          <motion.div
            key={ARCH_IMAGES[bgIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.6, ease: "linear" }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transform-gpu"
            style={{ backgroundImage: `url('${ARCH_IMAGES[bgIndex]}')` }}
          />
        </AnimatePresence>

        {/*
          Static darkening scrim. Replaces a `filter: brightness(.5) contrast()
          saturate()` that forced the compositor to re-filter a full-screen
          layer on every frame of every crossfade. The gradient keeps the
          header and hero copy legible over bright plates while letting the
          middle of the image breathe.
        */}
        <div className="absolute inset-0 bg-[#050505]/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505]/30 to-[#050505]" />
        <div className="absolute inset-0 bg-grid-white opacity-40" />
      </div>

      <main className="relative z-10 min-h-screen w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet context={{ setBgIndex }} />
          </motion.div>
        </AnimatePresence>
      </main>

      <BackToTop />

      {/* Route transition veil */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "linear" }}
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                  className="w-14 h-14 rounded-full border border-white/10 border-t-white"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white/60" />
                </div>
              </div>
              <span className="text-zinc-400 text-[10px] font-jetbrains-mono tracking-[0.3em] uppercase">
                Synchronizing
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
