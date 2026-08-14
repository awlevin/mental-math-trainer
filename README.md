# Mental Math Trainer

Adaptive mental math drills (multiplication and addition sprints and ladders), deployed as an authenticated web app.

- **Next.js (App Router)** on **Vercel**
- **Clerk** for auth — every route requires sign-in
- **Neon Postgres** for per-user cloud persistence

The core UI lives in `components/MentalMathTrainer.jsx`, a self-contained component with its own styles. It persists through a small `window.storage` key-value API (`lib/storage-client.ts`) backed by `/api/storage/[key]` routes that scope every read and write to the signed-in Clerk user.

## Setup

1. **Clone and install**

   ```sh
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env.local` and fill in:

   | Variable | Source |
   |---|---|
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys (or `vercel integration add clerk`) |
   | `CLERK_SECRET_KEY` | Same place |
   | `DATABASE_URL` | Neon (Vercel Marketplace → Neon → connection string) |

3. **Create the database table**

   ```sh
   npm run db:init
   ```

4. **Run locally**

   ```sh
   npm run dev
   ```

   Open http://localhost:3000 — you'll be redirected to Clerk sign-in.

## Deploy

```sh
vercel link
vercel env pull            # or add the three env vars in the Vercel dashboard
vercel --prod
```

Provision through the Vercel Marketplace if starting fresh:

```sh
vercel integration add clerk   # auto-provisions the Clerk env vars
vercel integration add neon    # auto-provisions DATABASE_URL
```

Then run `npm run db:init` once with the production `DATABASE_URL`.

## Data model

One table, keyed by Clerk user id:

```sql
CREATE TABLE IF NOT EXISTS user_storage (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
```

On first load, if the browser still has stats from the old artifact build in `localStorage` (bare key or `mmt:`-prefixed) and the server has none, they are imported once automatically.
