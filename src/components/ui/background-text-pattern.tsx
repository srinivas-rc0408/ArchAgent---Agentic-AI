import React from 'react';
import { cn } from '@/lib/utils';

interface BackgroundTextPatternProps {
  text: string;
  className?: string;
}

export function BackgroundTextPattern({ text, className }: BackgroundTextPatternProps) {
  // Create a grid of the text
  const rows = Array.from({ length: 8 }, (_, i) => i);
  const cols = Array.from({ length: 4 }, (_, i) => i);

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] select-none z-0 flex flex-col justify-around py-10", className)}>
      {rows.map((row) => (
        <div key={row} className={cn("flex justify-around whitespace-nowrap", row % 2 === 0 ? "translate-x-12" : "-translate-x-12")}>
          {cols.map((col) => (
            <span key={col} className="text-[8vw] font-black uppercase tracking-tighter leading-none">
              {text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function RandomTextPattern({ className }: { className?: string }) {
  const patterns = [
    "ARCHITECTURAL VISION",
    "STRUCTURAL INTEGRITY",
    "DESIGN INNOVATION",
    "SPATIAL DYNAMICS",
    "AESTHETIC PRECISION",
    "ENVIRONMENTAL FLOW"
  ];
  const randomText = patterns[Math.floor(Math.random() * patterns.length)];
  
  return <BackgroundTextPattern text={randomText} className={className} />;
}
