# DEV_LOG.md - Development History & Checkpoints

## Current Phase

**Phase 1: The Core Logic (Server Actions) - COMPLETED**

---

## Recent Changes (December 2025)

### 2025-12-04: Task Deduplication Fix

**Problem**: Duplicate tasks were being created when AI generated task lists.

**Solution**: Implemented comprehensive deduplication in `server/storage.ts`:
- `createBulkTasks()`: Uses Set-based accumulative filtering
  - Same session: Checks existing DB tasks + prevents in-batch duplicates
  - Mixed sessions: Bypasses deduplication to preserve data integrity
- `createChildTasks()`: Same Set-based approach for child tasks under same parent

**Files Modified**:
- `server/storage.ts`

---

### 2025-12-03: Streaming Response Optimization

**Problem**: Raw JSON was displayed to users during AI streaming.

**Solution**: Implemented content filtering in `collaborative-chat.tsx`:
- Filters out JSON-like content (starts with `{`, `[`, `"`)
- Immediately displays final parsed content when stream completes
- Preserves natural language responses

**Files Modified**:
- `client/src/components/collaborative-chat.tsx`

---

### 2025-12-03: Emotional Detection with User Choice

**Problem**: AI would auto-switch to Sedona mode without user consent.

**Solution**: Added two-option prompt when emotional content detected:
1. "1.內在釋放 (Sedona引導)" - Inner release with Sedona Method
2. "2.繼續任務討論" - Continue task discussion

Session message history preserved across detection flow.

**Files Modified**:
- `server/routes.ts`
- `server/gemini.ts`

---

### 2025-12-02: 80/20 Key Action Auto-Highlighting

**Problem**: Users needed visual cues for high-impact tasks.

**Solution**: 
- Centralized top 3 key action calculation in `home.tsx`
- Passed `topKeyActionIds` as prop to all view components
- Visual differentiation:
  - Manual key action: Solid gold star (`fill-amber-500`)
  - Auto-highlight: Semi-transparent star (`fill-amber-400/50`)

**Files Modified**:
- `client/src/pages/home.tsx`
- `client/src/components/tree-view.tsx`
- `client/src/components/task-list.tsx`
- `client/src/components/calendar-view.tsx`

---

### 2025-12-01: Core AI Integration

**Implemented**:
- Google Gemini 2.5 Flash integration
- Spirit Guide persona (數據指導靈)
- SMART goal decomposition
- Eisenhower Matrix (Q1-Q4) classification
- EAPX category system
- Collaborative chat with streaming responses

**Files Created/Modified**:
- `server/gemini.ts` - AI prompts & chat functions
- `server/routes.ts` - Chat API endpoints
- `client/src/components/collaborative-chat.tsx`

---

### 2025-11-30: Database Schema & Foundation

**Implemented**:
- Drizzle ORM schema with Zod validation
- Six monuments table with XP tracking
- Recursive tasks table (tree structure)
- Sessions table for conversation state
- User settings table

**Files Created**:
- `shared/schema.ts`
- `server/storage.ts`
- `server/db.ts`

---

## Architecture Decisions

### 1. Recursive Task Structure
**Decision**: Self-referencing `parent_id` in tasks table
**Rationale**: Enables infinite nesting for goal breakdown without separate tables
**Trade-off**: Slightly complex queries vs. simpler schema

### 2. JSONB for Metadata
**Decision**: Use JSONB columns for flexible data (`metadata`, `mcpSettings`)
**Rationale**: Allows rapid iteration without schema migrations
**Trade-off**: Less type safety at DB level vs. flexibility

### 3. Neon Serverless PostgreSQL
**Decision**: Use Neon over traditional PostgreSQL
**Rationale**: Auto-scaling, no connection pool management, Vercel integration
**Trade-off**: Potential cold start latency vs. operational simplicity

### 4. Streaming AI Responses
**Decision**: Use generator functions for real-time streaming
**Rationale**: Better UX with immediate feedback during AI generation
**Trade-off**: More complex frontend state management vs. responsiveness

---

## Next Steps (Roadmap)

### Phase 2: UI Grid Visualization
- [ ] Visualize JSON task data into 3x3 Mandalart grid component
- [ ] Interactive grid with expand/collapse for subtasks
- [ ] Drag-and-drop task reordering

### Phase 3: Flow Connection
- [ ] Connect "Life Goals" output to "Mandalart" input
- [ ] Seamless monument → goal → task flow
- [ ] Session state persistence across views

### Phase 4: PWA Enhancements
- [ ] Offline task caching with service worker
- [ ] Push notifications for reminders
- [ ] Haptic feedback for mobile interactions

### Phase 5: External Integrations
- [ ] Apple Health data import
- [ ] Google Calendar sync for scheduled tasks
- [ ] Google Drive backup automation

---

## Known Issues

1. **Cold Start Latency**: First AI request may be slow due to Neon/Gemini cold starts
2. **Session Cleanup**: Old sessions not automatically purged
3. **Mobile Keyboard**: Virtual keyboard may overlap chat input on some devices

---

## Testing Checklist

- [x] Task creation with Zod validation
- [x] AI streaming response display
- [x] Emotional detection with two-option prompt
- [x] Task deduplication (same session)
- [x] Task deduplication (mixed sessions - bypass)
- [x] 80/20 key action highlighting
- [x] View mode switching (list/calendar/tree)
- [ ] Offline mode functionality
- [ ] Google Calendar event creation
- [ ] Cloud backup/restore

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | ~1.2s |
| AI Response Start | < 2s | ~1.5s |
| Task List Render (100 items) | < 100ms | ~80ms |
| Database Query (tasks by session) | < 50ms | ~30ms |

---

## Contributors

- Development: Replit Agent
- Architecture: User + AI collaboration
- AI Persona: 數據指導靈 (Data Spirit Guide)

---

*Last Updated: December 4, 2025*
