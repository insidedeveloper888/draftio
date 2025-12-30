# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Draftio** is an AI-powered requirements management platform for Business Analysts. Through conversational AI (Google Gemini), it generates functional specs, technical specs, and implementation plans in real-time. Features collaborative editing with project locking and real-time Firestore sync.

## Development Commands

```bash
npm install           # Install dependencies
npm run dev           # Dev server at http://0.0.0.0:3000
npm run build         # Production build
npm run preview       # Preview production build
```

No lint or test commands are configured.

### Environment
Create `.env.local` with:
```
GEMINI_API_KEY=your_api_key_here
```

Vite maps this to `process.env.API_KEY` at build time via `vite.config.ts`.

## Architecture Overview

No `src/` folder - core files in root, with `components/` and `services/` subdirectories. Use `@/` path alias for imports (maps to project root).

### Structure
```
├── App.tsx              # Main container: auth, project CRUD, Firestore sync, locking, AI orchestration
├── types.ts             # TypeScript interfaces (Task, Milestone, TeamMember, etc.) + enums
├── constants.ts         # SYSTEM_INSTRUCTION prompt (AI architect behavior)
├── components/
│   ├── ChatPane.tsx     # Chat interface with file attachments
│   ├── EditorPane.tsx   # Triple-tab editor (Functional/Technical/Implementation Plan)
│   ├── ProjectPane.tsx  # Kanban board with drag-and-drop task management
│   ├── TaskDetailPanel.tsx   # Task detail view with assignees, time logs, comments
│   ├── TaskExtractionModal.tsx # Modal for reviewing AI-extracted tasks before import
│   ├── AssigneeSelector.tsx  # Team member selector dropdown
│   ├── TimeLogForm.tsx  # Time entry logging form
│   ├── CommentThread.tsx # Task comments with threading
│   ├── MilestoneBar.tsx # Visual milestone progress bar
│   ├── MermaidRenderer.tsx  # Mermaid diagrams with pan/zoom (Figma-like)
│   ├── MarkdownRenderer.tsx # Markdown with Mermaid block detection
│   ├── Avatar.tsx       # User avatar component
│   └── UserGuide.tsx    # Help modal
└── services/
    ├── geminiService.ts # Gemini API client: spec generation + task extraction
    └── firebase.ts      # Firebase init + Firestore/Auth/Storage helpers
```

### Key Design Patterns

#### App Modes
The app has two modes controlled by `AppMode` type:
- **Specs Mode** (`specs`): AI-powered requirements generation with chat, editors for functional/technical specs and implementation plans
- **Project Mode** (`project`): Kanban board for task management with milestones, assignees, time tracking, and comments

#### Project Locking System
Collaborative editing uses pessimistic locking:
- User must acquire lock before editing (via `runTransaction`)
- Lock includes: `lockedBy`, `lockedByName`, `lockedByAvatar`, `lockedAt`, `lastActivityAt`
- Auto-unlock after 15 minutes of inactivity
- Stale locks (>15 min) can be stolen by other users
- Uses both `myLockTimestampRef` (ref for callbacks) and `myLockTimestamp` (state for UI)
- Read-only mode for non-lock holders with real-time updates via `onSnapshot`

#### Gemini API Integration
- Model: `gemini-3-pro-preview` (via `@google/genai` SDK)
- Uses structured output with `responseMimeType: "application/json"` and `responseSchema`
- Two API methods in `GeminiService`:
  - `generateSpec()`: Spec generation → `{ projectName, functional, technical, implementationPlan, chatResponse }`
  - `extractTasks()`: Parses implementation plan → `{ tasks, milestones, chatResponse }`
- Role mapping: `user` → `user`, `assistant` → `model`
- Supports multimodal input (images, PDFs) via `inlineData` with base64 encoding
- Date context injected into system instruction for accurate Gantt charts

#### Kanban Task Management
- Tasks have status: `todo` | `in_progress` | `in_review` | `done`
- Drag-and-drop between columns updates status
- Tasks can be assigned to team members, have due dates, time estimates, and dependencies
- Milestones group tasks into phases/sprints
- AI extracts tasks from implementation plans via `extractTasks()` method

#### Real-time Sync
- `onSnapshot` listeners for project list and active project
- Falls back to localStorage if Firestore unavailable
- Projects stored in `projects` collection with `orderBy("updatedAt", "desc")`

#### AI-Generated Specs Default Stack
The AI architect (configured in `constants.ts`) generates specs assuming:
- Frontend: React 19 + Tailwind CSS
- Backend: Next.js (App Router)
- Database: Supabase (PostgreSQL)
- Automation: n8n

This is for *generated documentation*, not Draftio itself. The `PESTIO_SPEC` constant serves as a quality benchmark example.

## Implementation Notes

### Firebase
- Project ID: `draft-io` (config hardcoded in `firebase.ts`)
- Collections: `projects` (main data including tasks/milestones), `users` (team members)
- Auth: Google Sign-In via `GoogleAuthProvider`
- `isFirebaseEnabled()` checks if auth/db initialized successfully

### State Management
React hooks only (no Redux/Zustand). Uses refs alongside state for callback-stable values (see `myLockTimestampRef` pattern in `App.tsx`).

### Styling
Tailwind CSS utilities. Custom scrollbar styles via inline `<style>` tags.

### Vite Config
- Path alias: `@/` → project root
- Exposes `GEMINI_API_KEY` as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
- Dev server: `0.0.0.0:3000`
