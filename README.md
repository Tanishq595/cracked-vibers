# M.U.S.T.Learn

**AI-powered Universal Learning Layer** — synthesize materials from multiple sources, find knowledge gaps, get a study plan, practice with an AI coach, and listen to narrated summaries.

---

## Overview

M.U.S.T.Learn is a full-stack learning platform that helps learners unify content from **Google Classroom**, **Notion**, **YouTube**, **Canvas**, or manual paste. The app uses **MiniMax** (LLM + TTS + video) and **ElevenLabs** for voice to deliver:

- **Unified synthesis** — One coherent analysis from scattered materials  
- **Knowledge gaps** — What’s missing or unclear  
- **Prioritized study plan** — Ordered actions with rationale  
- **Knowledge graph** — Topics and prerequisite/dependency edges  
- **Practice questions** — MCQ and short-answer with explanations  
- **Speaking coach** — Voice-based explain/teach-back and debate modes  
- **Narration** — Listen to the study plan (MiniMax TTS)  
- **File library** — Upload, list, and reuse materials (Supabase S3)

Authentication is handled by **Clerk**; user and synthesis data live in **Supabase** (Postgres + S3-compatible storage).

---

## Features

| Feature | Description |
|--------|-------------|
| **Dashboard** | Overview, platform cards (Classroom, Notion, YouTube, Canvas), insights, AI chat, and 3D chatbot. |
| **Synthesize** | Paste learning materials → get Topics, Knowledge Gaps, Study Plan, and Knowledge Graph (JSON). Optional practice Q&A and study-plan narration. |
| **Upload** | Drag-and-drop or select files; presigned URLs to Supabase S3; per-user `uploads/{userId}/` prefix. |
| **Library** | List/delete/download uploaded files; “Synthesize from Library” sends selected file contents to Synthesize. |
| **Speaking Coach** | Voice practice with modes: **Explain topics**, **Teach back gaps**, **Exam style**, **Debate** (motion + for/against). Coach replies via MiniMax; TTS via ElevenLabs or MiniMax. |
| **Search** | Search across your content (UI entry point). |
| **Knowledge Graph** | Visualize topic nodes and prerequisite/dependency edges from synthesis. |
| **Gap Analysis** | Focused view on identified knowledge gaps. |
| **Planner** | Study planning and scheduling. |
| **Auth** | Login, Sign up, Onboarding; protected routes with Clerk; user synced to `app_users` on first load. |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, React Router 7, Vite 6, Tailwind CSS 4, Radix UI, Motion, Recharts, React Three Fiber (3D), Lucide icons |
| **Auth** | Clerk (React + backend verification) |
| **Database** | Supabase (Postgres) |
| **Storage** | Supabase S3-compatible (AWS SDK presigned URLs) |
| **AI / LLM** | MiniMax (M2.5 — Anthropic-compatible API) |
| **TTS** | MiniMax T2A (async), ElevenLabs (optional, for Speaking Coach) |
| **Optional** | MiniMax Video (Hailuo-2.3), MiniMax Music (music-2.5); Canvas API (integration) |
| **API** | Vite dev server middleware (same-origin `/api/*`) or Next.js API routes; handlers written in Vercel-style (req/res). |

---

## Project Structure

