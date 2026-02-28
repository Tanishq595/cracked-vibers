# Project Structure — M.U.S.T.Learn (cracked-vibers)

```
cracked-vibers/
├── api/                                    # Vercel-style API handlers (Vite dev server)
│   ├── canvas-auth-url.ts                  # POST: Canvas OAuth URL, store state
│   ├── canvas-callback.ts                  # GET: Canvas OAuth callback, store token
│   ├── canvas-fetch.ts                     # GET: Canvas courses/assignments (user or fallback token)
│   ├── chat.ts                             # POST: MiniMax M2.5 chat
│   ├── chat-messages.ts                    # Chat message persistence
│   ├── coach-response.ts                   # POST: Speaking coach (MiniMax)
│   ├── db-test.ts                          # GET: Supabase connection test
│   ├── google-calendar-auth.ts             # Google Calendar OAuth
│   ├── google-classroom-auth.ts            # GET: redirect to Google Classroom OAuth
│   ├── google-classroom-auth-callback.ts   # GET: exchange code, set cookie, redirect
│   ├── google-classroom-data.ts            # Google Classroom data (courses, etc.)
│   ├── health.ts                           # GET: health check
│   ├── init-user.ts                        # POST: sync Clerk user to app_users (Supabase)
│   ├── mastery-get.ts                      # POST: get mastery state
│   ├── mastery-update.ts                   # POST: update mastery
│   ├── me.ts                               # GET: current user info
│   ├── music.ts                            # POST: MiniMax music
│   ├── narrate.ts                          # POST: MiniMax TTS (study plan)
│   ├── oral-session.ts                     # POST: save oral practice session
│   ├── questions.ts                        # POST: practice questions (MiniMax)
│   ├── search-exa.ts                       # Search (Exa)
│   ├── search-library.ts                   # Search library content
│   ├── search-youtube.ts                   # Search YouTube
│   ├── storage-delete.ts                   # POST: delete S3 object
│   ├── storage-download-url.ts             # POST: presigned download URL
│   ├── storage-list.ts                     # POST: list S3 by prefix
│   ├── storage-upload-url.ts               # POST: presigned upload URL
│   ├── syntheses-list.ts                   # POST: list user syntheses
│   ├── synthesis-get.ts                    # POST: get synthesis by ID
│   ├── synthesize.ts                       # POST: synthesize (MiniMax), optional persist
│   ├── tts-eleven.ts                       # POST: ElevenLabs TTS
│   ├── video.ts                            # POST/GET: MiniMax video (Hailuo)
│   ├── youtube-auth.ts                     # YouTube OAuth
│   ├── youtube-callback.ts                 # YouTube OAuth callback
│   ├── youtube-data.ts                     # YouTube API data
│   ├── youtube-watch-history.ts            # YouTube watch history
│   └── ...
│
├── guidelines/
│   └── Guidelines.md
│
├── prompts/
│   └── ai-moderator-spec-summary.txt       # Speaking coach spec
│
├── public/
│   ├── bot/
│   │   ├── Bear.glb
│   │   ├── Bear_Backflip.glb
│   │   ├── Bear_Hello.glb
│   │   ├── Bear_Running.glb
│   │   ├── Bear_talking.mp4
│   │   ├── Bear_Walking.glb
│   │   └── ...
│   ├── company_logo/
│   │   └── logo.png
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── pdf.worker.min.js
│   ├── vercel.svg
│   └── window.svg
│
├── src/
│   ├── main.tsx                            # React root, ClerkProvider, App
│   ├── proxy.ts                            # Clerk middleware (Next.js)
│   │
│   ├── app/
│   │   ├── App.tsx                         # RouterProvider, error boundary
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx                      # Next.js root layout
│   │   ├── page.tsx                        # Next.js landing
│   │   ├── routes.ts                       # React Router routes
│   │   │
│   │   ├── api/                            # Next.js API routes (when using Next)
│   │   │   ├── canvas/fetch/route.ts
│   │   │   ├── narrate/route.ts
│   │   │   └── synthesize/route.ts
│   │   │
│   │   ├── components/
│   │   │   ├── AIChatAssistant.tsx
│   │   │   ├── ChatbotGLB.tsx
│   │   │   ├── ErrorPage.tsx
│   │   │   ├── KnowledgeGraph.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── PdfEditorViewer.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── RootLayout.tsx
│   │   │   ├── figma/
│   │   │   │   └── ImageWithFallback.tsx
│   │   │   ├── ui/                         # Radix/shadcn primitives
│   │   │   │   ├── accordion.tsx, alert-dialog.tsx, alert.tsx, aspect-ratio.tsx,
│   │   │   │   ├── avatar.tsx, badge.tsx, breadcrumb.tsx, button.tsx, calendar.tsx,
│   │   │   │   ├── card.tsx, carousel.tsx, chart.tsx, checkbox.tsx, collapsible.tsx,
│   │   │   │   ├── command.tsx, context-menu.tsx, dialog.tsx, drawer.tsx,
│   │   │   │   ├── dropdown-menu.tsx, form.tsx, hover-card.tsx, input-otp.tsx,
│   │   │   │   ├── input.tsx, label.tsx, menubar.tsx, navigation-menu.tsx,
│   │   │   │   ├── pagination.tsx, popover.tsx, progress.tsx, radio-group.tsx,
│   │   │   │   ├── resizable.tsx, scroll-area.tsx, select.tsx, separator.tsx,
│   │   │   │   ├── sheet.tsx, sidebar.tsx, skeleton.tsx, slider.tsx, sonner.tsx,
│   │   │   │   ├── switch.tsx, table.tsx, tabs.tsx, textarea.tsx, toggle-group.tsx,
│   │   │   │   ├── toggle.tsx, tooltip.tsx, use-mobile.ts, utils.ts
│   │   │   └── voice/
│   │   │       ├── SpeakingCoach.tsx
│   │   │       └── useConversation.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # Next.js dashboard (Canvas + synthesize)
│   │   │
│   │   └── screens/                       # Main app screens (React Router)
│   │       ├── Classroom.tsx
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
│   │       ├── Upload.tsx
│   │       └── YouTube.tsx
│   │
│   ├── lib/
│   │   ├── canvas.ts                       # Canvas LMS API (OAuth + token)
│   │   ├── db.ts
│   │   ├── googleClassroom.ts              # Google Classroom API
│   │   └── minimax.ts                      # MiniMax: M2.5, TTS, video, music
│   │
│   └── styles/
│       ├── fonts.css
│       ├── index.css
│       ├── tailwind.css
│       └── theme.css
│
├── supabase/
│   └── canvas-oauth-tables.sql             # oauth_state, canvas_connections
│
├── .env
├── .env.example
├── .env.local
├── .gitignore
├── ATTRIBUTIONS.md
├── eslint.config.mjs
├── index.html                              # Vite entry
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── tsconfig.json
├── vercel.json
└── vite.config.ts                          # Vite + API middleware + Tailwind
```

## Quick reference

| Area                 | Purpose |
|----------------------|--------|
| **api/**             | Backend handlers for `/api/*` (Canvas, Google Classroom/Calendar, YouTube, MiniMax, storage, etc.) |
| **src/app/api/**     | Next.js API routes (when running Next) |
| **src/app/screens/** | Main UI: Dashboard, Library, Classroom, YouTube, Synthesize, Login, etc. |
| **src/app/components/** | Layout, UI primitives, AIChatAssistant, PdfEditorViewer, voice coach |
| **src/lib/**         | Canvas, Google Classroom, MiniMax, DB helpers |
| **public/**          | Static assets, 3D GLB models, PDF worker, logos |
