import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Phone, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactDialog({ isOpen, onClose }: ContactDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg glass-dark rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl"
          >
            <div className="p-10">
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">Contact Us</h2>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Get in touch with our team</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="h-12 w-12 rounded-2xl hover:bg-white/10 text-white/40 hover:text-white bg-white/5"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all duration-500">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Email Address</p>
                    <p className="text-lg font-bold">support@archagent.ai</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all duration-500">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Phone Number</p>
                    <p className="text-lg font-bold">+91 99999 99999</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all duration-500">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Headquarters</p>
                    <p className="text-lg font-bold">Bangalore, Karnataka, India</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/40">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Global Operations</span>
                </div>
                <Button 
                  className="bg-white text-black hover:bg-white/90 rounded-xl font-bold px-8"
                  onClick={() => window.open('https://maps.google.com/?q=Bangalore,+Karnataka,+India', '_blank', 'noopener,noreferrer')}
                >
                  Open Maps
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
