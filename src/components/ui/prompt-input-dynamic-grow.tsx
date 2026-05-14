import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { Plus, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ChatInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

export default function ChatGPTInput({
  value: externalValue,
  onChange: externalOnChange,
  onKeyDown: externalOnKeyDown,
  placeholder = "Specify design parameters or upload blueprints...",
  onSubmit = () => {},
  disabled = false,
  isLoading = false,
  inputRef,
  className
}: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const value = externalValue !== undefined ? externalValue : internalValue;
  
  const setValue = useCallback((val: string) => {
    if (externalValue === undefined) {
      setInternalValue(val);
    }
  }, [externalValue]);

  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRefCombined = inputRef || internalTextareaRef;
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (textareaRefCombined.current) {
      textareaRefCombined.current.style.height = "auto";
      const scrollHeight = textareaRefCombined.current.scrollHeight;
      const maxHeight = 200;
      textareaRefCombined.current.style.height = Math.min(scrollHeight, maxHeight) + "px";
    }
  }, [value, textareaRefCombined]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onSubmit(value.trim());
      if (externalValue === undefined) {
        setInternalValue("");
      }
    }
  }, [value, onSubmit, disabled, isLoading, externalValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (externalOnKeyDown) {
      externalOnKeyDown(e);
    }
    if (e.key === "Enter" && !e.shiftKey && !e.defaultPrevented) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, externalOnKeyDown]);

  const isSubmitDisabled = disabled || !value.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative mx-auto w-full max-w-3xl flex items-center justify-center pt-4 pb-8", // added padding bottom to ensure it clears footer
        className
      )}
    >
      <motion.div
        layout
        initial={{ borderRadius: 16 }}
        className="relative group w-full flex items-end justify-center"
      >
        {/* Animated Glowing Backgrounds based on the SearchComponent logic, adjusted for white glow */}
        
        {/* Layer 1 */}
        <div className="absolute z-[-1] overflow-hidden inset-0 rounded-[16px] blur-[3px] 
            before:absolute before:content-[''] before:z-[-2] before:w-[200%] before:h-[200%] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-60
            before:bg-[conic-gradient(#000,rgba(255,255,255,0.1)_5%,#000_38%,#000_50%,rgba(255,255,255,0.2)_60%,#000_87%)] before:transition-all before:duration-2000
            group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
        </div>

        {/* Layer 2 */}
        <div className="absolute z-[-1] overflow-hidden inset-0 rounded-[16px] blur-[4px] 
            before:absolute before:content-[''] before:z-[-2] before:w-[200%] before:h-[200%] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
            before:bg-[conic-gradient(rgba(0,0,0,0),rgba(255,255,255,0.3),rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,rgba(255,255,255,0.4),rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
            group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>

        {/* Core Input Container */}
        <div 
          className={cn(
            "relative flex w-full bg-black/40 backdrop-blur-2xl border transition-colors duration-300 rounded-[16px] overflow-hidden",
            isFocused ? "border-white/30" : "border-white/10"
          )}
        >
          <div className="flex items-end relative z-20 w-full min-h-[44px]">
            
            {/* Attachment Button */}
            <button
              type="button"
              className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-transparent hover:bg-white/10 text-white/40 hover:text-white transition-all mx-1 mb-[2px]"
            >
              <Plus strokeWidth={1.5} size={20} />
            </button>
            
            {/* Textarea */}
            <div className="flex-1 relative flex flex-col justify-center min-h-[44px] py-[13px] ml-1">
              <textarea
                ref={textareaRefCombined}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (externalOnChange) externalOnChange(e);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                rows={1}
                className="w-full bg-transparent text-[14px] font-medium text-white placeholder-neutral-500 border-0 outline-none resize-none overflow-y-auto leading-relaxed hide-scrollbar"
                disabled={disabled || isLoading}
              />
            </div>

            {/* Hint & Send Button */}
            <div className="flex items-center shrink-0 pr-2 pl-2 mb-[6px] relative">
               <span className="absolute right-10 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-jetbrains-mono text-white/30 pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-100 hidden sm:block">
                  Cmd + K or Enter to Submit
               </span>
              <button
                type="submit"
                disabled={isSubmitDisabled || isLoading}
                className={cn(
                  "h-8 px-4 flex items-center justify-center rounded-lg transition-all duration-300 border-none font-semibold text-xs tracking-wide",
                  (isSubmitDisabled || isLoading)
                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                    : "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                )}
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Submit
              </button>
            </div>
            
          </div>
        </div>
      </motion.div>
    </form>
  );
}
