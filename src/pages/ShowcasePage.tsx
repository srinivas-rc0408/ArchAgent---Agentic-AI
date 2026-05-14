import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  DoorOpen,
  Layout,
  Grid,
  Monitor,
  Sparkles,
  Maximize,
  Bot,
  Loader2,
  IndianRupee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Logo } from "@/components/Logo";
import { useLoading } from "@/lib/LoadingContext";

const TEMPLATE_DATA: Record<string, string[]> = {
  door: [
    "/showcase/showcase/Door Designs/media__1777204284945.png",
    "/showcase/showcase/Door Designs/media__1777204297371.png",
    "/showcase/showcase/Door Designs/media__1777204314283.png",
    "/showcase/showcase/Door Designs/media__1777204332397.png",
    "/showcase/showcase/Door Designs/media__1777204624525.png",
    "/showcase/showcase/Door Designs/media__1777204644207.png",
    "/showcase/showcase/Door Designs/media__1777204656328.png",
    "/showcase/showcase/Door Designs/media__1777204691002.png",
    "/showcase/showcase/Door Designs/media__1777204709522.png",
    "/showcase/showcase/Door Designs/media__1777204850604.png",
    "/showcase/showcase/Door Designs/media__1777204880571.png",
    "/showcase/showcase/Door Designs/media__1777204904599.png",
    "/showcase/showcase/Door Designs/media__1777204920633.png",
    "/showcase/showcase/Door Designs/media__1777204959146.png",
    "/showcase/showcase/Door Designs/media__1777204332397.png",
  ],
  ceiling: [
    "/showcase/showcase/ceiling designs/media__1777207090837.png",
    "/showcase/showcase/ceiling designs/media__1777207122136.png",
    "/showcase/showcase/ceiling designs/media__1777208062982.png",
    "/showcase/showcase/ceiling designs/media__1777208103410.png",
    "/showcase/showcase/ceiling designs/media__1777208178209.png",
    "/showcase/showcase/ceiling designs/media__1777208196060.png",
    "/showcase/showcase/ceiling designs/media__1777208212884.png",
    "/showcase/showcase/ceiling designs/media__1777208224542.png",
    "/showcase/showcase/ceiling designs/media__1777208236334.png",
    "/showcase/showcase/ceiling designs/media__1777208334162.png",
    "/showcase/showcase/ceiling designs/media__1777208359980.png",
    "/showcase/showcase/ceiling designs/media__1777208378949.png",
    "/showcase/showcase/ceiling designs/media__1777208419642.png",
    "/showcase/showcase/ceiling designs/media__1777208433041.png",
    "/showcase/showcase/ceiling designs/media__1777207075949.png",
  ],
  wall: [
    "/showcase/showcase/wall designs/media__1777208593137.png",
    "/showcase/showcase/wall designs/media__1777208603581.png",
    "/showcase/showcase/wall designs/media__1777208622166.png",
    "/showcase/showcase/wall designs/media__1777208636243.png",
    "/showcase/showcase/wall designs/media__1777208654516.png",
    "/showcase/showcase/wall designs/media__1777208662938.png",
    "/showcase/showcase/wall designs/media__1777208671399.png",
    "/showcase/showcase/wall designs/media__1777208720028.png",
    "/showcase/showcase/wall designs/media__1777208734518.png",
    "/showcase/showcase/wall designs/media__1777208755324.png",
    "/showcase/showcase/wall designs/media__1777208773916.png",
    "/showcase/showcase/wall designs/media__1777208782662.png",
    "/showcase/showcase/wall designs/media__1777208805886.png",
    "/showcase/showcase/wall designs/media__1777208829791.png",
    "/showcase/showcase/wall designs/media__1777208583860.png",
  ],
  tv: [
    "/showcase/showcase/tv showcase/media__1777208970599.png",
    "/showcase/showcase/tv showcase/media__1777208978942.png",
    "/showcase/showcase/tv showcase/media__1777208986150.png",
    "/showcase/showcase/tv showcase/media__1777208994459.png",
    "/showcase/showcase/tv showcase/media__1777209106718.png",
    "/showcase/showcase/tv showcase/media__1777209119502.png",
    "/showcase/showcase/tv showcase/media__1777209125962.png",
    "/showcase/showcase/tv showcase/media__1777209135609.png",
    "/showcase/showcase/tv showcase/media__1777209154243.png",
    "/showcase/showcase/tv showcase/media__1777209205773.png",
    "/showcase/showcase/tv showcase/media__1777209212260.png",
    "/showcase/showcase/tv showcase/media__1777209223647.png",
    "/showcase/showcase/tv showcase/media__1777209234931.png",
    "/showcase/showcase/tv showcase/media__1777209247725.png",
    "/showcase/showcase/tv showcase/media__1777208963667.png",
  ],
  window: [
    "/showcase/showcase/window designs/media__1777210966555.png",
    "/showcase/showcase/window designs/media__1777211063050.png",
    "/showcase/showcase/window designs/media__1777211079718.png",
    "/showcase/showcase/window designs/media__1777211091750.png",
    "/showcase/showcase/window designs/media__1777211114700.png",
    "/showcase/showcase/window designs/media__1777211123949.png",
    "/showcase/showcase/window designs/media__1777211194514.png",
    "/showcase/showcase/window designs/media__1777211206604.png",
    "/showcase/showcase/window designs/media__1777211215828.png",
    "/showcase/showcase/window designs/media__1777211243055.png",
    "/showcase/showcase/window designs/media__1777210937359.png",
    "/showcase/showcase/window designs/media__1777210948288.png",
    "/showcase/showcase/window designs/media__1777210957202.png",
  ],
};

