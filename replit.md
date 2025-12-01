# LB_LifeBuilder - Mobile PWA

## Overview

LB_LifeBuilder is a gamified life goal management application that treats personal development as an "Earth Game." The app transforms the PDCA (Plan-Do-Check-Act) cycle into an engaging experience where users build six life "monuments" (Career, Wealth, Emotion, Family, Health, Experience) through completing tasks and processing emotions. The core philosophy treats "emotion" and "action" as convertible energies—both inner work (emotional processing) and outer work (task completion) contribute to life progress.

The application uses AI as a "Spirit Guide" that helps users convert vague intentions into concrete, SMART actions through a conversational interface. It implements a unique "Sedona Method" for emotional processing and features recursive task breakdown to handle overwhelming goals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool. The application is designed as a mobile-first Progressive Web App (PWA) with a focus on native app feel and offline capabilities.

**Component Library**: shadcn/ui built on Radix UI primitives with Tailwind CSS for styling. This choice provides accessible, customizable components with a consistent design system.

**State Management**: TanStack Query (React Query) handles server state management, providing caching, background updates, and optimistic UI updates. Local UI state is managed with React hooks.

**Routing**: Wouter for lightweight client-side routing, chosen for its minimal footprint suitable for mobile PWA.

**Design System**:
- Dark mode primary with glowing accent elements
- Mobile-optimized type scale (16px base, 12px-36px range)
- Haptic feedback for all interactions using Web Vibration API
- Progressive disclosure to minimize cognitive load
- Animation library: canvas-confetti for celebration effects

**Key Design Decisions**:
- Maximum viewport constraint of 512px (max-w-lg) to maintain mobile UX on larger screens
- Touch target minimum of 44px × 44px for accessibility
- Safe area insets for iOS notch/home indicator compatibility
- Streaming AI responses to eliminate loading states >1s

### Backend Architecture

**Runtime**: Node.js with Express.js server framework.

**API Design**: RESTful endpoints for CRUD operations with real-time streaming for AI interactions. The server acts as a "Smart Hub" that centralizes business logic rather than pushing complexity to the client.

**AI Integration**: 
- Google Gemini API (via @google/genai and @ai-sdk/google)
- Hybrid model strategy: gemini-1.5-flash for speed-critical operations (chat, intent classification), potential gemini-1.5-pro for complex reasoning
- Streaming responses using Vercel AI SDK (`ai` package) to provide real-time typing effects
- Intent classification layer routes user input to appropriate system prompts (Mood/Task/Refinement)

**Key Backend Logic**:
- Intent classification determines user's energy flow (inner vs outer work)
- SMART Guard transforms vague inputs into 3 concrete action options
- Recursive task breakdown when users feel stuck
- Sedona Method implementation for emotional processing (3-step: Identify → Allow → Release)

### Data Storage

**Database**: PostgreSQL via Neon serverless (@neondatabase/serverless) chosen for serverless compatibility and WebSocket support.

**ORM**: Drizzle ORM provides type-safe database operations with minimal overhead.

**Schema Design**:

1. **monuments**: Six fixed life areas with progress tracking
   - Uses `slug` for human-readable identifiers
   - Tracks `totalXp` for gamification
   - Stores UI metadata (`color`, `icon`)

2. **tasks**: Recursive tree structure supporting infinite nesting
   - `parent_id` self-referencing foreign key enables breakdown
   - `monument_id` links tasks to life areas
   - `type` enum distinguishes "action" vs "inner_work" (emotional processing)
   - `category` enum (E/A/P/X) classifies by life formula component:
     - E (Elimination): Removing obstacles
     - A (Accumulation): Building through repetition
     - P (Planning): Direction correction
     - X (eXperience): Creating meaning
   - `metadata` JSONB column stores flexible data (emotion tags, context, AI reasoning) without schema changes
   - `status` enum tracks completion state

3. **sessions**: Maintains conversational flow state
   - Tracks current step in 5-step flow
   - Stores selected monument for context
   - Records message history as JSONB
   - Maintains flow type (mood vs task)

**Trade-offs**: 
- JSONB metadata chosen over normalized tables for flexibility during rapid iteration
- Self-referencing tasks table simpler than separate tasks/subtasks tables
- Neon serverless provides auto-scaling but may have cold start latency

### External Dependencies

**AI Services**:
- Google Gemini API: Primary AI provider for conversational interface and intent classification
- Requires `GEMINI_API_KEY` environment variable

**Database**:
- Neon PostgreSQL: Serverless Postgres with WebSocket support
- Requires `DATABASE_URL` environment variable
- Uses connection pooling via @neondatabase/serverless

**Third-Party Libraries**:
- Vercel AI SDK (`ai`): Streaming text generation utilities
- Radix UI: Headless component primitives (15+ components: dialog, dropdown, accordion, etc.)
- TanStack Query: Async state management
- Drizzle ORM: Type-safe database layer with drizzle-kit for migrations
- Tailwind CSS: Utility-first styling with custom theme configuration
- canvas-confetti: Celebration animations for task completion
- Wouter: Lightweight routing
- Zod: Runtime type validation (via drizzle-zod)

**Build Tools**:
- Vite: Frontend build tool with React plugin
- esbuild: Server-side bundling for deployment
- TypeScript: End-to-end type safety
- PostCSS with Autoprefixer: CSS processing

**Development Dependencies**:
- @replit plugins: Runtime error overlay, cartographer, dev banner for Replit-specific features

**Font Strategy**: System fonts for native feel (SF Pro on iOS, Roboto on Android) with web fallback to Inter and Noto Sans TC (Traditional Chinese support).

**PWA Configuration**: 
- Manifest at `/client/public/manifest.json`
- Standalone display mode for app-like experience
- Theme color #030712 (dark gray)
- Supports safe area insets for modern iOS devices

### Authentication

**Replit Auth (OpenID Connect)**:
- Uses Replit's built-in authentication via OpenID Connect
- Supports multiple login methods (Google, GitHub, Apple, email/password)
- Session management via PostgreSQL (`auth_sessions` table) using connect-pg-simple
- Key files:
  - `server/replitAuth.ts`: Handles OIDC setup, session management, and user upsert
  - `shared/schema.ts`: Contains `replitUsers` and `authSessions` tables

**Auth Endpoints**:
- `GET /api/login`: Initiates OAuth flow
- `GET /api/callback`: OAuth callback handler
- `GET /api/logout`: Ends session and redirects to OIDC logout
- `GET /api/auth/status`: Returns current auth state
- `GET /api/auth/user`: Returns authenticated user details (protected)

**Security Features**:
- Secure cookies in production (HTTPS)
- SameSite=lax for CSRF protection
- Token refresh for expired access tokens
- Sessions stored in PostgreSQL with TTL