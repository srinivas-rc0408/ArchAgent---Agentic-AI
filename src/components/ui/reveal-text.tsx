"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface RevealTextProps {
  text?: string;
  textColor?: string;
  overlayColor?: string;
  fontSize?: string;
  letterDelay?: number;
  overlayDelay?: number;
  overlayDuration?: number;
  springDuration?: number;
  letterImages?: string[];
  className?: string;
}

export function RevealText({
  text = "STUNNING",
  textColor = "text-white",
  overlayColor = "text-white/20",
  fontSize = "text-6xl md:text-8xl",
  letterDelay = 0.08,
  overlayDelay = 0.05,
  overlayDuration = 0.4,
  springDuration = 600,
  className,
  letterImages = [
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600585154526-990dcea464dd?q=80&w=1000&auto=format&fit=crop",
  ]
}: RevealTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showRedText, setShowRedText] = useState(false);
  
  useEffect(() => {
    const lastLetterDelay = (text.length - 1) * letterDelay;
    const totalDelay = (lastLetterDelay * 1000) + springDuration;
    
    const timer = setTimeout(() => {
      setShowRedText(true);
    }, totalDelay);
    
    return () => clearTimeout(timer);
  }, [text.length, letterDelay, springDuration]);

  return (
    <div className={`flex items-center justify-center relative ${className}`}>
      <div className="flex flex-wrap justify-center">
        {text.split("").map((letter, index) => (
          <motion.span
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`${fontSize} font-black tracking-tighter cursor-pointer relative overflow-hidden inline-block font-sans`}
            initial={{ 
              scale: 0.8,
              opacity: 0,
              y: 20
            }}
            animate={{ 
              scale: 1,
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: index * letterDelay,
              type: "spring",
              damping: 15,
              stiffness: 150,
              mass: 1,
            }}
          >
            {/* Base text layer */}
            <motion.span 
              className={`absolute inset-0 ${textColor} drop-shadow-2xl`}
              animate={{ 
                opacity: hoveredIndex === index ? 0 : 1 
              }}
              transition={{ duration: 0.2 }}
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
            {/* Image text layer with background panning */}
            <motion.span
              className="text-transparent bg-clip-text bg-cover bg-center bg-no-repeat"
              animate={{ 
                opacity: hoveredIndex === index ? 1 : 0,
                scale: hoveredIndex === index ? 1.1 : 1,
                backgroundPosition: hoveredIndex === index ? "20% center" : "0% center"
              }}
              transition={{ 
                opacity: { duration: 0.2 },
                scale: { duration: 0.4, ease: "easeOut" },
                backgroundPosition: { 
                  duration: 4,
                  ease: "linear"
                }
              }}
              style={{
                backgroundImage: `url('${letterImages[index % letterImages.length]}')`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
            
            {/* Overlay text layer that sweeps across each letter */}
            {showRedText && (
              <motion.span
                className={`absolute inset-0 ${overlayColor} pointer-events-none`}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 1, 1, 0]
                }}
                transition={{
                  delay: index * overlayDelay,
                  duration: overlayDuration,
                  times: [0, 0.1, 0.7, 1],
                  ease: "easeInOut"
                }}
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            )}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
