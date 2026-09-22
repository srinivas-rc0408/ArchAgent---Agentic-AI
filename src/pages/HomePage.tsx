import { useState, useRef } from "react";
import { useNavigate, Link, useOutletContext, useLocation } from "react-router-dom";
import {
  Bot,
  Image as ImageIcon,
  IndianRupee,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Mail,
  Phone,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Eye,
  MessageSquare,
  BookOpen,
  Zap,
  Briefcase,
  Calculator,
  X,
  LayoutGrid,
  Info,
  ChevronRight,
} from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { Button } from "@/components/ui/button";
import { FooterSection } from "@/components/ui/footer-section";
import SupportChat, { type SupportChatRef } from "@/components/SupportChat";
import ContactDialog from "@/components/ContactDialog";
import { Logo } from "@/components/Logo";
import { Progress } from "@/components/ui/interfaces-progress";
import { RevealText } from "@/components/ui/reveal-text";
import HoverAnimationButton from "@/components/ui/hover-animation-button";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { HoverButton } from "@/components/ui/hover-glow-button";
import { useAuth, signOut } from "@/lib/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ARCH_IMAGES } from "@/components/GlobalLayout";
import { useLoading } from "@/lib/LoadingContext";

const FEATURED_DESIGNS = [
  {
    title: "Minimalist Glass Villa",
    location: "Zurich, Switzerland",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=70&w=1200&fm=webp&auto=format&fit=crop",
    category: "Architecture",
  },
  {
    title: "Luxury Penthouse",
    location: "Dubai, UAE",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=70&w=1200&fm=webp&auto=format&fit=crop",
    category: "Interior",
  },
  {
    title: "Modern Glass Residence",
    location: "Vancouver, Canada",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=70&w=1200&fm=webp&auto=format&fit=crop",
    category: "Architecture",
  },
  {
    title: "Brutalist Concrete Home",
    location: "Tokyo, Japan",
    image:
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=70&w=1200&fm=webp&auto=format&fit=crop",
    category: "Architecture",
  },
  {
    title: "Zen Minimalist Suite",
    location: "Kyoto, Japan",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=70&w=1200&fm=webp&auto=format&fit=crop",
    category: "Interior",
  },
  {
    title: "Eco-Modern Forest Retreat",
    location: "Stockholm, Sweden",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=70&w=1200&fm=webp&auto=format&fit=crop",
    category: "Architecture",
  },
];

