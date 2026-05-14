import React, { forwardRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface ComponentProps {
  label?: string;
  onClick?(): void;
  className?: string;
  children?: React.ReactNode;
}

export const GlowButton = forwardRef<HTMLButtonElement, ComponentProps>(
  ({ label = "Generate", onClick, className, children }, ref) => {
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = () => {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 200);
      onClick?.();
    };

    return (
      <motion.button
        ref={ref}
        type="button"
        aria-label={label}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn("glow-btn", className)}
        onClick={handleClick}
        data-state={isClicked ? "clicked" : undefined}
      >
        <motion.span 
          className="flex items-center justify-center gap-1.5"
          initial={false}
          animate={{ scale: isClicked ? 0.9 : 1 }}
        >
          {children || label}
          <Sparkles size={16} className="ml-0.5" />
        </motion.span>
      </motion.button>
    );
  }
);

GlowButton.displayName = "GlowButton";
