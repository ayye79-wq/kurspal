# Kurspal — App Reviewer Instructions

## Overview
Kurspal is an AI-powered study companion that helps students understand their course materials faster. It explains notes, generates quizzes, creates study guides, and helps draft discussion posts.

## Test Flow

### 1. Onboarding
- Launch the app
- You'll see a 3-step onboarding:
  - Screen 1: Welcome / value proposition
  - Screen 2: Add a course (you can skip)
  - Screen 3: Paste sample notes and try an AI explanation (you can skip)
- After onboarding, an **AI disclosure modal** appears explaining how the AI works, what data is sent, and confirming user consent

### 2. Core Features (Free tier — no account needed)

**Explain notes:**
1. Go to any course → click a material or type in the chat box
2. The AI will explain your content with: "What this means", "Key ideas", "Why this matters", and "Say it like this"
3. Free users get 5 explains per day

**Add a course:**
- Tap "New course" on the Courses page
- Fill in course name, optional instructor, semester, description

**Add materials:**
- Inside a course, use the "+" button to add notes (text) or scan a photo

### 3. Premium — Finals Mode ($4.99 / 7 days)

**To test the paywall:**
1. Use the free explain feature 5 times (or try Quiz, Study Guide, Tone controls, or Multi-page scan)
2. A paywall modal appears describing Finals Mode features
3. Tap "Unlock Finals Mode — $4.99"
4. **Sign in with Replit** (required before checkout)
5. You'll be redirected to Stripe Hosted Checkout
6. Use test card: `4242 4242 4242 4242` / any future expiry / any CVC
7. After payment, you'll land on a success page and be redirected back to the app with Premium active

**Test account (pre-authenticated):**
- Sign in with any Replit account — the app creates a user profile automatically

### 4. Other Features
- **Workspace** — drafting tool for discussion posts and essays with tone controls
- **Assignments** — track assignments with AI-assisted drafting
- **Tone profile** — paste your own writing; AI learns your voice for drafts

## AI Disclosure
- Users must accept an AI consent disclosure before any AI feature is accessible
- Every AI-generated response includes the disclaimer: "AI-generated · may contain errors · verify with your course materials"
- Only text/notes explicitly submitted by the user are sent to OpenAI's API
- User account data (name, email) is never shared with OpenAI

## Technical Notes
- Built with React + TypeScript (frontend) and Node.js/Express (backend)
- AI: OpenAI GPT-4o for note scanning, GPT-5-mini for explanations/chat
- Payments: Stripe Hosted Checkout (one-time $4.99 payment)
- Auth: Replit OpenID Connect (PKCE)
- All AI responses are streamed (Server-Sent Events)
