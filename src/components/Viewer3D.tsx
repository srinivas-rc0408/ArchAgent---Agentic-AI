import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Stage, ContactShadows } from '@react-three/drei';
import { EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { LoadingBreadcrumb } from './ui/animated-loading-svg-text-shimmer';
import { DesignConcept } from '../types';
import {
  X,
  RotateCcw,
  ZoomIn,
  Info,
  Maximize,
  Minimize,
  Sparkles,
  Box,
  Layers,
  Monitor,
  Eye,
  EyeOff,
  Grid,
  Ghost,
  Camera,
  MousePointer2,
  Maximize2,
  Briefcase,
} from 'lucide-react';

interface Viewer3DProps {
  design: DesignConcept;
  onClose: () => void;
  is3D?: boolean; // New prop to indicate actual 3D mode
  modelUrl?: string | null;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  type: 'structure' | 'facade' | 'interior' | 'other';
}

const PanoramicRoom = ({ imageUrl }: { imageUrl: string }) => {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const gl = useThree((state) => state.gl);
  
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
    }
  }, [texture]);
  
  return (
    <group>
      <mesh scale={[-1, 1, 1]} rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[500, 64, 64]} />
        <meshBasicMaterial 
          map={texture} 
          side={THREE.BackSide} 
          transparent={false}
        />
      </mesh>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
    </group>
  );
};

// --- NEW 3D Model Component ---
const TrellisModel = ({ url, wireframe, visibleLayers }: { url: string, wireframe: boolean, visibleLayers: string[] }) => {
  const { scene } = useGLTF(url, 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Handle visibility based on layers
        // We attempt to match layer types by object names or custom properties
        if (visibleLayers.length > 0) {
          const name = child.name.toLowerCase();
          const matchesAnyActiveLayer = visibleLayers.some(layerId => {
            if (layerId === 'structure') return name.includes('struct') || name.includes('frame') || name.includes('beam');
            if (layerId === 'facade') return name.includes('facade') || name.includes('glass') || name.includes('exterior') || name.includes('wall');
            if (layerId === 'interior') return name.includes('inter') || name.includes('furniture') || name.includes('floor');
            return true;
          });
          child.visible = matchesAnyActiveLayer;
        }

        if (child.material) {
          child.material.envMapIntensity = 1.5;
          child.material.roughness = 0.4;
          child.material.metalness = 0.2;
          child.material.wireframe = wireframe;
        }
      }
    });
  }, [scene, wireframe, visibleLayers]);

  return <primitive object={scene} />;
};

import { Logo } from './Logo';

// --- Technical Grid Placeholder ---
const TechnicalGridPlaceholder = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial 
          color="#888888" 
          wireframe={true} 
          transparent={true}
          opacity={0.2}
        />
      </mesh>
    </group>
  );
};