const TEMPLATE_CATEGORIES = [
  { id: "door", name: "Door Designs", icon: DoorOpen },
  { id: "ceiling", name: "Ceiling Designs", icon: Layout },
  { id: "wall", name: "Wall Designs", icon: Grid },
  { id: "tv", name: "TV Showcase", icon: Monitor },
  { id: "window", name: "Window Designs", icon: Maximize },
];

export default function ShowcasePage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("door");
  const [selectedImages, setSelectedImages] = useState<{
    images: { src: string; title: string }[];
    index: number;
  } | null>(null);
  const { isSyncing, startSyncSequence } = useLoading();
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const handleBack = () => {
    startSyncSequence("/");
  };

  const galleryImages = (TEMPLATE_DATA[activeCategory] || []).map((url, i) => ({
    src: url,
    id: `${activeCategory}-${i}`,
    title: `${TEMPLATE_CATEGORIES.find((c) => c.id === activeCategory)?.name || "Design"} #${i + 1}`,
  }));

  const [isEstimating, setIsEstimating] = useState<string | null>(null);

  const handleEstimate = (e: React.MouseEvent, img: { src: string, title: string, id: string }) => {
    e.stopPropagation();
    
    // Auth Guard Sequence
    const token = localStorage.getItem("auth_token") || localStorage.getItem("sb-pbeclmupvofxghoxtisq-auth-token");
    if (!token) {
      // Store intent and redirect
      localStorage.setItem("pending_estimation", JSON.stringify({
        prompt: img.title,
        templateId: img.id
      }));
      startSyncSequence("/login");
      return;
    }

    // Direct triggering sequence
    startSyncSequence("/orchestration", { 
      state: { 
        autoTrigger: "estimate", 
        prompt: img.title,
        templateId: img.id
      } 
    });
  };

  useEffect(() => {
    // Clear any lingering pending actions to prevent loops
    const pendingEstimation = localStorage.getItem("pending_estimation");
    if (pendingEstimation && localStorage.getItem("auth_token")) {
       // Handled by LoginPage or initial mount
    }
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-screen w-full bg-transparent text-white overflow-x-hidden"
    >
      <header className="fixed top-0 left-0 right-0 z-50 flex h-24 items-center justify-between px-8 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-12 w-12 rounded-full border border-white/5 bg-black/40 backdrop-blur-xl hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Logo />
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-36 pb-16">
        <div className="flex flex-col mb-12 gap-6">
          <h2 className="text-6xl font-black tracking-tighter text-white">
            Showcase
          </h2>
          <div className="flex gap-1 border-b border-white/10 pb-2 overflow-x-auto hide-scrollbar w-full">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-all whitespace-nowrap overflow-hidden flex items-center gap-2",
                  activeCategory === cat.id
                    ? "text-white"
                    : "text-zinc-500 hover:text-white/80",
                )}
              >
                <cat.icon className="h-4 w-4 shrink-0" />
                {cat.name}
                {activeCategory === cat.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {galleryImages.map((img, i) => (
            <motion.div
              key={activeCategory + img.src + i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer bg-black backdrop-blur-md border border-white/5 shadow-2xl will-change-transform transform-gpu"
              onClick={() =>
                setSelectedImages({ images: galleryImages, index: i })
              }
            >
              {/* Skeleton/Placeholder */}
              <div
                className={cn(
                  "absolute inset-0 bg-[#0A0A0A] animate-pulse transition-opacity duration-700",
                  loadedImages[img.src] ? "opacity-0" : "opacity-100",
                )}
              />
              <img
                src={img.src}
                alt={img.title}
                loading="eager"
                decoding="async"
                style={{ imageRendering: "auto" }}
                onLoad={() =>
                  setLoadedImages((prev) => ({ ...prev, [img.src]: true }))
                }
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out will-change-transform transform-gpu group-hover:scale-105",
                  loadedImages[img.src]
                    ? "opacity-100 blur-0"
                    : "opacity-0 blur-xl",
                )}
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 border border-white/0 group-hover:border-white/20 transition-colors duration-500 rounded-2xl pointer-events-none z-10" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-[4px] z-20">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => handleEstimate(e, img as any)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-black transition-all rounded-full px-6 flex items-center gap-2"
                >
                  {isEstimating === img.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IndianRupee className="h-4 w-4" />
                  )}
                  <span>Estimate Cost</span>
                </Button>
                <div 
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all"
                  onClick={() => setSelectedImages({ images: galleryImages, index: i })}
                >
                  <Maximize className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-32 flex justify-center pb-24">
          <motion.div
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            className="rounded-full"
          >
            <Button
              onClick={() => {
                startSyncSequence("/orchestration");
              }}
              variant="ghost"
              className="rounded-full px-12 h-14 text-lg bg-white/5 border border-white/20 backdrop-blur-md text-white transition-all active:scale-95 flex flex-row items-center justify-center gap-2 font-medium whitespace-nowrap"
            >
              <Sparkles className="h-5 w-5 shrink-0 stroke-[1]" />
              <span>Request Custom Template</span>
            </Button>
          </motion.div>
        </div>
      </main>

      {selectedImages && (
        <ImageLightbox
          images={selectedImages.images}
          initialIndex={selectedImages.index}
          onClose={() => setSelectedImages(null)}
        />
      )}
    </motion.div>
  );
}