```
cracked-vibers/
├── index.html              # Vite entry HTML
├── src/
│   ├── main.tsx            # React root, ClerkProvider, App
│   ├── app/
│   │   ├── App.tsx         # RouterProvider, error boundary
│   │   ├── routes.ts       # React Router routes (dashboard, synthesize, upload, library, coach, search, knowledge-graph, gaps, planner, login, signup, onboarding)
│   │   ├── page.tsx        # Next.js landing (M.U.S.T.Learn) — used if running Next
│   │   ├── dashboard/
│   │   │   └── page.tsx    # Next.js dashboard page (synthesize + narrate)
│   │   ├── components/     # Layout, ProtectedRoute, KnowledgeGraph, voice/SpeakingCoach, UI (Radix-based)
│   │   ├── screens/       # Dashboard, Synthesize, Upload, Library, SpeakingCoach, Search, KnowledgeGraph, GapAnalysis, Planner, Login, SignUp, Onboarding, NotFound
│   │   └── api/           # Next.js API route handlers (synthesize, narrate) — used when API runs on Next
│   ├── lib/
│   │   └── minimax.ts      # MiniMax: M2.5 chat, T2A async TTS, video (Hailuo), music
│   └── styles/
│       └── index.css       # Global Tailwind
├── api/                    # Vercel-style API handlers (used by Vite dev server)
│   ├── init-user.ts        # Clerk → app_users sync
│   ├── health.ts, me.ts, db-test.ts
│   ├── storage-upload-url.ts, storage-delete.ts, storage-list.ts, storage-download-url.ts
│   ├── chat.ts             # MiniMax M2.5 chat
│   ├── synthesize.ts       # Synthesis + optional persist to user_syntheses
│   ├── narrate.ts          # MiniMax TTS for study plan
│   ├── syntheses-list.ts, synthesis-get.ts
│   ├── questions.ts        # Practice questions (MiniMax)
│   ├── mastery-get.ts, mastery-update.ts
│   ├── coach-response.ts   # Speaking coach reply (MiniMax; uses prompts/ai-moderator-spec-summary.txt)
│   ├── tts-eleven.ts       # ElevenLabs TTS
│   ├── oral-session.ts     # Save oral practice session
│   ├── video.ts            # MiniMax video (create/query)
│   └── music.ts            # MiniMax music generation
├── prompts/
│   └── ai-moderator-spec-summary.txt   # Coach behavior spec
├── vite.config.ts          # Vite + Tailwind; dev server mounts all /api/* handlers
├── next.config.ts          # Next.js config (optional)
└── package.json
```

---

## Environment Variables

Create a `.env` (or `.env.local`) in the project root. Use `.env.example` as a template; below is the full set referenced by the app.

### Auth (Clerk)

| Variable | Description |
|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend). |
| `CLERK_SECRET_KEY` | Clerk secret key (backend; required for `/api/init-user`). |

### Database & Storage (Supabase)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (API only; do not expose). |
| `DATABASE_URL` | Optional; direct Postgres URL (e.g. migrations). |
| `SUPABASE_S3_ENDPOINT` | S3-compatible endpoint (e.g. `https://<ref>.storage.supabase.co/storage/v1/s3`). |
| `SUPABASE_S3_REGION` | e.g. `ap-southeast-2`. |
| `SUPABASE_S3_ACCESS_KEY_ID` | Storage access key. |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | Storage secret key. |
| `SUPABASE_S3_BUCKET` | Bucket name (e.g. `meet-learn-uploads`). |

### API Base URL (optional)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base (e.g. `http://localhost:3000` when using Next.js for API). Leave empty to use Vite dev server for `/api/*`. |

### MiniMax

| Variable | Description |
|----------|-------------|
| `MINIMAX_API_KEY_M25` | MiniMax M2.5 LLM (synthesis, chat, coach, questions). |
| `MINIMAX_API_KEY_SPEECH` | MiniMax T2A (narration / TTS). |
| `MINIMAX_API_KEY_VIDEO` | Optional; MiniMax video (Hailuo-2.3). |
| `MINIMAX_API_KEY_MUSIC` | Optional; MiniMax music (music-2.5). |

### ElevenLabs (optional)

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | Used by `/api/tts-eleven` and Speaking Coach TTS. |
| `ELEVENLABS_VOICE_ID` | Optional; default voice (e.g. Rachel). |

### Canvas (optional)

| Variable | Description |
|----------|-------------|
| `CANVAS_PERSONAL_TOKEN` | Canvas LMS API token. |
| `CANVAS_BASE_URL` | e.g. `canvas.instructure.com`. |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn)