const Viewer3D = function Viewer3DComponent({ design, onClose, is3D = false, modelUrl = null }: Viewer3DProps) {
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useGyro, setUseGyro] = useState(false);
  const [viewMode, setViewMode] = useState<'orbit' | 'first-person'>(is3D ? 'orbit' : 'orbit');
  const [wireframe, setWireframe] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (is3D && !modelUrl) {
      const texts = [
        'Initializing Neural Mesh...',
        'Baking 4K Textures...',
        'Applying Draco Compression...',
        'Reticulating Splines...',
        'Synthesizing Geometry...'
      ];
      const timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % texts.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [is3D, modelUrl]);

  const telemetryText = is3D && !modelUrl ? 
    ['Initializing Neural Mesh...', 'Baking 4K Textures...', 'Applying Draco Compression...', 'Reticulating Splines...', 'Synthesizing Geometry...'][loadingStep] 
    : '99.4% Converged';
  const [showGhost, setShowGhost] = useState(true);
  const [activeLayers, setActiveLayers] = useState<string[]>(['structure', 'facade', 'interior']);
  const [showLayers, setShowLayers] = useState(false);
  
  const layers: Layer[] = [
    { id: 'structure', name: 'Structural Skeleton', visible: activeLayers.includes('structure'), type: 'structure' },
    { id: 'facade', name: 'Facade & Glazing', visible: activeLayers.includes('facade'), type: 'facade' },
    { id: 'interior', name: 'Interior Systems', visible: activeLayers.includes('interior'), type: 'interior' },
  ];

  const controlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleLayer = (id: string) => {
    setActiveLayers(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      // Animation for reset
      if (is3D) {
        controlsRef.current.setAzimuthalAngle(Math.PI / 4);
        controlsRef.current.setPolarAngle(Math.PI / 3);
      }
    }
  };

  const goToView = (view: 'ceiling' | 'floor' | 'horizon') => {
    if (controlsRef.current) {
      const ceilingLimit = Math.PI / 4 + 0.1;
      const floorLimit = Math.PI * 0.75 - 0.1;
      const targetPolar = view === 'ceiling' ? ceilingLimit : view === 'floor' ? floorLimit : Math.PI / 2;
      
      controlsRef.current.setPolarAngle(targetPolar);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn("fixed inset-0 z-[100] flex flex-col font-sans overflow-hidden", is3D ? "bg-transparent backdrop-blur-sm" : "bg-[#050505]")}
    >
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 h-24 px-10 flex justify-between items-center z-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent backdrop-blur-[4px]">
        <div className="flex items-center gap-6">
          <Logo iconSize={8} textSize="text-2xl" />
          <div className="h-6 w-px bg-white/20 mx-2" />
          <h2 className="text-xl font-medium text-white tracking-tight">
            {design.style} <span className="text-white/40 ml-2">{is3D ? "3D Studio Preview" : "Panorama"}</span>
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/10 backdrop-blur-2xl mr-4">
            <button 
              onClick={() => setViewMode('orbit')}
              className={cn(
                "px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-500",
                viewMode === 'orbit' ? "bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.2)]" : "text-white/40 hover:text-white"
              )}
            >
              {is3D ? 'Free Exploit' : 'Orbit'}
            </button>
            {!is3D && (
              <button 
                onClick={() => setViewMode('first-person')}
                className={cn(
                  "px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-500",
                  viewMode === 'first-person' ? "bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.2)]" : "text-white/40 hover:text-white"
                )}
              >
                Immersive
              </button>
            )}
          </div>
          <button
            onClick={toggleFullscreen}
            className="h-12 w-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/60 hover:text-white border border-white/10 active:scale-90"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button
            onClick={onClose}
            className="h-12 w-12 flex items-center justify-center bg-white text-black hover:bg-zinc-200 hover:text-black rounded-2xl transition-all shadow-[0_15px_30px_rgba(0,0,0,0.4)] active:scale-90 font-black"
            id="close-viewer-btn"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Control Tools Sidebar (Left) */}
      <div className="absolute top-1/2 -translate-y-1/2 left-8 flex flex-col gap-8 z-30">
        <div className="flex flex-col gap-3 p-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl">
          <button 
            onClick={() => wireframe && is3D ? setWireframe(false) : is3D ? setWireframe(true) : null}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group",
              wireframe ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
            title="Toggle Wireframe"
          >
            <Grid size={20} className={cn("transition-transform duration-500", wireframe && "rotate-45")} />
          </button>
          
          {is3D && !modelUrl && (
            <button 
              onClick={() => setShowGhost(!showGhost)}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group",
                showGhost ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
              title="Toggle Ghost Preview"
            >
              <Ghost size={20} />
            </button>
          )}

          <div className="h-px w-8 mx-auto bg-white/10" />

          <button 
            onClick={() => resetCamera()}
            className="w-12 h-12 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all duration-300 group"
            title="Reset Camera"
          >
            <Camera size={20} className="group-hover:scale-110" />
          </button>

          <button 
            tabIndex={0}
            onClick={() => setShowLayers(!showLayers)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
              showLayers ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
            title="Layer Management"
          >
            <Layers size={20} />
          </button>
        </div>

        {/* Dynamic Zoom/Movement Help if in 3D */}
        {is3D && (
          <div className="flex flex-col gap-2 p-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem]">
            <div className="w-12 h-12 flex items-center justify-center text-white/20" title="Orbit Control">
               <RotateCcw size={18} />
            </div>
            <div className="w-12 h-12 flex items-center justify-center text-white/20" title="Zoom Control">
               <ZoomIn size={18} />
            </div>
            <div className="w-12 h-12 flex items-center justify-center text-white/20" title="Pan Control">
               <MousePointer2 size={18} />
            </div>
          </div>
        )}
      </div>

      {/* Layer Sidebar (Right) */}
      <AnimatePresence>
        {showLayers && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-32 right-8 w-72 z-30 bg-black/60 backdrop-blur-[30px] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">Neural Layers</span>
                <h3 className="text-lg font-bold text-white tracking-tight">Active Components</h3>
              </div>
              <button 
                onClick={() => setShowLayers(false)}
                className="w-10 h-10 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-white/40" />
              </button>
            </div>

            <div className="space-y-4">
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 group relative overflow-hidden",
                    layer.visible 
                      ? "bg-white/10 border-white/20 text-white" 
                      : "bg-transparent border-white/5 text-white/30 grayscale opacity-40 hover:opacity-60"
                  )}
                >
                  {layer.visible && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                      layer.visible ? "bg-white text-black" : "bg-white/5 text-white/20"
                    )}>
                      {layer.type === 'structure' && <Box size={18} />}
                      {layer.type === 'facade' && <Maximize2 size={18} />}
                      {layer.type === 'interior' && <Briefcase className="h-4.5 w-4.5" />}
                      {!['structure', 'facade', 'interior'].includes(layer.type) && <Layers size={18} />}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">Toggle Visibility</span>
                      <span className="text-sm font-bold tracking-tight">{layer.name}</span>
                    </div>
                  </div>
                  <div className="relative z-10 transition-transform duration-500 group-hover:scale-110">
                    {layer.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 p-5 bg-white/5 rounded-[1.5rem] border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                 <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                 <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Synthesis Mode</span>
              </div>
              <p className="text-[10px] text-white/30 leading-relaxed italic">
                Currently displaying orchestrations for {activeLayers.length} active layers. Model resolution optimized for real-time interaction.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Technical HUD Overlay */}
      <div className={cn(
        "absolute top-24 left-10 flex flex-col gap-4 z-10 transition-opacity duration-1000",
        is3D ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-[2rem] space-y-4 min-w-[220px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.4em]">Status Monitor</span>
            <div className="h-2 w-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 group">
              <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/40 transition-colors">
                <Layers className="h-3.5 w-3.5 text-white/80" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Mesh Topology</span>
                <span className="text-[10px] font-mono text-white/80">{wireframe ? 'WIRE_XRAY_ENABLED' : 'QUARTZ_SOLID_V2'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 group">
              <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/40 transition-colors">
                <Monitor className="h-3.5 w-3.5 text-white/80" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Bake Accuracy</span>
                <span className="text-[10px] font-mono text-white/80">{telemetryText}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 space-y-1.5 font-mono text-[8px]">
             <div className="flex justify-between">
                <span className="text-white/30 uppercase">Ray Depth</span>
                <span className="text-white/60">128 Samples</span>
             </div>
             <div className="flex justify-between">
                <span className="text-white/30 uppercase">Latency</span>
                <span className="text-white/60">2ms</span>
             </div>
          </div>
        </motion.div>
      </div>

      {/* 3D Scene */}
      <div className={cn("flex-1 relative cursor-grab active:cursor-grabbing", is3D ? "bg-transparent" : "bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#000_100%)]")}>
        {/* Loading Overlay */}
        <AnimatePresence>
          {is3D && !modelUrl && showGhost && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[10px] z-50 pointer-events-none"
            >
              <div className="h-32 w-32 rounded-[3.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-10 relative">
                <div className="absolute inset-0 rounded-[3.5rem] border border-white/20 animate-ping opacity-20" />
                <Sparkles className="h-12 w-12 text-white/80" />
              </div>
              <div className="text-center space-y-4">
                <LoadingBreadcrumb status={telemetryText} className="text-white scale-125" />
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  className="text-[10px] font-black uppercase tracking-[0.6em] text-white"
                >
                  Synthesizing Spatial Dimensions
                </motion.p>
              </div>
              
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-80 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_10px_white]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Canvas
          shadows={is3D}
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 4], fov: 45 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
        >
          <Suspense fallback={<TechnicalGridPlaceholder />}>
            {is3D ? (
              <>
                <Stage 
                  intensity={0.5} 
                  environment="studio" 
                  shadows="contact" 
                  adjustCamera={true}
                >
                  {modelUrl ? (
                    <TrellisModel url={modelUrl} wireframe={wireframe} visibleLayers={activeLayers} />
                  ) : (
                    showGhost && <TechnicalGridPlaceholder />
                  )}
                </Stage>
                <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={10} blur={2.5} far={0.8} />
                <OrbitControls 
                  ref={controlsRef}
                  makeDefault
                  enableDamping={true}
                  dampingFactor={0.05}
                />
              </>
            ) : (
              <>
                <PanoramicRoom imageUrl={design.url} />
                <OrbitControls
                  ref={controlsRef}
                  enablePan={false}
                  enableZoom={true}
                  minDistance={0.1}
                  maxDistance={1.5} 
                  rotateSpeed={-0.3} 
                  panSpeed={0.5}
                  zoomSpeed={0.6}
                  dampingFactor={0.08}
                  enableDamping={true}
                  autoRotate={false}
                  minPolarAngle={Math.PI / 4} 
                  maxPolarAngle={Math.PI * 0.75}
                  target={[0, 0, 0]}
                />
              </>
            )}
            
            <EffectComposer multisampling={0} enableNormalPass={false}>
              <Vignette eskil={false} offset={0.15} darkness={0.85} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Spatial Legend */}
      {!is3D && (
        <div className="absolute top-32 right-12 flex flex-col gap-5 pointer-events-none text-right text-white/60">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Spatial Analytics</span>
            <div className="space-y-0.5">
              <div className="text-[9px] font-mono text-white/30 uppercase">Z-Depth: Infinite</div>
              <div className="text-[9px] font-mono text-white/30 uppercase">Horizon: Stabilized</div>
              <div className="text-[9px] font-mono text-white/30 uppercase">Exposure: Dynamic</div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Footer Navigation */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 px-10 py-5 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] flex items-center gap-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-20"
          >
            <div className="flex items-center gap-4 text-white/90 text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_white]" />
              {is3D ? "NEURAL SPATIAL INTERFACE ACTIVE" : "IMMERSIVE VISUAL STREAM"}
            </div>
            
            <div className="h-5 w-px bg-white/10" />
            
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                <RotateCcw size={14} className="text-white/60" /> <span>Rotate</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                <ZoomIn size={14} className="text-white/60" /> <span>Zoom</span>
              </div>
              {is3D && (
                <div className="flex items-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  <MousePointer2 size={14} className="text-white/60" /> <span>Pan</span>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-white/10" />
            
            <button 
              onClick={() => setShowControls(false)}
              className="text-white/60 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group"
            >
              <span>Minimize Interface</span>
              <X size={14} className="group-hover:rotate-90 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!showControls && (
        <motion.button 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setShowControls(true)}
          className="absolute bottom-12 right-12 h-16 w-16 bg-white hover:bg-zinc-200 text-black rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] z-20 group"
          title="Show Navigation Interface"
        >
          <Info size={28} className="group-hover:scale-110 transition-transform" />
        </motion.button>
      )}
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default React.memo(Viewer3D);
