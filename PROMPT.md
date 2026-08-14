# Task: Productionize my mental math trainer

This folder contains `mental-math-trainer.jsx` — a self-contained React component (a mental math drill app with multiplication/addition sprints and ladders). It currently persists data through a `window.storage` async key-value API (get/set/delete/list). Your job is to turn it into a deployed, authenticated web app.

## Target stack
- **Next.js (App Router)** deployed on **Vercel**
- **Clerk** for auth (@clerk/nextjs)
- **Neon Postgres** (via Vercel Marketplace) for per-user cloud persistence
- Git repo pushed to **GitHub**

## Requirements

### 1. Project setup
- Scaffold a fresh Next.js App Router project (TypeScript for new code is fine; keep the component as .jsx — do NOT rewrite or restyle it; it carries its own CSS in a <style> block and is mobile-first).
- Mount the component as a client component on the root page, full-bleed.
- Add mobile PWA-ish meta: viewport-fit=cover, apple-mobile-web-app-capable, theme-color #FAFBF7, title "Mental Math Trainer".

### 2. Auth (Clerk)
- Wrap the app in ClerkProvider; protect all routes with clerkMiddleware so unauthenticated users hit Clerk's sign-in.
- Add a small signed-in header affordance (UserButton) that doesn't disturb the component's layout — e.g. absolutely positioned top-right, or in a slim bar above it.
- Use env vars NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY; put placeholders in .env.example.

### 3. Cloud persistence
The component calls `window.storage.get(key)` / `.set(key, value)` (value is a JSON string) and catches all errors, treating a failed get as "no saved data". Preserve that contract:
- Create a client provider that installs `window.storage` before the component mounts, backed by fetch calls to authenticated API routes:
  - GET /api/storage/[key] → { key, value } or 404
  - PUT /api/storage/[key] with { value } → upsert
  - (delete/list can be stubbed or implemented; the component doesn't currently use them)
- API routes use Clerk's auth() server-side to get userId; reject if unauthenticated.
- Neon Postgres table:
  ```sql
  CREATE TABLE IF NOT EXISTS user_storage (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, key)
  );
  ```
- Use @neondatabase/serverless (or drizzle if you prefer) with DATABASE_URL from env. Include a migration script or a bootstrap that creates the table (`npm run db:init`).
- Nice-to-have: on first load, if localStorage has legacy keys prefixed `mmt:` and the server has no data yet for that key, import them once so my old browser-local stats carry over.

### 4. Repo + deploy
- git init, .gitignore (node_modules, .env*, .next, .vercel), README.md with setup instructions (Clerk keys, Neon DATABASE_URL, db:init, local dev, deploy).
- Create a GitHub repo with `gh` and push (ask me for the repo name/visibility if unsure; default: private, `mental-math-trainer`).
- Link and deploy with `vercel` CLI. Tell me exactly which env vars to add in the Vercel dashboard (or set them via CLI) and which manual steps I need to do myself:
  - creating the Clerk application and copying keys
  - provisioning Neon through the Vercel Marketplace and copying DATABASE_URL
- Deploy to production once envs are in place and verify a signed-in round-trip: play a sprint round, reload, confirm stats persisted.

## Constraints
- Do not change the component's UX, visuals, or drill logic. Integration-level edits only (e.g., if you must, wrap or lightly adapt the storage bootstrapping — but the existing get/set semantics already match).
- Keep the API surface minimal; no ORM ceremony beyond what's needed.
- Everything should work locally with `npm run dev` + a .env.local before any deploy.

Work incrementally: scaffold → local auth working → local persistence working → repo → deploy. Show me the plan first, then execute.
