import React from 'react';
import { cn } from "@/lib/utils";

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const HoverAnimationButton: React.FC<ButtonProps> = ({ children, onClick, className }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group inline-flex items-center justify-center overflow-hidden rounded-2xl px-12 py-4 font-bold text-white transition-all hover:scale-105 active:scale-95 bg-zinc-900 border border-white/10",
        className
      )}
    >
      <div className="relative z-10 h-full w-full overflow-hidden">
        <div className="flex flex-col h-full w-full transition-transform duration-500 ease-[0.16,1,0.3,1] group-hover:-translate-y-full">
          <div className="flex h-full w-full shrink-0 items-center justify-center">
            {children}
          </div>
          <div className="flex h-full w-full shrink-0 items-center justify-center">
            {children}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </button>
  );
}

export default HoverAnimationButton;
