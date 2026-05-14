import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Loader Component - Animated SVG Path Loader
// ---------------------------------------------------------------------------

let cachedPathLength = 0;
let stylesInjected = false;

const LOADER_KEYFRAMES = `
  @keyframes drawStroke {
    0% {
      stroke-dashoffset: var(--path-length);
      animation-timing-function: ease-in-out;
    }
    50% {
      stroke-dashoffset: 0;
      animation-timing-function: ease-in-out;
    }
    100% {
      stroke-dashoffset: calc(var(--path-length) * -1);
    }
  }
`;

interface LoaderProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

const Loader = React.forwardRef<SVGSVGElement, LoaderProps>(
  ({ className, size = 64, strokeWidth = 2, ...props }, ref) => {
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState<number>(cachedPathLength);

    useEffect(() => {
      if (typeof window !== 'undefined' && !stylesInjected) {
        stylesInjected = true;
        const style = document.createElement('style');
        style.innerHTML = LOADER_KEYFRAMES;
        document.head.appendChild(style);
      }

      if (!cachedPathLength && pathRef.current) {
        cachedPathLength = pathRef.current.getTotalLength();
        setPathLength(cachedPathLength);
      }
    }, []);

    const isReady = pathLength > 0;

    return (
      <svg
        ref={ref}
        role="status"
        aria-label="Loading..."
        viewBox="0 0 19 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className={cn("text-current", className)}
        {...props}
      >
        <path
          ref={pathRef}
          d="M4.43431 2.42415C-0.789139 6.90104 1.21472 15.2022 8.434 15.9242C15.5762 16.6384 18.8649 9.23035 15.9332 4.5183C14.1316 1.62255 8.43695 0.0528911 7.51841 3.33733C6.48107 7.04659 15.2699 15.0195 17.4343 16.9241"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={isReady ? {
            strokeDasharray: pathLength,
            '--path-length': pathLength,
          } as React.CSSProperties : undefined}
          className={cn(
            "transition-opacity duration-300",
            isReady ? "opacity-100 animate-[drawStroke_2.5s_infinite]" : "opacity-0"
          )}
        />
      </svg>
    );
  }
);

Loader.displayName = "Loader";

// ---------------------------------------------------------------------------
// Loading Breadcrumb Component - Animated Loading State with Shimmer Text
// ---------------------------------------------------------------------------

const GENERATION_PHASES = [
  "Analyzing Spatial Constraints...",
  "Synthesizing Geometry...",
  "Applying Material Textures...",
  "Finalizing Photorealistic Render..."
];

interface LoadingBreadcrumbProps {
  status?: string;
  className?: string;
}

export function LoadingBreadcrumb({ 
  status, 
  className 
}: LoadingBreadcrumbProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (status) return; // If status is provided, don't cycle.
    
    // Cycle every 3.5 seconds
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % GENERATION_PHASES.length);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [status]);

  const displayText = status || GENERATION_PHASES[phaseIndex];

  return (
    <>
      <style>{`
        @keyframes textShimmer {
          0% { 
            background-position: -200% center;
          }
          100% { 
            background-position: 200% center;
          }
        }
        
        .shimmer-text {
          background-image: linear-gradient(
            90deg,
            #a1a1aa 0%,
            #a1a1aa 40%,
            #ffffff 50%,
            #a1a1aa 60%,
            #a1a1aa 100%
          );
        }
      `}</style>
      
      <div className={cn(
        "flex items-center justify-center pointer-events-none",
        className
      )}>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <Loader 
            size={22} 
            strokeWidth={2.5} 
            className="text-zinc-300" 
          />
          
          <span 
            className="bg-clip-text text-transparent shimmer-text font-jetbrains-mono text-sm tracking-wide"
            style={{
              backgroundSize: "200% auto",
              animation: "textShimmer 3s ease-in-out infinite"
            }}
          >
            {displayText}
          </span>
        </div>
      </div>
    </>
  );
}
