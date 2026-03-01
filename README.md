# M.U.S.T.Learn

**AI-powered Universal Learning Layer** — connect your tools, synthesize materials, find knowledge gaps, get a study plan, practice with an AI coach, and track your progress in one place.

---

## Overview

M.U.S.T.Learn is a full-stack learning platform that helps learners **unify content from Google Classroom, Notion, YouTube, and Canvas** (or manual paste), then **analyze**, **identify gaps**, and **improve** with AI. The app uses **MiniMax** (LLM + TTS + video) and **ElevenLabs** for voice to deliver:

- **Unified synthesis** — One coherent analysis from scattered materials  
- **Knowledge gaps** — What’s missing or unclear (with mark-as-addressed and prioritization)  
- **Prioritized study plan** — Ordered actions with rationale  
- **Knowledge graph** — Topics and prerequisite/dependency edges from syntheses  
- **Practice & flashcards** — MCQ and short-answer with explanations; flashcard review with known/unknown and spaced repetition  
- **Speaking coach** — Voice-based Explain, Teach-back gaps, Exam style, and Debate modes  
- **Speaking assessments** — History and detail views with scores and feedback  
- **Narration** — Listen to the study plan (MiniMax TTS)  
- **File library** — Upload, list, and reuse materials (Supabase S3)  
- **Dashboard** — Connected tools, AI insights, “This Week” summary, knowledge graph preview, 3D mascot, and in-app AI chat  

Authentication is handled by **Clerk**; user and synthesis data live in **Supabase** (Postgres + S3-compatible storage).

---

## Features

| Feature | Description |
|--------|-------------|
| **Dashboard** | Home: connected platform cards (Classroom, Notion, YouTube, Canvas), AI-generated insight cards, knowledge graph preview, “This Week” stats (study time, topics mastered, gaps closed, top gaps to close), in-app AI chat, and 3D mascot (interactive). |
| **Synthesize** | Paste or select from Library → get **Topics**, **Knowledge Gaps**, **Study Plan**, and **Knowledge Graph**. Optional: practice question bank, flashcards, study-plan narration, AI-generated video. “Practice with Speaking Coach” links to coach with topics and gaps. |
| **Library** | List/delete/download uploaded files; “Choose from Library” in Synthesize sends selected file contents for synthesis. Upload uses presigned S3 URLs. |
| **Speaking Coach** | Voice practice with modes: **Explain topics**, **Teach back gaps**, **Exam style**, **Debate** (motion + for/against). Coach replies via MiniMax; TTS via ElevenLabs or MiniMax. Notes (save selections); session and assessment history. |
| **Speaking assessments** | List past sessions and scores; drill into a session for full transcript, scores, and feedback. |
| **Knowledge Graph** | Dedicated screen: visualize topic nodes and edges (from synthesis or demo data). Dashboard shows a preview with “Explore” to this screen. |
| **Gap Analysis** | Focused view on **Knowledge Gaps** from all syntheses: search, filter by topic, chart “Gaps by topic,” mark gaps as addressed (persisted). “View all” from Dashboard top gaps links here. |
| **Search** | Search across your content (Exa, library, YouTube). |
| **Planner** | Study planning and scheduling. |
| **Integrations** | **YouTube** (OAuth, watch history), **Google Classroom** (OAuth, courses/assignments), **Notion** (OAuth, query DB, create/update pages, append blocks), **Canvas** (OAuth, courses, assignments). |
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
| **Optional** | MiniMax Video (Hailuo-2.3), MiniMax Music (music-2.5); Canvas, Notion, Google Classroom, YouTube APIs |
| **API** | Vite dev server middleware (same-origin `/api/*`); handlers written in Vercel-style (req/res). |

---

## Project Structure

