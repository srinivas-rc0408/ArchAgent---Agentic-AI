# Arch Agent: Architecture & AI Documentation

This document provides a comprehensive overview of the technical architecture, agentic capabilities, and AI implementation of the Arch Agent platform.

---

## 1. Architecture Design

Arch Agent is built as a high-performance, full-stack Single Page Application (SPA) with a focus on professional-grade UI/UX and real-time AI orchestration.

### Frontend Stack
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/) for ultra-fast development and optimized production builds.
- **Language**: [TypeScript](https://www.typescriptlang.org/) for strict type safety across the entire codebase.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) for utility-first styling and rapid UI iteration.
- **Component Library**: [Shadcn UI](https://ui.shadcn.com/) for accessible, highly customizable base components.
- **Animations**: [Motion (formerly Framer Motion)](https://motion.dev/) for fluid transitions, spring-based interactions, and scroll-reveal effects.
- **Scrolling**: [Lenis](https://lenis.darkroom.engineering/) for "buttery smooth" inertial scrolling on landing pages.

### System Architecture
- **Routing**: Client-side routing via `react-router-dom` v7.
- **State Management**: 
  - **Local State**: React Hooks (`useState`, `useRef`, `useContext`) for component-level logic.
  - **Persistence**: `src/lib/sessionStore.ts` debounces writes to `localStorage` and upserts only changed rows to Supabase. Inline base64 renders are stripped before persisting so a session cannot exceed the storage quota.
- **Service Layer**: `src/lib/gemini.ts` is a thin client over the app's own `/api/*` routes. It holds no credentials.
- **AI Proxy**: `server.ts` (Express) owns every API key and talks to Gemini, Hugging Face and the image provider on the browser's behalf. Chat is streamed back as Server-Sent Events.

---

## 2. Agentic Capabilities

The "Arch Agent" is not just a chatbot; it is an **Autonomous Design Partner** capable of multi-step reasoning and asset generation.

### Agent Skills
- **Architectural Consultation**: Understands technical constraints (dimensions, materials, styles) and provides expert design advice.
- **Prompt Engineering**: Automatically converts natural language descriptions into high-fidelity technical prompts for image generation.
- **Financial Analysis**: Parses design concepts to generate itemized cost breakdowns (Material, Labor, Contingency) in real-time.
- **Visual Synthesis**: Orchestrates image generation models to produce photorealistic architectural visualizations.

### Tools & Integration
- **Gemini API**: The core engine for text generation, JSON parsing, and image creation.
- **Google Search**: Integrated via Gemini to fetch real-world architectural trends and material pricing data.
- **Image providers**: Hugging Face `FLUX.1-schnell` when a token is configured, falling back to a keyless provider. Both are streamed through `/api/image` so the browser only ever talks to our own origin.

### Memory System
- **Session Memory**: The agent maintains full conversation history within a project session.
- **Cross-Session Memory**: Projects are persisted in `localStorage`, allowing users to return to previous designs, view generated images, and re-run cost estimations.

---

## 3. LLM Choice & Justification

We utilize the **Google Gemini** family of models for their superior speed, multimodal native capabilities, and reliability in structured data output.

### Primary Models
1.  **Gemini 2.5 Flash (Text/Logic)**
    -   **Usage**: Main architectural chat, title generation, cost estimation, and internal prompt engineering.
    -   **Justification**: 
        -   **Latency**: Extremely low latency ensures "buttery smooth" streaming responses.
        -   **Multi-modal**: Native capabilities for both text and image generation.
        -   **JSON Reliability**: Exceptional performance with structured outputs, critical for accurate cost breakdowns.
        -   **Modern Architecture**: Optimized for the latest `@google/genai` SDK.

---

## 4. User Experience (UX) Principles
- **Inertial Interactions**: All buttons and hover effects use spring physics rather than linear transitions.
- **Glassmorphism**: Extensive use of `backdrop-blur` and semi-transparent overlays to create a high-end, modern aesthetic.
- **Autonomous Triggers**: The agent is programmed to be proactive—automatically triggering image generation and cost analysis when a design is finalized.


---

## 5. Security Model

- **No key reaches the browser.** `GEMINI_API_KEY` and `HUGGINGFACE_API_KEY` are read by `server.ts` only. The Vite config deliberately defines no secret, so nothing is inlined into the bundle.
- **Only `VITE_`-prefixed values are public**, and the only ones used are the Supabase URL and anon key, which are safe to expose while Row Level Security is enabled.
- **Missing credentials degrade, they don't crash.** Each route answers 503 with an actionable message; the UI surfaces it inline and offers a retry.
- **No credentials in source.** Copy `env.example` to `.env`; `.env*` is gitignored.

---

## 6. Performance Budget

| Concern | Approach |
|---|---|
| Initial bundle | Landing page only. Workspace, login and showcase are `React.lazy` routes. |
| three.js (~1.3 MB) | Loaded on demand, when the immersive viewer first opens. |
| jsPDF (~800 KB) | Dynamically imported at export time. |
| 3D render cost | DPR clamped to 1.75, postprocessing reduced to a single vignette, one environment map. |
| Chat streaming | Message rows are memoised; autoscroll jumps instantly mid-stream and only animates on completed turns. |
| Persistence | Debounced 700 ms; only changed sessions sync remotely. |
| Scrolling | Exactly one Lenis instance, app-wide, with its rAF loop cancelled on unmount. |
| Motion | Fully respects `prefers-reduced-motion`. |