import { AccountModal } from "@/components/AccountModal";

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);
  const { setBgIndex } = useOutletContext<{
    setBgIndex: (i: number) => void;
  }>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<
    "profile" | "settings" | "about"
  >("profile");
  const supportRef = useRef<SupportChatRef>(null);
  const { isSyncing, startSyncSequence } = useLoading();

  // Scroll smoothing lives in GlobalLayout — a second Lenis instance here made
  // two rAF loops write scrollTop on the same frame, which is what made the
  // homepage feel like it was fighting the wheel.

  const handleLogout = async () => {
    setIsMenuOpen(false);
    setIsLoggingOut(true);
    setLogoutProgress(0);

    // Drive the bar off the real work instead of a timer race.
    setLogoutProgress(35);
    await signOut();
    setLogoutProgress(100);

    window.setTimeout(() => {
      setIsLoggingOut(false);
      navigate("/");
    }, 220);
  };

  const handleLaunchWorkspace = () => {
    if (isSyncing) return;
    setBgIndex(Math.floor(Math.random() * ARCH_IMAGES.length));
    startSyncSequence(
      isAuthenticated ? "/orchestration" : "/login?redirect=/orchestration",
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen w-full font-sans text-white focus-visible:outline-none focus:outline-none"
    >
      {/* Global Header */}
      <header className="relative z-50 flex h-24 items-center justify-between px-8 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-6">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen} modal={false}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="group relative h-14 w-14 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl p-0 overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
                />
              }
            >
              <MenuToggleIcon
                open={isMenuOpen}
                className="relative z-10 h-6 w-6 text-white/80 transition-colors group-hover:text-white"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[150%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%] z-0" />
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              hasOverlay={false}
              className="w-[400px] sm:w-[500px] border-r border-white/5 bg-[#050505]/60 text-white backdrop-blur-3xl p-0 transition-transform duration-500 will-change-transform flex flex-col h-full rounded-r-2xl overflow-hidden font-sans shadow-2xl"
            >
              {/* Header */}
              <div className="flex h-24 shrink-0 items-center justify-between px-8">
                <SheetTitle className="text-left m-0 border-0 p-0 shadow-none">
                  <Logo iconSize={6} textSize="text-xl" />
                </SheetTitle>
                <SheetClose className="rounded-full p-2 hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-white/20 hover:rotate-90 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] active:scale-95 duration-300">
                  <X className="h-5 w-5 stroke-[1.5] text-white/70 hover:text-white" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>

              {/* Scrollable Content */}
              <motion.div
                className="flex-1 overflow-y-auto py-8 scrollbar-thin min-h-0"
                initial="hidden"
                animate={isMenuOpen ? "show" : "hidden"}
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
                  },
                }}
              >
                {/* Primary Navigation */}
                <div className="px-6 mb-12">
                  <motion.h3
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 },
                    }}
                    className="px-4 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4"
                  >
                    Primary Actions
                  </motion.h3>
                  <nav className="flex flex-col gap-1">
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.3 },
                        },
                      }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (isAuthenticated) {
                            startSyncSequence("/orchestration");
                          } else {
                            startSyncSequence("/login?redirect=/orchestration");
                          }
                        }}
                        className="w-full h-12 px-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Zap className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-white transition-colors" />
                        <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/80 group-hover:text-white truncate">
                          Launch Workspace
                        </span>
                        <ChevronRight className="shrink-0 h-4 w-4 text-white/30 group-hover:text-white/70 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.3 },
                        },
                      }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsMenuOpen(false);
                          startSyncSequence("/showcase");
                        }}
                        className="w-full h-12 px-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <LayoutGrid className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-white transition-colors" />
                        <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/80 group-hover:text-white truncate">
                          Project Showcase
                        </span>
                      </Button>
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.3 },
                        },
                      }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (isAuthenticated) {
                            startSyncSequence("/orchestration");
                          } else {
                            startSyncSequence("/login?redirect=/orchestration");
                          }
                        }}
                        className="w-full h-12 px-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Calculator className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-white transition-colors" />
                        <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/80 group-hover:text-white truncate">
                          Cost Estimator
                        </span>
                      </Button>
                    </motion.div>
                  </nav>
                </div>

                {/* Information & Utility */}
                <div className="px-6 mb-8">
                  <motion.h3
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 },
                    }}
                    className="px-4 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-4"
                  >
                    Information & Utility
                  </motion.h3>
                  <nav className="flex flex-col gap-1">
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.3 },
                        },
                      }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setAccountModalTab("about");
                          setAccountModalOpen(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full h-12 px-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Info className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-white transition-colors" />
                        <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/70 group-hover:text-white truncate">
                          About Us
                        </span>
                      </Button>
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.3 },
                        },
                      }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsMenuOpen(false);
                        }}
                        className="w-full h-12 px-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <BookOpen className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-white transition-colors" />
                        <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/70 group-hover:text-white truncate">
                          Technical Documentation
                        </span>
                      </Button>
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.3 },
                        },
                      }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => {
                          supportRef.current?.openChat(
                            "I need help submitting a ticket.",
                          );
                          setIsMenuOpen(false);
                        }}
                        className="w-full h-12 px-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Briefcase className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-white transition-colors" />
                        <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/70 group-hover:text-white truncate">
                          Support & Help Desk
                        </span>
                      </Button>
                    </motion.div>
                  </nav>
                </div>
              </motion.div>

              {/* Footer Section */}
              {isAuthenticated && (
                <div className="shrink-0 mt-auto px-6 py-6 border-t border-white/5">
                  <nav className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setAccountModalTab("settings");
                        setAccountModalOpen(true);
                      }}
                      className="w-full h-12 px-4 rounded-xl hover:bg-white/5 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Settings className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-white transition-colors" />
                      <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/70 group-hover:text-white truncate">
                        Account Settings
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full h-12 px-4 rounded-xl hover:bg-white/5 hover:text-red-400/80 transition-all group cursor-pointer flex flex-row items-center justify-start gap-4 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <LogOut className="shrink-0 h-4 w-4 stroke-[1.5] text-white/50 group-hover:text-red-400/80 transition-colors" />
                      <span className="flex-1 text-left text-[14px] font-medium leading-none text-white/70 group-hover:text-red-400/80 truncate">
                        Logout
                      </span>
                    </Button>
                  </nav>
                </div>
              )}
            </SheetContent>
          </Sheet>
          <div 
            onClick={() => {
              if (location.pathname !== "/") {
                startSyncSequence("/");
              }
            }}
            className="opacity-60 hover:opacity-100 transition-all duration-700 cursor-pointer hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]"
          >
            <Logo transparent />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="group relative h-14 w-14 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl p-0 overflow-hidden transition-all duration-500 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
                  />
                }
              >
                <User className="relative z-10 h-6 w-6 text-white/80 transition-colors group-hover:text-white" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[150%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%] z-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-black/60 border-white/10 text-white backdrop-blur-3xl rounded-2xl p-2"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem
                    className="hover:bg-white/5 cursor-pointer"
                    onClick={() => {
                      setAccountModalTab("profile");
                      setAccountModalOpen(true);
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-white/5 cursor-pointer"
                    onClick={() => {
                      setAccountModalTab("settings");
                      setAccountModalOpen(true);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 hover:bg-red-400/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => navigate("/login?redirect=/orchestration")}
              className="group relative overflow-hidden bg-white text-black font-semibold rounded-full px-8 h-12 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-[150%] transition-transform duration-700 ease-in-out group-hover:translate-x-[150%] z-0" />
            </Button>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-40 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl"
        >
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8 flex flex-col items-center"
          >
            <RevealText
              text="AUTONOMOUS"
              fontSize="text-6xl md:text-8xl"
              textColor="text-white"
              className="mb-2 font-black tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            />
            <RevealText
              text="DESIGN & ESTIMATION"
              fontSize="text-4xl md:text-6xl"
              textColor="text-white/90"
              className="font-bold tracking-tight opacity-90"
              letterDelay={0.05}
            />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-xl md:text-2xl text-white/40 mb-12 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Empowering architects with agentic workflows for rapid
            conceptualization and precision cost analysis.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-8 justify-center items-center"
          >
            <HoverBorderGradient
              as="div"
              containerClassName="rounded-2xl p-0"
              className="p-0 bg-transparent border-none"
            >
              <HoverAnimationButton
                onClick={handleLaunchWorkspace}
                className="h-[72px] px-12 text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 min-w-[280px] flex items-center justify-center !p-0"
              >
                Launch Workspace
              </HoverAnimationButton>
            </HoverBorderGradient>
            <HoverButton
              onClick={() => startSyncSequence("/showcase")}
              className="h-[72px] px-12 text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 min-w-[280px] flex items-center justify-center"
              glowColor="#ffffff"
              hoverTextColor="#ffffff"
              backgroundColor="rgba(255,255,255,0.03)"
            >
              View Showcase
            </HoverButton>
          </motion.div>
        </motion.div>

        {/* Featured Designs Gallery */}
        <section className="mt-32 w-full max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-white/40" />
                <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">
                  Curated Gallery
                </span>
              </div>
              <h2 className="text-5xl font-bold tracking-tight mb-4">
                Featured Designs
              </h2>
              <p className="text-white/40 max-w-md text-lg font-light">
                Explore high-end architectural masterpieces and detailed
                interior concepts.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Button
                variant="ghost"
                onClick={() => startSyncSequence("/showcase")}
                className="text-white/40 hover:text-white group"
              >
                Explore Full Showcase{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {FEATURED_DESIGNS.map((design, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="group relative aspect-[16/10] rounded-[3rem] overflow-hidden border border-white/5 bg-white/5 cursor-pointer will-change-transform"
                onClick={() =>
                  setSelectedImage({ src: design.image, title: design.title })
                }
              >
                <img
                  src={design.image}
                  alt={design.title}
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={750}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-white/50 mb-2">
                        {design.category}
                      </p>
                      <h4 className="text-3xl font-bold tracking-tight">
                        {design.title}
                      </h4>
                      <p className="text-white/40 mt-1 font-light">
                        {design.location}
                      </p>
                    </div>
                    <div className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
                      <Eye className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-6xl w-full pb-32">
          {[
            {
              title: "Architect AI",
              desc: "Intelligent design partner that understands constraints and generates professional prompts.",
              icon: Bot,
            },
            {
              title: "Visual Generation",
              desc: "State-of-the-art image generation for architectural concepts and interior designs.",
              icon: ImageIcon,
            },
            {
              title: "Cost Estimation",
              desc: "Automated material parsing and itemized financial breakdowns for every project.",
              icon: IndianRupee,
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ 
                y: -10, 
                backgroundColor: "rgba(255,255,255,0.12)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
              }}
              onClick={() => startSyncSequence("/orchestration")}
              className="p-10 rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-md transition-all text-left group cursor-pointer will-change-transform relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all duration-500 relative z-10">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight relative z-10">
                {feature.title}
              </h3>
              <p className="text-white/40 font-light leading-relaxed text-lg relative z-10">
                {feature.desc}
              </p>
              <div className="mt-8 flex items-center gap-2 text-white opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Execute Strategy</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer Section */}
      <FooterSection
        onAboutClick={() => {
          setAccountModalTab("about");
          setAccountModalOpen(true);
        }}
      />

      {/* Support & Contact Components */}
      <SupportChat ref={supportRef} />
      <ContactDialog
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        defaultTab={accountModalTab}
        user={{ email: user?.email ?? "guest@archagent.app", name: user?.displayName, isPremium: isAuthenticated }}
      />
      {selectedImage && (
        <ImageLightbox
          images={[selectedImage]}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Logout Overlay */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xs space-y-6 flex flex-col items-center"
            >
              <div className="relative">
                <Logo iconSize={8} textSize="text-2xl" />
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between items-center text-xs text-white/50 font-jetbrains-mono tracking-widest uppercase">
                  <span>Loading...</span>
                  <span>{Math.round(logoutProgress)}%</span>
                </div>
                <Progress
                  value={logoutProgress}
                  className="h-1.5 bg-white/10"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