```
cracked-vibers/
├── index.html
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.ts          # dashboard, synthesize, library, coach, speaking-assessments, search, knowledge-graph, gaps, planner, youtube, classroom, notion, login, signup, onboarding
│   │   ├── components/       # Layout, ProtectedRoute, KnowledgeGraph, ChatbotGLB, voice/SpeakingCoach, ui/*
│   │   ├── screens/          # Dashboard, Synthesize, Library, SpeakingCoach, SpeakingAssessmentHistory, SpeakingAssessmentDetail, Search, KnowledgeGraph, GapAnalysis, Planner, YouTube, Classroom, Notion, Login, SignUp, Onboarding, NotFound
│   │   ├── hooks/            # e.g. useStudySession (if present)
│   │   └── api/              # Next.js API routes (when using Next)
│   ├── lib/
│   │   ├── minimax.ts
│   │   ├── canvas.ts
│   │   └── db.ts
│   └── styles/
├── api/                      # Vercel-style handlers (Vite dev server)
│   ├── init-user.ts
│   ├── health.ts, me.ts, db-test.ts
│   ├── storage-*.ts
│   ├── chat.ts, chat-messages.ts
│   ├── synthesize.ts, syntheses-list.ts, synthesis-get.ts
│   ├── narrate.ts
│   ├── questions.ts
│   ├── mastery-get.ts, mastery-update.ts
│   ├── coach-response.ts
│   ├── tts-eleven.ts
│   ├── oral-session.ts
│   ├── video.ts, music.ts
│   ├── gaps-addressed.ts
│   ├── insights.ts
│   ├── streak-record.ts, streak-get.ts
│   ├── card-review.ts, card-review-due.ts
│   ├── speaking-assessments-list.ts, speaking-assessment-detail.ts, speaking-session-complete.ts, speaking-coach-notes.ts
│   ├── search-exa.ts, search-library.ts, search-youtube.ts
│   ├── youtube-auth.ts, youtube-callback.ts, youtube-watch-history.ts, youtube-data.ts
│   ├── canvas-auth-url.ts, canvas-callback.ts, canvas-fetch.ts
│   ├── google-classroom-auth.ts, google-classroom-auth-callback.ts, google-classroom-data.ts
│   ├── notion-auth.ts, notion-auth-callback.ts, notion-data.ts, notion-query-database.ts, notion-create-page.ts, notion-update-page.ts, notion-append-blocks.ts
│   └── ...
├── prompts/
│   └── ai-moderator-spec-summary.txt
├── supabase/
│   └── canvas-oauth-tables.sql
├── vite.config.ts
└── package.json
```

---

## Environment Variables

Use `.env.example` as a template. Main variables:

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
| `SUPABASE_S3_*` | S3-compatible endpoint, region, keys, bucket (for Library uploads). |

### API Base URL (optional)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base when using Next.js for API. Leave empty to use Vite dev server `/api/*`. |

### MiniMax

| Variable | Description |
|----------|-------------|
| `MINIMAX_API_KEY_M25` | MiniMax M2.5 LLM (synthesis, chat, coach, questions). |
| `MINIMAX_API_KEY_SPEECH` | MiniMax T2A (narration / TTS). |
| `MINIMAX_API_KEY_VIDEO` | Optional; MiniMax video (Hailuo-2.3). |
| `MINIMAX_API_KEY_MUSIC` | Optional; MiniMax music. |

### ElevenLabs (optional)

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | Used by `/api/tts-eleven` and Speaking Coach TTS. |
| `ELEVENLABS_VOICE_ID` | Optional; default voice. |

### Integrations (optional)

