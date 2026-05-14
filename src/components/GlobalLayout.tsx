import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import Lenis from "@studio-freight/lenis";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackToTop } from "./BackToTop";
import { useLoading } from "@/lib/LoadingContext";

export const ARCH_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=2070&auto=format&fit=crop"
];

export function GlobalLayout() {
  const [bgImage, setBgImage] = useState(ARCH_IMAGES[0]);
  const { isSyncing } = useLoading();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    const interval = setInterval(() => {
      setBgImage(prev => {
        const currentIndex = ARCH_IMAGES.indexOf(prev);
        return ARCH_IMAGES[(currentIndex + 1) % ARCH_IMAGES.length];
      });
    }, 10000);

    return () => {
      lenis.destroy();
      clearInterval(interval);
    };
  }, []);

  const location = useLocation();

  return (
    <div className="relative min-h-screen w-full bg-[#050505] font-sans text-white overflow-x-hidden">
      {/* Background Image with Overlay */}
      {ARCH_IMAGES.map((img) => (
        <motion.div 
          key={img}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ 
            opacity: bgImage === img ? 1 : 0,
            scale: bgImage === img ? 1 : 1.1
          }}
          transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
          className={cn("fixed inset-0 z-[0] bg-cover bg-center bg-no-repeat will-change-transform transform-gpu", bgImage === img ? "pointer-events-auto" : "pointer-events-none")}
          style={{ 
            backgroundImage: `url('${img}')`,
            filter: "brightness(0.5) contrast(1.1) saturate(1.1)",
            zIndex: 0
          }}
        />
      ))}

      {/* Grid Pattern Background */}
      <div className="fixed inset-0 z-[0] bg-grid-white/[0.02] pointer-events-none opacity-40" style={{ zIndex: 0 }} />

      <main className="relative z-10 min-h-screen w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet context={{ setBgImage }} />
          </motion.div>
        </AnimatePresence>
      </main>

      <BackToTop />

      {/* Technical Loading Sequence overlay */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(64px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[9999] bg-black/80 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="w-16 h-16 rounded-full border border-white/10 border-t-white shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white/60" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-white text-lg font-medium tracking-tight">
                  Synchronizing State
                </span>
                <span className="text-zinc-500 text-xs font-jetbrains-mono tracking-[0.2em] uppercase max-w-[280px]">
                  Engaging neural shaders and building context session state...
                </span>
              </div>
              <div className="w-48 h-[1px] bg-white/10 relative overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="absolute inset-0 bg-white"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
