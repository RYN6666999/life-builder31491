# LB_LifeBuilder - Mobile PWA

## Overview

LB_LifeBuilder is a gamified mobile PWA designed to transform personal development into an engaging "Earth Game." It helps users manage life goals, process emotions, and build six life "monuments" (Career, Wealth, Emotion, Family, Health, Experience) by gamifying the PDCA cycle. The application utilizes AI as a "Spirit Guide" to convert vague intentions into concrete, SMART actions and incorporates a "Sedona Method" for emotional processing. Its core philosophy treats emotional processing and task completion as convertible energies contributing to overall life progress.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript and Vite. Mobile-first PWA with offline capabilities.
- **Component Library**: shadcn/ui (Radix UI + Tailwind CSS) for accessible, customizable components.
- **State Management**: TanStack Query for server state; React hooks for local UI state.
- **Routing**: Wouter for lightweight client-side routing.
- **Design System**: Dark mode with glowing accents, mobile-optimized typography, haptic feedback (Web Vibration API), progressive disclosure, and `canvas-confetti` for celebrations.
- **Key Design Decisions**: Max viewport `512px`, 44px touch targets, safe area insets, streaming AI responses.

### Backend

- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful endpoints with real-time streaming for AI interactions. Acts as a "Smart Hub" centralizing business logic.
- **AI Integration**:
    - Google Gemini API (`gemini-1.5-flash` for speed, potential `gemini-1.5-pro` for complex reasoning).
    - Vercel AI SDK for streaming responses.
    - Intent classification routes user input to system prompts (Mood/Task/Refinement).
- **Key Backend Logic**: Intent classification (inner vs. outer work), SMART Guard for action options, recursive task breakdown, and Sedona Method implementation (Identify → Allow → Release).

### Data Storage

- **Database**: PostgreSQL via Neon serverless.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema Design**:
    - `monuments`: Six fixed life areas with progress tracking (`totalXp`, `slug`, UI metadata).
    - `tasks`: Recursive tree structure with `parent_id`, `monument_id`, `type` (action/inner_work), `category` (Elimination/Accumulation/Planning/eXperience), `metadata` (JSONB), and `status`.
    - `sessions`: Stores conversational flow state, selected monument, message history, and flow type.
    - `userSettings`: User preferences (viewMode, aiPersona, theme).
    - `viewModeHistory`: Tracks UI view mode changes.
- **Trade-offs**: JSONB for flexibility, self-referencing tasks table for simplicity, Neon serverless for auto-scaling with potential cold start latency.

### Authentication

- **Provider**: Replit Auth (OpenID Connect) supporting Google, GitHub, Apple, email/password.
- **Session Management**: PostgreSQL (`auth_sessions` table) using `connect-pg-simple`.
- **Security**: Secure cookies, SameSite=lax, token refresh, sessions with TTL.

### Google Places Integration (Reality Resource Map)

- **Purpose**: Helps users find nearby real-world resources (e.g., gym, library).
- **API Endpoints**: `POST /api/places/search`, `GET /api/places/photo`, `GET /api/places/status`.
- **Security**: API key is server-side proxied; never exposed to client.
- **Default Keywords**: Monument-specific keywords for quick searches.

### Development & Deployment

- **Local Development**: `npm run dev`, `npm run build`, `npm run check`, `npm run db:push`.
- **Build Configuration**: Tailwind and PostCSS configurations consolidated in the `client/` directory.
- **Vercel Deployment**: `vercel.json` configures `installCommand` (`npm ci --include=dev`), `buildCommand` (`npm run build`), `outputDirectory` (`dist/public`), and Node.js version 20.
- **Database Driver Selection**: Automatically selects `@neondatabase/serverless` for Replit and standard `pg` for Vercel (Supabase compatibility).

## External Dependencies

- **AI Services**: Google Gemini API.
- **Database**: Neon PostgreSQL.
- **Third-Party Libraries**:
    - Vercel AI SDK (`ai`)
    - Radix UI
    - TanStack Query
    - Drizzle ORM
    - Tailwind CSS
    - canvas-confetti
    - Wouter
    - Zod
- **Build Tools**: Vite, esbuild, TypeScript, PostCSS with Autoprefixer.
- **Development Dependencies**: `@replit` plugins.
- **Font Strategy**: System fonts with web fallbacks (Inter, Noto Sans TC).
- **PWA Configuration**: Manifest, standalone display, theme color #030712, safe area insets.