### Install

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env with your Clerk, Supabase, MiniMax (and optionally ElevenLabs, Canvas) keys.
```

### Run development (Vite + embedded API)

The Vite dev server serves the React app and all `/api/*` routes via middleware (see `vite.config.ts`). No separate Next.js server needed.

```bash
pnpm dev
```

App: **http://localhost:3000**

### Run production build

```bash
pnpm build
```

Static output is in `dist/`. Serve with any static host; for production APIs you would typically run the same handlers on a Node server or deploy to Vercel (Next.js or serverless).

### Using Next.js for API and landing

If you prefer to run the Next.js app (landing + dashboard + API routes):

- Ensure `src/app/api/synthesize/route.ts` and `src/app/api/narrate/route.ts` are used by your Next server.
- Set `VITE_API_URL` to your Next server URL when running the Vite app against it.

---

## API Reference (Vite / Vercel-style handlers)

All handlers expect JSON where noted and return JSON.

| Method | Path | Body / Query | Description |
|--------|------|--------------|-------------|
| POST | `/api/init-user` | — (Bearer token in `Authorization`) | Sync Clerk user to `app_users`. |
| GET  | `/api/health` | — | Health check. |
| GET  | `/api/me` | — | Current user info (if any). |
| GET  | `/api/db-test` | — | Test Supabase connection / `app_users`. |
| POST | `/api/storage-upload-url` | `{ objectKey, contentType }` | Presigned PUT URL for S3 upload. |
| POST | `/api/storage-delete` | `{ objectKey }` | Delete object from S3. |
| POST | `/api/storage-list` | `{ prefix }` | List objects under prefix. |
| POST | `/api/storage-download-url` | `{ objectKey }` | Presigned GET URL for download. |
| POST | `/api/chat` | `{ messages: [{ role, content }] }` | MiniMax M2.5 chat. |
| POST | `/api/synthesize` | `{ materials[, userId, title] }` | Synthesis (topics, gaps, plan, knowledge graph); optionally persists to `user_syntheses`. |
| POST | `/api/narrate` | `{ text }` | MiniMax TTS; returns `{ audioUrl }`. |
| POST | `/api/syntheses-list` | `{ userId }` | List recent syntheses for user. |
| POST | `/api/synthesis-get` | `{ synthesisId }` | Get one synthesis by ID. |
| POST | `/api/questions` | `{ userId?, topics, count? }` | Generate practice questions (MiniMax). |
| POST | `/api/mastery-get` | (body as used by frontend) | Get mastery state. |
| POST | `/api/mastery-update` | (body as used by frontend) | Update mastery. |
| POST | `/api/coach-response` | `{ conversationHistory, messageIndex, topics, knowledgeGaps, studyPlan, mode?, debateMotion?, debateSide? }` | Next coach message (MiniMax). |
| POST | `/api/tts-eleven` | `{ text[, voiceId] }` | ElevenLabs TTS; returns audio. |
| POST | `/api/oral-session` | `{ userId, topics }` | Save oral practice session. |
| POST | `/api/video` | `{ prompt }` | Create MiniMax video task; returns `task_id`. |
| GET  | `/api/video?task_id=...` | — | Query video task; returns status/URL. |
| POST | `/api/music` | `{ lyrics[, prompt] }` | MiniMax music generation. |

---

## Database (Supabase)

These tables are used by the API; create them in the Supabase SQL editor if missing.

### `app_users`

- `id` (UUID, PK)
- `clerk_user_id` (TEXT, unique)
- Synced by `/api/init-user` on first authenticated load.

### `user_syntheses`

- `id`, `user_id`, `title`, `materials`, `markdown`, `topics` (JSONB), `knowledge_graph` (JSONB), `created_at`
- Filled by `api/synthesize.ts` when `userId` is provided.

### `oral_practice_sessions`

- `id` (UUID), `user_id` (TEXT), `topics` (JSONB), `created_at`
- Filled by `/api/oral-session`.

---

## Synthesis Output Format

The MiniMax synthesis prompt produces markdown with these sections:

- **## Topics** — Bullet list of topic labels.  
- **## Knowledge Gaps** — What’s missing or unclear.  
- **## Study Plan** — Numbered actions with rationale.  
- **## Knowledge Graph** — A single JSON block: `{ "nodes": [{ "id", "label" }], "edges": [{ "from", "to", "type": "prerequisite" }] }`.

The frontend parses this to drive the Knowledge Graph view, practice questions (by topic), and narration (study plan section).

---

## Speaking Coach Modes

- **Explain** — User explains topics; coach asks follow-ups.  
- **Teach back gaps** — User teaches back gap items; coach checks understanding.  
- **Exam style** — Timed, exam-like Q&A.  
- **Debate** — User argues for/against a motion; moderator gives time cues and final feedback.

Coach logic and tone can be customized via `prompts/ai-moderator-spec-summary.txt`.

---

## License

Private / unlicensed unless otherwise specified. Use according to your team’s terms.

---

## Summary

M.U.S.T.Learn is a React (Vite) + Clerk + Supabase app that uses MiniMax (and optionally ElevenLabs) to synthesize learning materials, surface gaps, generate study plans and knowledge graphs, run practice Q&A, and provide a voice-based speaking coach. APIs run either on the Vite dev server or via Next.js/Vercel; all secrets stay server-side.
