import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Send, X, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getSupportStream } from "@/lib/gemini";

interface Message {
  role: "user" | "bot";
  text: string;
}

export interface SupportChatRef {
  openChat: (initialMessage?: string) => void;
}

export default forwardRef<SupportChatRef, {}>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi there! I'm your Arch Agent support assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    openChat: (initialMessage?: string) => {
      setIsOpen(true);
      if (initialMessage) {
        setMessages(prev => [...prev, { role: "bot", text: initialMessage }]);
      }
    }
  }));

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isReceiving]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isReceiving) return;

    const userText = input;
    const userMsg = { role: "user" as const, text: userText };
    setInput("");
    
    setMessages(prev => {
      const newMessages = [...prev, userMsg];
      startStream(newMessages);
      return newMessages;
    });
  };

  const startStream = async (chatHistory: Message[]) => {
    setIsLoading(true);
    setIsReceiving(true);
    let fullText = "";

    try {
      // Add a temporary bot message
      setMessages(prev => [...prev, { role: "bot", text: "" }]);
      
      // Filter out the initial greeting to ensure history starts with user
      const apiHistory = chatHistory.filter((msg, index) => !(index === 0 && msg.role === "bot"));
      const stream = await getSupportStream(apiHistory);
      
      setIsLoading(false); // Stream started flowing

      for await (const chunk of stream) {
        fullText += chunk.text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "bot", text: fullText };
          return updated;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "bot", text: "I encountered a communication error with our servers. Please try again." };
        return updated;
      });
    } finally {
      setIsLoading(false);
      setIsReceiving(false);
    }
  };

  return (
    <>
      {/* Floating Shortcut Icon */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-[100] h-12 w-12 rounded-full bg-white/10 text-white shadow-2xl flex items-center justify-center border border-white/20 group overflow-hidden backdrop-blur-md transition-all duration-300 hover:bg-white/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <MessageSquare className="h-5 w-5 relative z-10" />
        <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-black animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-28 right-8 z-[100] w-[400px] h-[550px] bg-black/60 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/10 relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Arch Agent Support Desk</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                    <p className="text-[9px] text-green-400 uppercase tracking-[0.2em] font-bold">Systems Nominal</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 relative z-10 scrollbar-thin flex flex-col" ref={scrollRef} data-lenis-prevent>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row",
                      msg.text === "" && !isLoading ? "hidden" : ""
                    )}
                  >
                    <Avatar className={cn("h-8 w-8 border shrink-0", msg.role === "user" ? "bg-white text-black border-white/20" : "bg-white/10 border-white/10")}>
                      <AvatarFallback className="text-[10px] font-bold">{msg.role === "user" ? "U" : "A"}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "p-4 rounded-3xl text-sm leading-relaxed max-w-[85%] shadow-md whitespace-pre-wrap",
                      msg.role === "user" 
                        ? "bg-white text-black font-semibold rounded-tr-md" 
                        : "bg-white/5 border border-white/5 text-zinc-300 rounded-tl-md"
                    )}>
                      {msg.role === "bot" && msg.text === "" && isLoading ? (
                        <div className="flex items-center gap-2 text-zinc-400 italic">
                          <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                          <span className="animate-pulse">Diagnosing...</span>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-black/40 relative z-10 shrink-0">
              <div className="relative flex items-center">
                <Input
                  placeholder="Type your problem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={isLoading || isReceiving}
                  className="bg-white/5 border-white/10 h-14 rounded-2xl focus-visible:ring-white/20 text-sm px-5 pr-14 text-white placeholder:text-white/30 w-full"
                />
                <Button 
                  size="icon" 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isReceiving}
                  className="absolute right-1.5 h-10 w-10 bg-white text-black hover:bg-white/90 rounded-xl transition-all disabled:opacity-50"
                >
                  {isLoading || isReceiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
