# Infinite Mandalart PM

## Core Philosophy: The "Lazy Genius Flow"

**Idea → AI Decomposition → Action**

Infinite Mandalart PM transforms the overwhelming process of achieving life goals into a gamified "Earth Game." Instead of drowning in vague intentions, users simply express their ideas, and the AI "Spirit Guide" (數據指導靈) decomposes them into concrete, actionable steps using SMART criteria and the PDCA cycle.

The core insight: **Emotional processing and task completion are convertible energies** - both contribute to building your life "monuments."

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework with TypeScript |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| shadcn/ui (Radix UI) | Accessible component library |
| TanStack Query v5 | Server state management |
| Wouter | Lightweight client-side routing |
| Framer Motion | Animations |
| Recharts | Data visualization |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express.js | Server runtime & API framework |
| TypeScript | Type safety |
| Drizzle ORM | Type-safe database operations |
| Zod | Schema validation |
| Vercel AI SDK (`ai`) | Streaming AI responses |

### AI Integration
| Technology | Purpose |
|------------|---------|
| @ai-sdk/google | Google Gemini SDK |
| @google/genai | Gemini API client |
| gemini-2.5-flash | Primary AI model |

### Database & Auth
| Technology | Purpose |
|------------|---------|
| PostgreSQL (Neon) | Serverless database |
| Drizzle ORM + drizzle-zod | Type-safe queries & validation |
| Replit Auth (OIDC) | Authentication provider |
| connect-pg-simple | Session storage |

### External Services
| Service | Purpose |
|---------|---------|
| Google Places API | Reality Resource Map |
| Google Drive API | Cloud backup |
| Google Calendar API | Task scheduling |

---

## Key Features (Implemented)

### 1. Life Goal Input (Module 1)
- Six life "monuments": Career, Wealth, Emotion, Family, Health, Experience
- Each monument tracks XP progress
- Visual representation with icons and colors

### 2. AI Mandalart Generator (Module 2)
- **Collaborative Chat System**: AI Spirit Guide negotiates tasks with user
- **SMART Goal Decomposition**: Vague goals → Specific, Measurable, Achievable, Relevant, Time-bound actions
- **Eisenhower Matrix (Q1-Q4)**:
  - Q1: Urgent + Important (Do)
  - Q2: Not Urgent + Important (Schedule)
  - Q3: Urgent + Not Important (Delegate)
  - Q4: Not Urgent + Not Important (Delete)
- **EAPX Category System**:
  - E (Elimination): Remove obstacles
  - A (Accumulation): Build through repetition
  - P (Planning): Strategic alignment
  - X (Experience): Create meaningful moments

### 3. Strict JSON Schema Validation (Zod)
- `insertTaskSchema`: Validated task creation
- `insertSessionSchema`: Session state validation
- `insertMonumentSchema`: Monument data validation
- All API inputs validated before database operations

### 4. Multiple View Modes
- **List View**: Traditional task list with quadrant tabs
- **Calendar View**: Time-based scheduling
- **Tree View**: Hierarchical task breakdown visualization
- View mode history tracking

### 5. Emotional Processing (Sedona Method)
- Three-step release process: Identify → Allow → Release
- AI detects emotional content and offers two paths:
  1. Inner release (Sedona guidance)
  2. Continue task discussion
- Integration with task completion flow

### 6. 80/20 Key Action Highlighting
- Auto-highlights top 3 pending tasks by XP value
- Visual differentiation between manual and auto-highlighted actions
- Centralized calculation passed to all views

### 7. Streaming AI Responses
- Real-time streaming display
- JSON content filtering (shows natural language only)
- Immediate final content display on completion

### 8. Task Deduplication
- Prevents duplicate tasks within same session/parent
- Handles mixed-session batches safely
- In-batch duplicate detection

---

## Project Structure

```
.
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── collaborative-chat.tsx  # AI chat interface
│   │   │   ├── task-list.tsx    # List view component
│   │   │   ├── calendar-view.tsx # Calendar view component
│   │   │   ├── tree-view.tsx    # Tree view component
│   │   │   ├── sedona-release.tsx # Emotional processing UI
│   │   │   └── monument-*.tsx   # Monument components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities & helpers
│   │   ├── pages/               # Route pages
│   │   │   ├── home.tsx         # Main dashboard
│   │   │   ├── settings.tsx     # User settings
│   │   │   └── monument-detail.tsx
│   │   ├── App.tsx              # Root component & routing
│   │   └── index.css            # Global styles & design tokens
│   └── index.html               # Entry HTML
├── server/                      # Backend Express application
│   ├── gemini.ts                # AI integration & prompts
│   ├── routes.ts                # API endpoints
│   ├── storage.ts               # Database operations
│   ├── db.ts                    # Database connection
│   ├── google-*.ts              # Google API integrations
│   └── replitAuth.ts            # Authentication setup
├── shared/
│   └── schema.ts                # Drizzle ORM schema & Zod types
├── lib/
│   └── quotes.ts                # Wisdom quotes for AI
├── vercel.json                  # Vercel deployment config
├── drizzle.config.ts            # Drizzle ORM config
└── vite.config.ts               # Vite build config
```

---

## Database Schema

### Core Tables
- `monuments`: Six life areas with XP tracking
- `tasks`: Recursive tree structure (self-referencing `parent_id`)
- `sessions`: Conversation state & message history
- `userSettings`: Preferences (viewMode, aiPersona, theme)

### Supporting Tables
- `auth_sessions`: Replit Auth session storage
- `replit_users`: User profiles
- `viewModeHistory`: UI state tracking
- `healthData`: Apple Health integration (future)
- `savedLocations`: Spatial memory (future)

---

## Development Commands

```bash
npm run dev      # Start development server (Express + Vite)
npm run build    # Production build
npm run check    # TypeScript type checking
npm run db:push  # Push schema changes to database
```

---

## Deployment

**Platform**: Vercel + Neon PostgreSQL

Configuration in `vercel.json`:
- Node.js 20.x runtime
- Build command: `npm run build`
- Output directory: `dist/public`
- Serverless function entry: `api/index.ts`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SESSION_SECRET` | Express session secret |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

---

## License

MIT
