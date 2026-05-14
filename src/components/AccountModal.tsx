import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, Settings, Shield, Award, HardDrive, Monitor, Moon, Sun, MonitorSmartphone, Camera, ChevronDown, Check, Mail, Building, Ruler, Image as ImageIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface UserData {
  name?: string;
  email: string;
  isPremium?: boolean;
}

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "profile" | "settings" | "about";
  user?: UserData;
}

export function AccountModal({ isOpen, onClose, defaultTab = "profile", user }: AccountModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "about">(defaultTab);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [renderStyle, setRenderStyle] = useState<"photorealistic" | "wireframe" | "sketch">("photorealistic");

  // Dynamic user data
  const initialEmail = user?.email || "user@example.com";
  // The global state email given is srinivasrc0408@gmail.com
  const initialName = user?.name || initialEmail.split("@")[0] || "Srinivas";
  const isPremium = user?.isPremium || false;

  // Form State
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [firmName, setFirmName] = useState("Srinivas Architects");

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      document.body.style.overflow = "hidden";
      // Reset form states when opened with new user prop
      setName(initialName);
      setEmail(initialEmail);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [defaultTab, isOpen, initialName, initialEmail]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#050505]/80 backdrop-blur-2xl transition-all"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#161618]/80 backdrop-blur-md shadow-2xl flex flex-col md:flex-row h-[90vh] max-h-[900px]"
          >
            {/* Sidebar */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/20 p-6 flex flex-col">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white tracking-tight">Account</h2>
                <p className="text-sm text-white/50 mt-1">Manage your identity and preferences.</p>
              </div>
              
              <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-thin">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                    activeTab === "profile" 
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5" 
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <User className="w-4 h-4" />
                  <span className="font-medium text-sm">Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                    activeTab === "settings" 
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5" 
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-medium text-sm">Settings</span>
                </button>
                <button
                  onClick={() => setActiveTab("about")}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                    activeTab === "about" 
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5" 
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Info className="w-4 h-4" />
                  <span className="font-medium text-sm">About Us</span>
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 scrollbar-thin pb-24 h-full">
                <AnimatePresence mode="wait">
                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-10 max-w-2xl"
                  >
                    <div>
                      <h3 className="text-2xl font-semibold text-white tracking-tight">Profile Details</h3>
                      <p className="text-white/50 mt-1 text-sm">Update your personal and firm information.</p>
                    </div>

                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                      <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center relative z-10 transition-transform group-hover:scale-105">
                          <User className="w-10 h-10 text-white/30" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-white/10 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-medium text-white">{name}</h4>
                          {isPremium && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide uppercase">
                              <Award className="w-3 h-3" />
                              Premium User
                            </span>
                          )}
                        </div>
                        <p className="text-white/50 text-sm">Upload a professional headshot or firm logo.</p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70 flex items-center gap-2 uppercase tracking-widest font-sans">
                          <User className="w-4 h-4 text-white/40" />
                          Full Name
                        </label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 border-b-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-b-white/50 transition-all font-sans"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70 flex items-center gap-2 uppercase tracking-widest font-sans">
                          <Mail className="w-4 h-4 text-white/40" />
                          Professional Email
                        </label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 border-b-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-b-white/50 transition-all font-sans"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/70 flex items-center gap-2 uppercase tracking-widest font-sans">
                          <Building className="w-4 h-4 text-white/40" />
                          Firm/Company Name
                        </label>
                        <input 
                          type="text" 
                          value={firmName}
                          onChange={(e) => setFirmName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 border-b-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-b-white/50 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Stats Card */}
                    <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center gap-6 mt-8">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                        <HardDrive className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-white/70 mb-1">AI Renders Used</h5>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-semibold text-white font-geist-mono">45/100</span>
                          <span className="text-xs text-white/40 font-geist-mono pb-1">recharging in 12d</span>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <h5 className="text-sm font-medium text-white/70 mb-1">Current Plan</h5>
                        <span className="text-sm text-white font-medium">Architect Pro</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "settings" && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-10 max-w-2xl"
                  >
                    <div>
                      <h3 className="text-2xl font-semibold text-white tracking-tight">App Preferences</h3>
                      <p className="text-white/50 mt-1 text-sm">Customize your generation environment and defaults.</p>
                    </div>

                    {/* Architectural Preferences */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-semibold tracking-widest uppercase text-white/40 mb-4 border-b border-white/10 pb-2">Generation Defaults</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-white/70 flex items-center gap-2 uppercase tracking-widest font-sans">
                            <Ruler className="w-4 h-4 text-white/40" />
                            Default Unit System
                          </label>
                          <div className="relative">
                            <select 
                              value={unit} 
                              onChange={(e) => setUnit(e.target.value as any)}
                              className="w-full bg-white/5 border border-white/10 border-b-white/20 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-b-white/50 transition-all cursor-pointer font-geist-mono text-sm"
                            >
                              <option value="metric" className="bg-[#050505]">Metric (m, cm)</option>
                              <option value="imperial" className="bg-[#050505]">Imperial (ft, in)</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-white/50 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-white/70 flex items-center gap-2 uppercase tracking-widest font-sans">
                            <ImageIcon className="w-4 h-4 text-white/40" />
                            Default Render Style
                          </label>
                          <div className="relative">
                            <select 
                              value={renderStyle} 
                              onChange={(e) => setRenderStyle(e.target.value as any)}
                              className="w-full bg-white/5 border border-white/10 border-b-white/20 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-b-white/50 transition-all cursor-pointer font-sans text-sm"
                            >
                              <option value="photorealistic" className="bg-[#050505]">Photorealistic</option>
                              <option value="wireframe" className="bg-[#050505]">Wireframe</option>
                              <option value="sketch" className="bg-[#050505]">Conceptual Sketch</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-white/50 absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Theme Toggle */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold tracking-widest uppercase text-white/40 mb-4 border-b border-white/10 pb-2">Appearance</h4>
                      <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={() => setTheme("dark")}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300",
                            theme === "dark" 
                              ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                              : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <Moon className="w-4 h-4" />
                          <span className="text-sm font-medium">Dark Mode</span>
                        </button>
                        <button 
                          onClick={() => setTheme("light")}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300",
                            theme === "light" 
                              ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                              : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <Sun className="w-4 h-4" />
                          <span className="text-sm font-medium">Light Mode</span>
                        </button>
                        <button 
                          onClick={() => setTheme("system")}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300",
                            theme === "system" 
                              ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                              : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <MonitorSmartphone className="w-4 h-4" />
                          <span className="text-sm font-medium">System Spec</span>
                        </button>
                      </div>
                    </div>

                    {/* Security */}
                     <div className="space-y-6">
                      <h4 className="text-sm font-semibold tracking-widest uppercase text-white/40 mb-4 border-b border-white/10 pb-2">Security</h4>
                      <div className="space-y-4">
                        <Button variant="tertiary" className="w-full sm:w-auto h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white gap-2">
                          <Shield className="w-4 h-4 text-white/50" />
                          Change Password
                        </Button>
                        
                        <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                          <div>
                            <h5 className="font-medium text-white">Two-Factor Authentication</h5>
                            <p className="text-sm text-white/50 mt-0.5">Secure your designs with an extra layer of protection.</p>
                          </div>
                          <button className="relative w-11 h-6 bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/30">
                            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}

                {activeTab === "about" && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-10 max-w-2xl"
                  >
                    <div>
                      <h3 className="text-2xl font-semibold text-white tracking-tight">The Vision: Arch Agent</h3>
                      <p className="text-white/50 mt-2 text-sm italic border-l-2 border-white/20 pl-4 py-1">"Architecture is the intersection of mathematical precision and human emotion. Arch Agent was born to bridge the gap between initial inspiration and technical execution."</p>
                    </div>

                    <div className="space-y-8 text-white/70 leading-relaxed text-[15px]">
                      <div className="space-y-3">
                        <h4 className="text-white font-semibold text-lg tracking-tight">Our Philosophy</h4>
                        <p>
                          Arch Agent is a Neural Architecture Orchestration Center designed to serve as a technical partner for the modern architect. We believe that the future of design isn't about AI replacing the architect, but about AI removing the friction from the creative process. By merging high-fidelity neural networks with rigorous spatial logic, we provide a workspace where concepts move from imagination to estimation in seconds.
                        </p>
                      </div>

                      <div className="space-y-6 pt-6 border-t border-white/10">
                        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 sm:gap-6 items-start">
                          <div className="text-white font-medium mt-1">Neural Synthesis</div>
                          <div className="text-white/60 text-sm">Utilizing advanced generative models to produce rapid conceptual renders based on specific architectural parameters.</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 sm:gap-6 items-start">
                          <div className="text-white font-medium mt-1">Precision Analysis</div>
                          <div className="text-white/60 text-sm">Integrated cost-estimation engines that analyze material choices and structural scale in real-time.</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 sm:gap-6 items-start">
                          <div className="text-white font-medium mt-1">Orchestration Logic</div>
                          <div className="text-white/60 text-sm">A technical design partner that understands 'Spatial Logic'—ensuring that AI-generated concepts adhere to architectural standards.</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/[0.08] bg-[#050505]/90 backdrop-blur-xl flex items-center justify-end gap-3 z-20">
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="rounded-xl px-6 h-12 text-white/70 hover:text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={onClose}
                  className="rounded-xl px-6 h-12 bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] font-medium"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
