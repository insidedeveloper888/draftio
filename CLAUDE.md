# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Draftio** is an enterprise-grade AI Requirements Architect for Business Analysts. It generates functional and technical specifications in real-time using AI-powered conversations. Built with React 19, Vite, and Google Gemini AI, it features real-time cloud sync with Firebase and Firestore.

View the app in AI Studio: https://ai.studio/apps/drive/1Wbjd4E-euLSMaWhF7rzRvC4SDzHGgLle

## Development Commands

### Setup
```bash
npm install
```

### Environment Configuration
Set the `GEMINI_API_KEY` in `.env.local` with your Gemini API key:
```
GEMINI_API_KEY=your_api_key_here
```

### Running the App
```bash
npm run dev     # Starts dev server on http://0.0.0.0:3000
npm run build   # Build for production
npm run preview # Preview production build
```

## Architecture Overview

### Application Structure
Draftio follows a flat component structure with clear separation of concerns:

- **`App.tsx`** - Main application container managing:
  - Authentication state (Firebase Auth with Google Sign-In)
  - Project management (create, load, save, delete)
  - Real-time Firestore sync for collaborative projects
  - Local storage fallback when Firebase is unavailable
  - Chat message history and AI interaction orchestration

- **`components/`**
  - `ChatPane.tsx` - Chat interface for conversational requirements gathering
  - `EditorPane.tsx` - Dual-pane editor for functional and technical specs
  - `MermaidRenderer.tsx` - Renders Mermaid diagrams embedded in specifications

- **`services/`**
  - `geminiService.ts` - Gemini AI integration with structured JSON response schema
  - `firebase.ts` - Firebase initialization and service exports (Auth, Firestore, Storage)

- **`types.ts`** - TypeScript type definitions for messages, projects, and specifications
- **`constants.ts`** - System instructions and prompts for the AI architect

### Key Design Patterns

#### 1. Firebase Service Architecture
The `firebase.ts` service module uses a defensive initialization pattern:
- Checks if Firebase is already initialized via `getApps()` to avoid registry conflicts
- Exports both service instances (`auth`, `db`, `storage`) and Firebase functions
- Provides `isFirebaseEnabled()` helper to check if core services are available
- Falls back to local storage if Firebase initialization fails

#### 2. AI Conversation Flow
The `GeminiService` class orchestrates AI-powered spec generation:
- Maintains conversation history with full context (including attachments)
- Uses structured output with `responseMimeType: "application/json"` and `responseSchema`
- Returns consistently formatted responses: `{ projectName, functional, technical, chatResponse }`
- Maps conversation history roles: `user` → `user`, `assistant` → `model` for Gemini API
- Supports file attachments (images, PDFs, etc.) via `inlineData` with base64 encoding

#### 3. Real-time Data Sync
Projects are synced in real-time using Firestore:
- Uses `onSnapshot` with `orderBy("updatedAt", "desc")` query for live updates
- Automatically falls back to localStorage if Firestore is unavailable
- Save operations attempt cloud save first, fall back to localStorage on failure
- Projects include `lastEditedBy`, `lastEditedAvatar`, and `ownerId` for collaboration metadata

#### 4. Environment Variable Handling
Vite configuration maps environment variables:
- `GEMINI_API_KEY` from `.env.local` → `process.env.API_KEY` in code
- Uses `loadEnv()` and `define` in `vite.config.ts` for compile-time injection

### Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite 6.2
- **AI Model**: Google Gemini 3 Pro (via `@google/genai` 1.3.0)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Icons**: lucide-react 0.475.0

### Default Technical Architecture
The AI system is configured to generate specs using this default tech stack (see `constants.ts`):
- **Frontend**: React 19 with Tailwind CSS
- **Backend**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **Automation/Integration**: n8n

The AI architect is instructed to ask clarifying questions and engage in discovery dialogue rather than jump to conclusions.

## Important Implementation Details

### Gemini API Integration
- Model ID: `gemini-3-pro-preview`
- Requires `GoogleGenAI` initialization with `{ apiKey: process.env.API_KEY }`
- Response text is extracted via `.text` property, then parsed as JSON
- Supports multimodal input (text + images/PDFs) via `inlineData` parts

### Firebase Configuration
The Firebase configuration is hardcoded in `firebase.ts` for the `draft-io` project:
- Project ID: `draft-io`
- Uses Google Auth provider for sign-in
- Firestore collection: `projects`
- Exports `onAuthStateChanged`, `User` type, and all Firestore functions for type safety

### State Management
No external state management library is used. All state is managed via React hooks:
- `useState` for local component state
- `useEffect` for side effects (auth listeners, Firestore subscriptions)
- `useCallback` and `useMemo` for performance optimization

### Styling Approach
Uses Tailwind CSS utility classes with custom scrollbar styles defined inline via `<style>` tags in components.
