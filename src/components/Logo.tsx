import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

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
    // `shrink-0` on the wrapper: inside the workspace header's flex row the
    // lockup was being squeezed until the tagline wrapped onto a second line.
    <div className={cn("flex items-center gap-3 flex-row shrink-0", className)}>
      <div className="relative group flex items-center justify-center shrink-0">
        {!transparent && (
          <div className="absolute -inset-2 bg-gradient-to-r from-white/20 to-white/0 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-1000" />
        )}
        <div
          className={cn(
            "relative rounded-2xl flex items-center justify-center transition-all duration-500",
            transparent
              ? "bg-transparent border-none shadow-none"
              : "bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-xl group-hover:border-white/20",
          )}
          style={{ height: iconSize * 4 + 16, width: iconSize * 4 + 16 }}
        >
          {/* Tailwind can't generate `w-${iconSize}` — the class name only
              exists at runtime — so the icon is sized inline. */}
          <Bot
            style={{ width: iconSize * 4, height: iconSize * 4 }}
            className="text-white transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <h1
          className={cn(
            "font-sans font-semibold tracking-tighter text-white leading-none whitespace-nowrap",
            textSize,
          )}
        >
          Arch Agent
        </h1>
        <div className="flex items-center gap-2 mt-1 px-0.5">
          <div className="w-1.5 h-[1.5px] shrink-0 bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <span className="text-[8px] font-mono tracking-[0.35em] text-emerald-500/80 uppercase font-bold antialiased whitespace-nowrap">
            Autonomous AI
          </span>
        </div>
      </div>
    </div>
  );
}
