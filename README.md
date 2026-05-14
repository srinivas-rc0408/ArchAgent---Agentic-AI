<div align="center">

# 🏛️ Arch Agent — Neural Architecture Orchestration Center

**An AI-powered architectural design platform that combines real-time consultation, photorealistic visualization, cost estimation, and 3D synthesis into a single premium workspace.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Agentic AI Capabilities](#-agentic-ai-capabilities)
- [Pages & Routing](#-pages--routing)
- [API Endpoints](#-api-endpoints)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 Overview

**Arch Agent** is a full-stack, AI-native architectural design platform built for professional architects, interior designers, and real estate developers. It acts as an **Autonomous Design Partner** — not just a chatbot — capable of multi-step reasoning, photorealistic image generation, real-time cost estimation, and 3D model synthesis.

The platform leverages **Google Gemini** for intelligent design consultation, **Hugging Face FLUX** for high-fidelity image generation, and **Three.js** for interactive 3D visualization, all wrapped in a premium glassmorphic UI with buttery-smooth animations.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **AI Design Consultant** | Real-time streaming architectural consultation powered by Gemini 3.1 Flash with persona-driven prompts |
| 🖼️ **Image Generation** | Photorealistic architectural visualizations via Hugging Face FLUX.1-schnell with automatic fallback to Pollinations |
| 💰 **Cost Estimation** | AI-powered quantity surveying with itemized breakdowns (Material, Labor, Contingency) calibrated for Bengaluru market rates |
| 🧊 **3D Visualization** | Interactive Three.js-based 3D viewer with orbit controls, lighting presets, and environment mapping |
| 📄 **PDF Export** | Professional report generation with jsPDF including design specs, cost tables, and generated images |
| 🔐 **Authentication** | User authentication and session management via Supabase |
| 💬 **Support Chat** | Dedicated AI-powered technical support agent for platform assistance |
| 🎨 **Premium UI** | Glassmorphism, spring-physics animations, Lenis smooth scrolling, and custom GLSL shader backgrounds |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React SPA)                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ HomePage  │  │  Login   │  │Orchestrate│  │Showcase│ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘ │
│       └──────────────┴──────────────┴────────────┘      │
│                         │                                │
│              ┌──────────┴──────────┐                    │
│              │   Service Layer     │                    │
│              │  ┌───────────────┐  │                    │
│              │  │  gemini.ts    │  │  (Gemini AI SDK)   │
│              │  │  supabase.ts  │  │  (Auth & DB)       │
│              │  │  pdfHelper.ts │  │  (PDF Export)      │
│              │  └───────────────┘  │                    │
│              └─────────────────────┘                    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP
┌──────────────────────┴──────────────────────────────────┐
│                  SERVER (Express + Vite)                  │
│                                                          │
│  /api/generate-image   → HuggingFace FLUX / Pollinations│
│  /api/generate-3d      → HuggingFace TRELLIS            │
│  /api/warmup-hf        → Model Pre-warming              │
│  /api/status           → Health Check                    │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework with concurrent features |
| **TypeScript 5.8** | End-to-end type safety |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS v4** | Utility-first styling |
| **Shadcn UI / Radix** | Accessible component primitives |
| **Framer Motion** | Spring-based animations & transitions |
| **Three.js + R3F** | 3D rendering & visualization |
| **Lenis** | Smooth inertial scrolling |
| **React Router v7** | Client-side routing |

### Backend
| Technology | Purpose |
|---|---|
| **Express.js** | API server & middleware |
| **Google Gemini SDK** | AI text generation & reasoning |
| **Hugging Face API** | Image generation (FLUX.1-schnell) & 3D (TRELLIS) |
| **Supabase** | Authentication, database, & storage |
| **dotenv** | Environment variable management |

### Utilities
| Technology | Purpose |
|---|---|
| **jsPDF** | PDF report generation |
| **html2canvas** | DOM-to-image capture |
| **canvas-confetti** | Celebratory UI effects |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A [Google Gemini API Key](https://ai.google.dev/)
- *(Optional)* A [Hugging Face API Key](https://huggingface.co/settings/tokens) for image generation
- *(Optional)* A [Supabase](https://supabase.com/) project for authentication

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/srinivas-rc0408/ArchAgent---Agentic-AI.git
cd ArchAgent---Agentic-AI

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and add your API keys (see below)

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory (see `.env.example` for reference):

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key for AI chat, cost estimation, and prompt engineering |
| `HUGGINGFACE_API_KEY` | ⚡ Recommended | Hugging Face token for FLUX image generation & TRELLIS 3D synthesis |
| `API_KEY_21ST` | ❌ Optional | 21st.dev integration key |
| `VITE_SUPABASE_URL` | ❌ Optional | Supabase project URL for authentication |
| `VITE_SUPABASE_ANON_KEY` | ❌ Optional | Supabase anonymous key |

> **Note:** The app works without Hugging Face keys — image generation will fall back to the Pollinations API automatically.

---

## 📁 Project Structure

```
ArchAgent/
├── server.ts                  # Express server (API routes + Vite middleware)
├── index.html                 # Entry HTML
├── vite.config.ts             # Vite configuration
├── package.json               # Dependencies & scripts
├── .env.example               # Environment variable template
├── ARCHITECTURE.md            # Detailed architecture documentation
│
├── src/
│   ├── App.tsx                # Root component with routing
│   ├── main.tsx               # React entry point
│   ├── index.css              # Global styles
│   ├── types.ts               # TypeScript type definitions
│   │
│   ├── pages/
│   │   ├── HomePage.tsx       # Landing page with hero, features, showcase
│   │   ├── LoginPage.tsx      # Authentication page (Supabase)
│   │   ├── OrchestrationPage  # Main AI workspace (chat, visualizer, costs)
│   │   ├── ShowcasePage.tsx   # Project gallery & portfolio
│   │   └── DemoPage.tsx       # Interactive demo
│   │
│   ├── components/
│   │   ├── GlobalLayout.tsx   # App shell with navigation & preloader
│   │   ├── Viewer3D.tsx       # Three.js 3D model viewer
│   │   ├── ImageLightbox.tsx  # Full-screen image viewer
│   │   ├── SupportChat.tsx    # AI support chatbot
│   │   ├── AccountModal.tsx   # User account management
│   │   ├── ContactDialog.tsx  # Contact form modal
│   │   ├── Preloader.tsx      # Animated loading screen
│   │   └── ui/               # Shadcn UI primitives
│   │
│   ├── lib/
│   │   ├── gemini.ts          # Gemini AI service (chat, costs, images)
│   │   ├── supabase.ts        # Supabase client configuration
│   │   ├── pdfHelper.ts       # PDF report generation
│   │   ├── LoadingContext.tsx  # Global loading state provider
│   │   └── utils.ts           # Utility functions
│   │
│   └── services/              # Additional service integrations
│
└── public/
    └── showcase/              # Static showcase assets
```

---

## 🤖 Agentic AI Capabilities

Arch Agent operates as an **autonomous multi-agent system** with specialized roles:

### 1. Technical Design Partner
- Analyzes spatial logic, lighting physics, and material compatibility
- Converts natural language into structured **Design Specifications**
- Auto-detects design intent and asks targeted constraint questions

### 2. Cost Estimator (Quantity Surveyor)
- Calibrated for **Bengaluru, India** luxury market rates (May 2026)
- Formula: `Material Grade + Sq. Footage + Labor Complexity + Market Inflation`
- Always includes a **10% Precision Buffer** as contingency
- Returns structured JSON for programmatic table rendering

### 3. Visualizer & 3D Orchestrator
- Generates prompts optimized for: *ray-tracing, 8K resolution, volumetric lighting, PBR textures*
- Multi-variant generation (4 parallel renders with varied lighting styles)
- Automatic model warm-up for faster inference

### LLM Configuration
| Model | Use Case |
|---|---|
| `gemini-3.1-flash-lite` | Chat, cost estimation, title generation, prompt enhancement |
| `FLUX.1-schnell` | High-speed architectural image generation |
| `TRELLIS` | 3D mesh synthesis from images/prompts |

---

## 🗺️ Pages & Routing

| Route | Page | Description |
|---|---|---|
| `/` | **HomePage** | Landing page with hero section, feature cards, and smooth scroll |
| `/login` | **LoginPage** | Supabase-powered authentication |
| `/orchestration` | **OrchestrationPage** | Main AI workspace — chat, image gen, cost analysis, 3D viewer |
| `/showcase` | **ShowcasePage** | Portfolio gallery of generated designs |
| `/demo` | **DemoPage** | Interactive platform demo |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Health check — reports configured API keys |
| `POST` | `/api/generate-image` | Generate architectural visualization (HF → Pollinations fallback) |
| `POST` | `/api/generate-3d` | Generate 3D mesh via TRELLIS |
| `POST` | `/api/warmup-hf` | Pre-warm Hugging Face models |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Srinivas RC](mailto:srinivasrc0408@gmail.com)**

*Arch Agent — Where Neural Intelligence Meets Architectural Excellence*

</div>
