import React, { useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from "motion/react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  glowColor?: string;
  backgroundColor?: string;
  textColor?: string;
  hoverTextColor?: string;
}

const HoverButton: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  glowColor = '#ffffff',
  backgroundColor = 'rgba(255,255,255,0.05)',
  textColor = '#ffffff',
  hoverTextColor = '#ffffff',
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
    // Also call original onMouseMove if present in props
    (props as any).onMouseMove?.(e);
  };

  return (
    <motion.button
      ref={buttonRef}
      {...(props as any)}
      onMouseMove={handleMouseMove}
      onMouseEnter={(e: any) => { setIsHovered(true); (props as any).onMouseEnter?.(e); }}
      onMouseLeave={(e: any) => { setIsHovered(false); (props as any).onMouseLeave?.(e); }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative inline-block overflow-hidden transition-colors duration-500 
        rounded-2xl z-10 font-sans border border-white/10
        ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        backgroundColor: backgroundColor,
        color: isHovered ? hoverTextColor : textColor,
      }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          left: smoothX,
          top: smoothY,
          background: `radial-gradient(circle, ${glowColor}15 0%, ${glowColor}05 40%, transparent 70%)`,
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.5,
          zIndex: 0,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      
      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

export { HoverButton }
