import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Share2, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageLightboxProps {
  images: { src: string; title: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  onClose,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  // Defensive check
  if (!images || images.length === 0) return null;

  const image = images[index] || images[0];

  const handleDownload = async () => {
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${image.title.toLowerCase().replace(/ /g, "-")}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: image.title,
          text: `Check out this design: ${image.title}`,
          url: image.src,
        });
      } catch (error) {
        console.error("Share failed", error);
      }
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!image) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-6xl w-full bg-[#050505]/90 rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md border border-white/10"
          >
            <X size={20} />
          </button>

          <div className="relative flex items-center justify-center bg-black/40 overflow-hidden min-h-[75vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x;
                  if (swipe < -100 || velocity.x < -500) {
                    setIndex((prev) => (prev + 1) % images.length);
                  } else if (swipe > 100 || velocity.x > 500) {
                    setIndex(
                      (prev) => (prev - 1 + images.length) % images.length,
                    );
                  }
                }}
                className="w-full flex justify-center cursor-grab active:cursor-grabbing absolute inset-0 items-center p-4"
              >
                <img
                  src={image.src}
                  alt={image.title}
                  className="w-full h-auto max-h-[75vh] object-contain drop-shadow-2xl"
                  style={{ imageRendering: "auto" }}
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-6 p-4 bg-black/50 rounded-full hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-white backdrop-blur-xl border border-white/10 z-10 hidden sm:block"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-6 p-4 bg-black/50 rounded-full hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-white backdrop-blur-xl border border-white/10 z-10 hidden sm:block"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          <div className="p-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-4 text-center">
              {image.title}
            </h2>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-white/40 uppercase tracking-widest">
                {index + 1} / {images.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                >
                  <Share2 size={20} />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
