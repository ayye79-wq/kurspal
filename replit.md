# Kurspal

## Overview

AI-powered course-aware study companion for online students. Students add their courses with syllabi and materials, then get AI assistance for discussion prompts — the AI knows what the class is covering, generates drafts in the student's own voice, suggests classmate replies, and refines writing iteratively.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Wouter routing (artifact: `classmate-ai`, path `/`)
- **API framework**: Express 5 (artifact: `api-server`, path `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4` in libs, `zod` in api-server), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **AI**: OpenAI via Replit AI Integration (`@workspace/integrations-openai-ai-server`)
- **File upload**: Multer (memory storage) + pdf-parse for PDF text extraction
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Architecture

### Shared Libraries (`lib/`)
- `lib/api-spec` — OpenAPI spec + orval codegen config
- `lib/api-client-react` — Generated React Query hooks (from orval)
- `lib/api-zod` — Generated Zod schemas (from orval)
- `lib/db` — Drizzle ORM schema + client
- `lib/integrations-openai-ai-server` — OpenAI client (server-side, Replit AI Integration)
- `lib/integrations-openai-ai-react` — OpenAI client (client-side, Replit AI Integration)

### DB Schema (`lib/db/src/schema/`)
- `courses.ts` — `courses` (id, name, instructor, term, description, color) and `course_materials` (id, courseId, title, materialType, content, fileName) tables
- `assignments.ts` — `assignments` (courseId FK nullable) and `drafts` tables
- `tone.ts` — `tone_profiles` table
- `conversations.ts` — `conversations` and `messages` tables

### API Routes (`artifacts/api-server/src/routes/`)
- `health.ts` — GET /api/healthz
- `courses.ts` — CRUD for courses, materials (JSON paste + file upload via multipart)
  - POST /api/courses/:id/materials/upload — accepts multipart/form-data with PDF/txt/md files
- `assignments.ts` — CRUD for assignments (with optional ?courseId filter), stats, drafts
- `tone.ts` — GET/POST /api/tone-profile (with AI tone analysis)
- `ai.ts` — SSE streaming AI endpoints (analyze, draft, refine, classmate-replies)
  - All AI endpoints accept optional `courseId` — fetches course syllabus + materials as context

### Frontend Pages (`artifacts/classmate-ai/src/pages/`)
- `courses.tsx` — Course list dashboard; create/delete courses; color-coded cards
- `course-detail.tsx` — Course detail: materials sidebar (add/delete), assignments list, Open Workspace button
- `workspace.tsx` — Main AI workspace; course-aware when `?courseId=` param present; shows "Working in [Course]" badge
- `assignments.tsx` — Global assignment history across all courses; stat cards (courses, assignments, drafts)
- `assignment-detail.tsx` — Individual assignment view with drafts; links back to course
- `tone-profile.tsx` — Writing sample input + voice analysis display
- `not-found.tsx` — 404 page

### Frontend Components
- `components/layout.tsx` — Sidebar with course list (color dots), New Course link, Workspace/Assignments/Tone Profile
- `hooks/use-sse.ts` — Custom SSE streaming hook for AI endpoints

## AI Endpoints (SSE Streaming)
All AI endpoints return `text/event-stream`. Each chunk: `data: {"content": "..."}\n\n`. Final: `data: {"done": true}\n\n`.

- `POST /api/ai/analyze` — Breaks down prompt; uses course syllabus/materials as context
- `POST /api/ai/draft` — Generates draft; course-specific concepts referenced when available
- `POST /api/ai/refine` — Refines draft based on instruction
- `POST /api/ai/classmate-replies` — Thoughtful reply to classmate post

## Course Context in AI
When `courseId` is passed to AI endpoints, the server:
1. Fetches the course name/instructor/term
2. Pulls the syllabus material (first 3000 chars)
3. Pulls up to 3 other materials (first 1500 chars each)
4. Appends all as a `--- COURSE CONTEXT ---` block to the system prompt

## OpenAI Model
- Most routes (`ai.ts` analyze/draft/refine/classmate, `tone.ts` summaries) use `gpt-4o-mini` with `max_completion_tokens`.
- The public demo endpoint (`demo.ts`, `/api/ai/demo`) uses `gpt-5-mini` for a sharper first impression. Because gpt-5 is a reasoning model (reasoning tokens count against the budget), it sets `reasoning_effort: "low"` and `max_completion_tokens: 2000` so the visible answer isn't starved.
- No `temperature` param on gpt-5+ calls.
- Backlog (proposed): upgrade the remaining `gpt-4o-mini` routes to `gpt-5-mini` app-wide.

