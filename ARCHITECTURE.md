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
  - **Persistence**: `localStorage` is used to maintain project history, user sessions, and generated assets across browser refreshes.
- **Service Layer**: A dedicated `gemini.ts` service handles all communication with the Google Gemini API, abstracting complex prompt engineering and response parsing.

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
- **Shader Backgrounds**: Custom GLSL shader backgrounds (`AnoAI`) provide a high-tech, immersive atmosphere in the workspace.

### Memory System
- **Session Memory**: The agent maintains full conversation history within a project session.
- **Cross-Session Memory**: Projects are persisted in `localStorage`, allowing users to return to previous designs, view generated images, and re-run cost estimations.

---

## 3. LLM Choice & Justification

We utilize the **Google Gemini** family of models for their superior speed, multimodal native capabilities, and reliability in structured data output.

### Primary Models
1.  **Gemini 2.0 Flash (Text/Logic/Visuals)**
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
