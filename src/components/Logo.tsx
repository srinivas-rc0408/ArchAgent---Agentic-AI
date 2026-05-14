import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  transparent?: boolean;
}

export function Logo({
  className,
  iconSize = 8,
  textSize = "text-2xl",
  transparent = false,
}: LogoProps) {
  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-3 flex-row",
        className,
      )}
    >
      <motion.div
        layout
        className="relative group flex items-center justify-center shrink-0"
      >
        {!transparent && (
          <div className="absolute -inset-2 bg-gradient-to-r from-white/20 to-white/0 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-1000" />
        )}
        <div
          className={cn(
            "relative h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
            transparent
              ? "bg-transparent border-none shadow-none"
              : "bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-xl group-hover:border-white/20",
          )}
        >
          <Bot
            className={cn(
              "text-white transition-transform duration-500 group-hover:scale-110",
              `w-${iconSize} h-${iconSize}`,
            )}
          />
        </div>
      </motion.div>
      <motion.div layout className="flex flex-col">
        <motion.h1
          layout
          className={cn(
            "font-sans font-semibold tracking-tighter text-white leading-none whitespace-nowrap",
            textSize,
          )}
        >
          Arch Agent
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-1 px-0.5"
        >
          <div className="w-1.5 h-[1.5px] bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <span className="text-[8px] font-mono tracking-[0.4em] text-emerald-500/80 uppercase font-bold antialiased">
            Autonomous AI
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
