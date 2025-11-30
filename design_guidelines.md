# LB_LifeBuilder Mobile PWA Design Guidelines

## Design Approach

**Reference-Based Approach**: Draw inspiration from **Linear** (clean interactions, optimistic UI), **Duolingo** (gamification, progress tracking), and **Headspace** (calming mood flows, centered cards).

**Core Principles**:
- Native mobile app feel with instant feedback
- Minimal cognitive load through progressive disclosure
- Haptic and visual confirmation for every action
- Dark mode primary with glowing accent elements
- Zero loading states >1s (streaming responses)

---

## Typography

**Font Stack**: System fonts for native feel
- iOS: `-apple-system, SF Pro Display`
- Android: `Roboto`
- Fallback: `system-ui, sans-serif`

**Type Scale** (Mobile-optimized):
- **Hero Text**: `text-4xl` (36px) - Monument names, state check options
- **Heading**: `text-2xl` (24px) - Section titles, AI responses
- **Body**: `text-base` (16px) - Task content, chat messages
- **Caption**: `text-sm` (14px) - Timestamps, XP values
- **Micro**: `text-xs` (12px) - Metadata, badges

**Weights**: Regular (400), Medium (500), Semibold (600)

---

## Layout System

**Spacing Primitives**: Use Tailwind units `4, 6, 8, 12, 16` for consistency
- Outer padding: `px-4` (16px) - Screen edges
- Card padding: `p-6` (24px) - Interior spacing
- Stack gap: `space-y-4` (16px) - Vertical rhythm
- Bottom nav clearance: `pb-24` (96px) - Safe area for fixed nav

**Container Constraints**:
- Max width: `max-w-lg` (512px) centered for larger devices
- Full viewport height: `min-h-screen` with `safe-area-inset` support
- Touch target minimum: `44px × 44px` (tap-friendly)

---

## Component Library

### Navigation
**Bottom Tab Bar** (Fixed position):
- 4 icons: Home, Monuments, History, Profile
- Active state: Glow effect with `shadow-lg shadow-primary/50`
- Height: `h-16` with `backdrop-blur-xl bg-gray-900/80`

### Cards
**State Check Options** (Step 1):
- Large tappable cards: `h-40` with centered content
- Icon (Heroicons): `w-12 h-12` above text
- Hover: `scale-105 transition-transform`

**Monument Selection** (Step 2):
- Grid layout: `grid-cols-2 gap-4` (2 columns)
- Each card: `aspect-square` with monument icon + name
- Progress ring: Circular progress indicator overlay

### Chat Interface
**Message Bubbles**:
- User messages: Right-aligned, `bg-blue-600 rounded-2xl`
- AI messages: Left-aligned, `bg-gray-800 rounded-2xl`
- Streaming indicator: Animated ellipsis
- Padding: `px-4 py-3`

**Quick Action Buttons** (3 SMART options):
- Full-width pills: `rounded-full bg-gray-800 border border-gray-700`
- Single-tap selection with immediate haptic feedback
- Active state: `bg-primary border-primary`

### Task List
**Task Items**:
- Checkbox: Large `w-6 h-6` with checkmark animation
- Swipe actions: Left swipe reveals "Too Hard" (recursive breakdown)
- Tree structure: Indentation with `ml-6` for children
- Completion animation: Fade out + confetti burst

### Monument Visualization
**Progress Display**:
- Circular progress ring with percentage
- "Brick animation": Small squares flying from bottom → monument
- XP counter: Animated number increment
- Glow intensity increases with progress

### Buttons
**Primary Actions**:
- Full-width: `w-full rounded-xl py-4`
- Background: `bg-gradient-to-r from-blue-600 to-purple-600`
- Shadow: `shadow-lg shadow-blue-500/30`
- Active state: `scale-95` with `haptic feedback`

**Secondary Actions**:
- Outlined: `border-2 border-gray-700 rounded-xl py-3`
- Hover: `bg-gray-800/50`

---

## Animations & Feedback

**Micro-interactions** (Use sparingly):
- Button tap: `scale-95` + vibrate(10ms)
- Task completion: Confetti burst (2s duration)
- Monument update: Light pulse + glow expansion
- AI typing: Dot wave animation
- Page transitions: Slide left/right (swipe gestures)

**Performance**:
- Use `transform` and `opacity` only (GPU-accelerated)
- Disable animations if `prefers-reduced-motion`

**Haptic Patterns**:
- Light: Task check, button tap
- Medium: Monument selection, mode switch
- Heavy: Task completion, XP milestone

---

## Visual Treatment

**Dark Mode Palette** (Primary):
- Background: `bg-gray-950`
- Cards: `bg-gray-900/80` with `backdrop-blur`
- Borders: `border-gray-800`
- Text: `text-gray-100`
- Accents: Glowing blues/purples (`shadow-blue-500/50`)

**Monument Color Coding**:
- Career: Blue (`#3B82F6`)
- Wealth: Gold (`#F59E0B`)
- Emotion: Purple (`#A855F7`)
- Family: Pink (`#EC4899`)
- Health: Green (`#10B981`)
- Experience: Orange (`#F97316`)

---

## Special Considerations

**PWA Optimizations**:
- Splash screen: Monument logo on dark background
- App icon: 512×512 rounded square with monument silhouette
- Status bar: `theme-color=#030712` (gray-950)
- Viewport lock: `user-scalable=0, maximum-scale=1`

**Accessibility**:
- Touch targets: Minimum `44px`
- Font scaling: Support up to 200%
- Focus indicators: `ring-2 ring-primary`
- ARIA labels: All interactive elements

**Loading States**:
- Skeleton screens (not spinners) for monument grid
- Streaming text appears character-by-character
- Optimistic UI: Instant task checkbox toggle before server confirmation