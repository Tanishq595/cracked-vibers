# Project Structure — M.U.S.T.Learn (cracked-vibers)

```
cracked-vibers/
├── api/                          # Vercel-style API handlers (used by Vite dev server)
│   ├── canvas-auth-url.ts        # POST: get Canvas OAuth URL, store state
│   ├── canvas-callback.ts        # GET: Canvas OAuth callback, exchange code, store token
│   ├── canvas-fetch.ts           # GET: fetch Canvas courses/assignments (user token or fallback)
│   ├── chat.ts                   # POST: MiniMax M2.5 chat
│   ├── coach-response.ts         # POST: Speaking coach reply (MiniMax)
│   ├── db-test.ts                # GET: test Supabase connection
│   ├── health.ts                 # GET: health check
│   ├── init-user.ts              # POST: sync Clerk user to app_users (Supabase)
│   ├── mastery-get.ts            # POST: get mastery state
│   ├── mastery-update.ts         # POST: update mastery
│   ├── me.ts                     # GET: current user info
│   ├── music.ts                  # POST: MiniMax music generation
│   ├── narrate.ts                # POST: MiniMax TTS (study plan narration)
│   ├── oral-session.ts           # POST: save oral practice session
│   ├── questions.ts              # POST: generate practice questions (MiniMax)
│   ├── storage-delete.ts         # POST: delete object from S3
│   ├── storage-download-url.ts  # POST: presigned download URL
│   ├── storage-list.ts           # POST: list S3 objects by prefix
│   ├── storage-upload-url.ts     # POST: presigned upload URL
│   ├── syntheses-list.ts         # POST: list user syntheses
│   ├── synthesis-get.ts          # POST: get one synthesis by ID
│   ├── synthesize.ts             # POST: synthesize materials (MiniMax), optional persist
│   ├── tts-eleven.ts             # POST: ElevenLabs TTS
│   └── video.ts                  # POST/GET: MiniMax video (Hailuo)
│
├── guidelines/
│   └── Guidelines.md
│
├── prompts/
│   └── ai-moderator-spec-summary.txt   # Speaking coach behavior spec
│
├── public/
│   ├── bot/                      # 3D mascot models
│   │   ├── Bear.glb
│   │   ├── Bear_Backflip.glb
│   │   ├── Bear_Hello.glb
│   │   ├── Bear_Running.glb
│   │   └── Bear_Walking.glb
│   ├── company_logo/
│   │   └── logo.png
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── src/
│   ├── main.tsx                  # React root, ClerkProvider, App
│   ├── proxy.ts                  # Clerk middleware (Next.js)
│   │
│   ├── app/
│   │   ├── App.tsx               # RouterProvider, error boundary
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx            # Next.js root layout
│   │   ├── page.tsx              # Next.js landing (M.U.S.T.Learn)
│   │   ├── routes.ts             # React Router routes
│   │   │
│   │   ├── api/                  # Next.js API routes (when using Next)
│   │   │   ├── canvas/
│   │   │   │   └── fetch/
│   │   │   │       └── route.ts
│   │   │   ├── narrate/
│   │   │   │   └── route.ts
│   │   │   └── synthesize/
│   │   │       └── route.ts
│   │   │
│   │   ├── components/
│   │   │   ├── ChatbotGLB.tsx
│   │   │   ├── ErrorPage.tsx
│   │   │   ├── KnowledgeGraph.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── RootLayout.tsx
│   │   │   ├── figma/
│   │   │   │   └── ImageWithFallback.tsx
│   │   │   ├── ui/               # Radix-based UI primitives
│   │   │   │   ├── accordion.tsx
│   │   │   │   ├── alert-dialog.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── aspect-ratio.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── breadcrumb.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── calendar.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── carousel.tsx
│   │   │   │   ├── chart.tsx
│   │   │   │   ├── checkbox.tsx
│   │   │   │   ├── collapsible.tsx
│   │   │   │   ├── command.tsx
│   │   │   │   ├── context-menu.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── drawer.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── hover-card.tsx
│   │   │   │   ├── input-otp.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── menubar.tsx
│   │   │   │   ├── navigation-menu.tsx
│   │   │   │   ├── pagination.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── radio-group.tsx
│   │   │   │   ├── resizable.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── slider.tsx
│   │   │   │   ├── sonner.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── toggle-group.tsx
│   │   │   │   ├── toggle.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   ├── use-mobile.ts
│   │   │   │   └── utils.ts
│   │   │   └── voice/
│   │   │       ├── SpeakingCoach.tsx
│   │   │       └── useConversation.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Next.js dashboard (Canvas + synthesize)
│   │   │
│   │   └── screens/              # Main app screens (React Router)
│   │       ├── Dashboard.tsx
│   │       ├── GapAnalysis.tsx
│   │       ├── KnowledgeGraph.tsx
│   │       ├── Landing.tsx
│   │       ├── Library.tsx
│   │       ├── Login.tsx
│   │       ├── NotFound.tsx
│   │       ├── Onboarding.tsx
│   │       ├── Planner.tsx
│   │       ├── Search.tsx
│   │       ├── SignUp.tsx
│   │       ├── SpeakingCoach.tsx
│   │       ├── Synthesize.tsx
│   │       └── Upload.tsx
│   │
│   ├── lib/
│   │   ├── canvas.ts             # Canvas LMS API client (OAuth + token)
│   │   ├── db.ts
│   │   └── minimax.ts            # MiniMax: M2.5, TTS, video, music
│   │
│   └── styles/
│       ├── fonts.css
│       ├── index.css
│       ├── tailwind.css
│       └── theme.css
│
├── supabase/
│   └── canvas-oauth-tables.sql  # oauth_state, canvas_connections
│
├── .env
├── .env.example
├── .env.local
├── .gitignore
├── ATTRIBUTIONS.md
├── eslint.config.mjs
├── index.html                    # Vite entry
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── tsconfig.json
├── vercel.json
└── vite.config.ts                # Vite + API middleware + Tailwind
```

## Quick reference

| Area            | Purpose |
|-----------------|--------|
| **api/**        | Backend handlers for Vite dev server (POST/GET to `/api/*`) |
| **src/app/api/**| Next.js API routes (used when running Next) |
| **src/app/screens/** | Main UI screens (Dashboard, Synthesize, Library, etc.) |
| **src/app/components/** | Layout, UI primitives, voice coach, 3D chatbot |
| **src/lib/**    | Canvas API, MiniMax (LLM/TTS/video/music), DB helpers |
| **public/**     | Static assets, 3D GLB models, logos |
