import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Logo } from "../Logo";
import { Github, Linkedin, Facebook, Instagram } from "lucide-react";

interface FooterSectionProps {
  onAboutClick?: () => void;
}

const SOCIAL_LINKS = [
  { name: "Instagram", url: "https://instagram.com/archagent", icon: Instagram },
  { name: "Facebook", url: "https://facebook.com/archagent", icon: Facebook },
  { name: "LinkedIn", url: "https://linkedin.com/company/archagent", icon: Linkedin },
  { name: "GitHub", url: "https://github.com/archagent", icon: Github },
];

export function FooterSection({ onAboutClick }: FooterSectionProps) {
  const [activeService, setActiveService] = React.useState<{name: string, url: string} | null>(null);

  const handleSocialClick = (e: React.MouseEvent, service: {name: string, url: string}) => {
    e.preventDefault();
    setActiveService(service);
  };

  const handleProceed = () => {
    if (activeService) {
      window.open(activeService.url, "_blank", "noopener,noreferrer");
      setActiveService(null);
    }
  };

  return (
    <>
      <footer className="relative w-full bg-[#050505]/20 backdrop-blur-2xl overflow-hidden font-sans border-t border-white/5 py-20 px-6">
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center justify-center gap-12 text-center">
          
          {/* Brand / Logo */}
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="flex flex-col items-center justify-center gap-4"
          >
            <Logo iconSize={10} textSize="text-2xl" />
          </motion.div>

          {/* Links */}
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }} 
             className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6"
          >
            <a href="#features" className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-medium transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Features</a>
            <button onClick={onAboutClick} className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-medium transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">About Us</button>
            <a href="mailto:support@archagent.ai" className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-medium transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Contact Us</a>
            <a href="#" className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-medium transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Privacy</a>
          </motion.div>

          <div className="flex flex-col items-center gap-8 mt-8">
            {/* Social Icons Row */}
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
               className="flex items-center gap-6"
            >
              {SOCIAL_LINKS.map((service) => (
                <button
                  key={service.name}
                  onClick={(e) => handleSocialClick(e, service)}
                  className="text-[#FFFFFF]/40 transition-all duration-300 hover:text-[#FFFFFF] hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] focus:outline-none focus:ring-0"
                  aria-label={`Visit our ${service.name}`}
                >
                  <service.icon strokeWidth={1} className="w-5 h-5" />
                </button>
              ))}
            </motion.div>

            {/* Copyright */}
            <motion.div
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} 
            >
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest">
                © {new Date().getFullYear()} Arch Agent. All rights reserved.
              </p>
            </motion.div>
          </div>

        </div>
      </footer>

      {/* External Redirect Confirmation Modal */}
      <AnimatePresence>
        {activeService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-sm bg-[#050505]/80 backdrop-blur-2xl border border-[#FFFFFF]/10 p-8 rounded-2xl flex flex-col gap-6 font-sans shadow-2xl"
            >
              <div className="flex flex-col gap-3">
                <h3 className="text-[#FFFFFF]/50 text-[10px] uppercase tracking-[0.25em] font-mono leading-tight">
                  External Redirection
                </h3>
                <p className="text-[#FFFFFF]/90 text-[15px] leading-relaxed">
                  You are about to leave Arch Agent to visit <span className="text-[#FFFFFF] font-medium">{activeService.name}</span>. Would you like to continue to the official login page?
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveService(null)}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-[#FFFFFF] bg-transparent border border-[#FFFFFF]/10 hover:bg-[#FFFFFF]/5 transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceed}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-[#050505] bg-[#FFFFFF] hover:bg-[#FFFFFF]/90 transition-colors focus:outline-none shadow-sm"
                >
                  Proceed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

