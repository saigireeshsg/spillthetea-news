# Spill · spillthetea.news

The news, minus the boring. Today's news in 60-second stories for young India, starting with Hyderabad.

## How it works

| Part | Where it lives |
| --- | --- |
| The app (one page, dark mode) | `public/index.html` |
| Stories, live alerts, weather, digests, notifications | `content/<collection>/*.json`, bundled into `public/data/*.json` |
| Votes, comments, reading progress | Supabase table `docs` (see `supabase/schema.sql`) |
| Hosting | Vercel, serving `public/` on spillthetea.news |

Readers never sign up: the app creates an anonymous Supabase account in the background so they can vote and comment.

## One-time setup

1. **Supabase**
   - SQL Editor → paste `supabase/schema.sql` → Run.
   - Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins**.
   - Project Settings → API → copy the **Project URL** and **anon public** key into `public/config.js`.
2. **Vercel**
   - Add New → Project → import this GitHub repo.
   - Framework preset: **Other**. Leave the build command empty. Output directory: `public` (already set in `vercel.json`).
   - Deploy.
3. **Domain**
   - Vercel → Project → Settings → Domains → add `spillthetea.news` and `www.spillthetea.news`.
   - At your domain registrar, add the DNS records Vercel shows (usually an `A` record `@ → 76.76.21.21` and a `CNAME` `www → cname.vercel-dns.com`).

## Daily update

1. Add or edit story files in `content/drops/` (one JSON file per story, named by its id, e.g. `d20261025-hyd-metro.json`).
2. Run `python3 tools/build-data.py`.
3. Commit and push. Vercel redeploys in about a minute.

Story links: `https://spillthetea.news/#s/<story-id>` opens that story directly.
