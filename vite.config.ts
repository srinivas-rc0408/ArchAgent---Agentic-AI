import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // NOTE: no `define` for API keys. Secrets are held by the Express server
  // (see server.ts) and reached through /api/*, so nothing sensitive is
  // inlined into the browser bundle. Only VITE_-prefixed vars reach the
  // client, and those are public by design.

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  server: {
    hmr: process.env.DISABLE_HMR !== "true",
  },

  build: {
    target: "es2022",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep the heavy, rarely-changing libraries in their own long-lived
        // chunks so an app edit doesn't invalidate a megabyte of cache — and
        // so a visitor who never opens the 3D viewer never downloads three.js.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          three: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"],
          pdf: ["jspdf", "jspdf-autotable"],
          motion: ["motion"],
        },
      },
    },
  },

  optimizeDeps: {
    // Pre-bundle the 3D stack so the first visit to the viewer in dev doesn't
    // stall on a few hundred on-demand module requests.
    include: ["three", "@react-three/fiber", "@react-three/drei"],
  },
});