## Backlog (remind user)
- **Chrome Extension** — Auto screen capture, right-click "Explain with Kurspal", and side-panel explanation. Requires a separate Chrome extension artifact (Manifest v3, `chrome.desktopCapture`, `chrome.contextMenus`, `chrome.sidePanel`). Paused — user asked to revisit later.
- **Smart highlight inside output (#6)** — Tap a sentence → "Explain this part more" popover. Needs Selection API + popover component.
- **Auto-organize materials (#8)** — Auto-label topic, group by course, suggest summaries on upload. Needs backend logic in materials upload handler.
- **Progress feeling (#10)** — "You've studied 3 topics today", "Ready for quiz?" — needs session tracking (localStorage or DB).

## Scan Feature
- Body parser limit set to 15mb in `app.ts` to support base64 image uploads via `/api/ai/scan`.

## Authentication (Replit Auth)
- OIDC/PKCE flow via `openid-client` v6
- Sessions stored in `sessions` DB table; users in `users` DB table
- `users.is_premium` (bool) + `users.premium_expires_at` (timestamp) added for Stripe later
- Auth middleware in `artifacts/api-server/src/middlewares/authMiddleware.ts` — runs on every request
- Auth routes: `GET /api/login`, `GET /api/callback`, `GET /api/logout`, `GET /api/auth/user`
- Frontend: `@workspace/replit-auth-web` lib (`lib/replit-auth-web/`) exposes `useAuth()` hook
- Layout shows user avatar + name + premium badge (signed in) or "Sign in to save progress" (signed out)
- `useUsage(isServerPremium?)` — accepts server-side premium status from `user.isPremium`
- `course-detail.tsx` wires `authUser.isPremium` → `useUsage` so paywall truth comes from the DB

## Business Model — 7-day Free Trial → Subscription
- **Trial**: 7 days of full access from account `createdAt` — no card required. Computed server-side from `users.created_at + 7 days`.
- **Soft lock**: After trial + no subscription → 5 AI calls/day (same as old free tier). Premium users: unlimited.
- **Subscription plans** (Stripe, web):
  - Monthly: `price_1TTShoPSK0ydTqRoaLrUC35S` — $4.99/month
  - Annual: `price_1TTShsPSK0ydTqRonwnWj2dz` — $39.99/year (~33% off)
  - Product: `prod_USNSfFqCjGgh8h` — "Kurspal Premium"
- **Mobile**: RevenueCat subscriptions (monthly + annual packages from current offering)
- Trial info exposed via `/api/auth/user` response: `trialEndsAt` (ISO string) — computed from DB `createdAt`
- Sidebar shows green "X days left in trial" banner + purple "Upgrade to Premium" button for non-premium users
- Paywall modal has Monthly/Annual toggle; defaults to Annual

## Stripe Payments
- Package: `stripe` + `stripe-replit-sync` installed at workspace root
- Stripe integration connected via Replit Integrations; production keys connected
- Credentials fetched fresh each request via `getUncachableStripeClient()` / `getStripePublishableKey()` in `artifacts/api-server/src/stripeClient.ts`
- `stripe-replit-sync` manages the `stripe` schema in Postgres (29 tables: products, prices, customers, subscriptions, etc.)
- `initStripe()` in `index.ts`: runs migrations → creates StripeSync → configures managed webhook → backfill in background
- Webhook route at `/api/stripe/webhook` registered BEFORE `express.json()` in `app.ts` (critical for raw Buffer)
- `webhookHandlers.ts` handles: `checkout.session.completed` (activate premium, save subscriptionId), `customer.subscription.updated` (update status), `customer.subscription.deleted` (revoke premium), `charge.refunded` (revoke premium)
- Checkout: `POST /api/stripe/checkout` with `{ priceId }` → `mode: "subscription"` → returns `{ url }` → redirect to Stripe Hosted Checkout
- Success URL includes `{CHECKOUT_SESSION_ID}` for webhook confirmation
- Frontend: `use-checkout.ts` exports `PRICE_MONTHLY` + `PRICE_ANNUAL` constants and `useCheckout()` hook
- `paywall-modal.tsx` — monthly/annual toggle, defaults to annual; `startCheckout(priceId)` called on CTA
- Success/cancel pages: `/checkout/success` and `/checkout/cancel` with auto-redirect back to `/courses`

## App Store Compliance
- **AI consent modal** (`ai-consent-modal.tsx`) — shown once after onboarding, blocks app use until accepted. Stored in `localStorage` under `kurspal_ai_consent_v1`. Covers: what AI does, what data is sent to OpenAI, privacy policy, and AI accuracy disclaimer.
- **AI disclaimer** — "AI-generated · may contain errors · verify with your course materials" shown below every ExplainOutput (both sectioned and fallback modes)
- **No "coming soon" flows** — all buttons are functional; Stripe checkout is live
- **Full review flow**: Onboarding → AI consent → Courses → Course detail → Explain → Paywall (if limit hit) → Sign in → Stripe checkout → Success page

## Important Notes
- SSE endpoints: use `fetch` + `ReadableStream` on client — NOT orval-generated hooks
- File upload for materials: `POST /api/courses/:id/materials/upload` is NOT in OpenAPI spec — call `fetch()` with FormData directly
- Tone profile: 404 response means no profile exists yet (use `retry: false` in query options)
- AI integration env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` (set by Replit)
- `zod/v4` works in lib packages; use plain `zod` in `artifacts/api-server`