| Variable | Description |
|----------|-------------|
| `CANVAS_PERSONAL_TOKEN`, `CANVAS_BASE_URL` | Canvas LMS. |
| Notion / Google / YouTube | Per integration; see `.env.example` or integration-specific docs. |

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
# Edit .env with Clerk, Supabase, MiniMax (and optional ElevenLabs, Canvas, Notion, Google, YouTube) keys.
```

### Run development (Vite + embedded API)

```bash
pnpm dev
```

App: **http://localhost:3000**

### Run production build

```bash
pnpm build
```

Static output is in `dist/`. For production, run the same API handlers on a Node server or deploy to Vercel (Next.js or serverless).

---

## API Reference (Vite / Vercel-style handlers)

All handlers expect JSON where noted and return JSON.

| Method | Path | Body / Query | Description |
|--------|------|--------------|-------------|
| POST | `/api/init-user` | — (Bearer in `Authorization`) | Sync Clerk user to `app_users`. |
| GET  | `/api/health` | — | Health check. |
| GET  | `/api/me` | — | Current user info. |
| GET  | `/api/db-test` | — | Test Supabase / `app_users`. |
| POST | `/api/storage-upload-url` | `{ objectKey, contentType }` | Presigned PUT URL for S3. |
| POST | `/api/storage-delete` | `{ objectKey }` | Delete object from S3. |
| POST | `/api/storage-list` | `{ prefix }` | List objects by prefix. |
| POST | `/api/storage-download-url` | `{ objectKey }` | Presigned GET URL. |
| POST | `/api/chat` | `{ messages: [{ role, content }] }` | MiniMax M2.5 chat. |
| GET  | `/api/chat-messages` | — (Bearer) | List chat history. |
| POST | `/api/synthesize` | `{ materials[, userId, title] }` | Synthesis (topics, gaps, plan, knowledge graph); optional persist to `user_syntheses`. |
| POST | `/api/narrate` | `{ text }` | MiniMax TTS; returns `{ audioUrl }`. |
| POST | `/api/syntheses-list` | `{ userId }` | List recent syntheses. |
| POST | `/api/synthesis-get` | `{ userId, synthesisId }` | Get one synthesis by ID. |
| POST | `/api/questions` | `{ userId?, topics, count? }` | Generate practice questions (MiniMax). |
| POST | `/api/mastery-get` | (per frontend) | Get mastery state. |
| POST | `/api/mastery-update` | (per frontend) | Update mastery. |
| POST | `/api/coach-response` | `{ conversationHistory, messageIndex, topics, knowledgeGaps, studyPlan, mode?, debateMotion?, debateSide? }` | Next coach message (MiniMax). |
| POST | `/api/tts-eleven` | `{ text[, voiceId] }` | ElevenLabs TTS; returns audio. |
| POST | `/api/oral-session` | `{ userId, topics }` | Save oral practice session. |
| POST | `/api/gaps-addressed` | `{ userId[, addressedIds] }` | Get or update list of gap IDs marked addressed. |
| POST | `/api/insights` | `{ userId }` | AI-generated insight cards from syntheses. |
| POST | `/api/streak-record` | `{ userId }` | Record login day (streak). |
| POST | `/api/streak-get` | `{ userId }` | Get streak info. |
| POST | `/api/card-review` | `{ userId, questionId, synthesisId?, known, questionSnapshot? }` | Save flashcard as known/unknown (spaced review). |
| POST | `/api/card-review-due` | `{ userId }` | List cards due for review. |
| GET  | `/api/speaking-assessments-list` | `?userId=&limit=` | List speaking sessions + assessments. |
| GET  | `/api/speaking-assessment-detail` | (per frontend) | Detail for one session. |
| POST | `/api/speaking-session-complete` | (per frontend) | Save completed speaking session/assessment. |
| GET  | `/api/speaking-coach-notes` | — (Bearer) | List user notes. |
| POST | `/api/speaking-coach-notes` | `{ content[, source, sessionId] }` | Save a note. |
| POST | `/api/video` | `{ prompt }` | Create MiniMax video task. |
| GET  | `/api/video?task_id=...` | — | Query video task status/URL. |
| POST | `/api/music` | `{ lyrics[, prompt] }` | MiniMax music. |
| GET  | `/api/youtube-auth` | — | YouTube OAuth start. |
| GET  | `/api/youtube-callback` | — | YouTube OAuth callback. |
| GET  | `/api/youtube-watch-history` | — (Bearer) | YouTube watch history. |
| GET  | `/api/youtube-data` | — (Bearer) | YouTube data. |
| POST | `/api/canvas/auth-url` | (form/body) | Canvas OAuth URL. |
| GET  | `/api/canvas/callback` | — | Canvas OAuth callback. |
| GET  | `/api/canvas/fetch` | `?type=courses|assignments&courseId=` | Canvas courses/assignments. |
| GET  | `/api/google-classroom-auth` | — | Google Classroom OAuth. |
| GET  | `/api/google-classroom-auth/callback` | — | Callback. |
| GET  | `/api/google-classroom-data` | — (Bearer) | Classroom data. |
| GET  | `/api/notion-auth` | — | Notion OAuth. |
| GET  | `/api/notion-auth/callback` | — | Callback. |
| GET  | `/api/notion-data` | — (Bearer) | Notion data. |
| GET  | `/api/notion-query-database` | (query) | Notion DB query. |
| POST | `/api/notion-create-page` | (body) | Notion create page. |
| POST | `/api/notion-update-page` | (body) | Notion update page. |
| POST | `/api/notion-append-blocks` | (body) | Notion append blocks. |
| POST | `/api/search-exa` | (body) | Exa search. |
| POST | `/api/search-library` | (body) | Search library. |
| POST | `/api/search-youtube` | (body) | Search YouTube. |

---

## Database (Supabase)

Create these in the Supabase SQL editor if missing.

### `app_users`

- `id` (UUID, PK), `clerk_user_id` (TEXT, unique)  
- Synced by `/api/init-user`.

### `user_syntheses`

- `id`, `user_id`, `title`, `materials`, `markdown`, `topics` (JSONB), `knowledge_graph` (JSONB), `created_at`  
- Filled by `api/synthesize.ts` when `userId` is provided.

### `oral_practice_sessions`

- `id` (UUID), `user_id` (TEXT), `topics` (JSONB), `created_at`  
- Filled by `/api/oral-session`.

### `user_gap_addressed`

- `user_id`, `addressed_gap_ids` (array), `updated_at`  
- Used by `/api/gaps-addressed` for “mark as addressed.”

### Optional (for full feature set)

- **Canvas**: `oauth_state`, `canvas_connections` (see `supabase/canvas-oauth-tables.sql`).  
- **Flashcards**: table for card review (e.g. `user_id`, `question_id`, `known`, `next_review_at`, `question_snapshot`).  
- **Speaking**: tables for sessions and assessments (per speaking-assessments-list / speaking-session-complete).  
- **Notes**: table for speaking coach notes (per speaking-coach-notes).  
- **Streaks**: e.g. `user_login_days` for streak-record / streak-get.

---

## Synthesis Output Format

The MiniMax synthesis prompt produces markdown with:

- **## Topics** — Bullet list of topic labels.  
- **## Knowledge Gaps** — What’s missing or unclear.  
- **## Study Plan** — Numbered actions with rationale.  
- **## Knowledge Graph** — JSON: `{ "nodes": [{ "id", "label" }], "edges": [{ "from", "to", "type": "prerequisite" }] }`.

The frontend parses this for the Knowledge Graph view, practice questions by topic, and narration (study plan).

---

## Speaking Coach Modes

- **Explain** — User explains topics; coach asks follow-ups.  
- **Teach back gaps** — User teaches back gap items; coach checks understanding.  
- **Exam style** — Timed, exam-like Q&A.  
- **Debate** — User argues for/against a motion; moderator gives time cues and feedback.

Coach behavior is customizable via `prompts/ai-moderator-spec-summary.txt`.

---

## License

Private / unlicensed unless otherwise specified. Use according to your team’s terms.

---

## Summary

M.U.S.T.Learn is a React (Vite) + Clerk + Supabase app that connects **Google Classroom, Notion, YouTube, and Canvas**, synthesizes materials with **MiniMax**, surfaces **knowledge gaps** (with mark-as-addressed and prioritization), generates **study plans** and **knowledge graphs**, provides **practice questions** and **flashcards** (with spaced review), and a **voice-based Speaking Coach** with multiple modes and assessment history. The **Dashboard** ties it together with connected tools, AI insights, knowledge graph preview, and an interactive 3D mascot. APIs run on the Vite dev server or can be deployed via Next.js/Vercel; secrets stay server-side.
