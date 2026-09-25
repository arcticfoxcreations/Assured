# ASSURED — Complete Setup, Config & API Key Guide

Everything you need to get the app running: the fix for the lint error
you just hit, every environment variable in the project (what it does,
where it's used, and exactly where to get it), how to deploy, and how
to split it into separate repos later if you want to.

---

## 0. Fix for the error you just hit

```
? How would you like to configure ESLint?
Error: Process completed with exit code 1
```

This means the project ESLint config file — `.eslintrc.json` — was not
found in the folder `npm run lint` was run from. It happens almost
always for one of these reasons:

1. **Wrong folder / extra nesting.** Some zip/unzip tools, or dragging a
   folder into GitHub's web uploader, can leave you with a folder inside
   a folder (e.g. `assured/assured/package.json` instead of
   `assured/package.json`). Check: `package.json` and `.eslintrc.json`
   must be in the **same folder** you run `npm install` / `npm run
   lint` from.
2. **Dotfiles got dropped during upload.** `.eslintrc.json`, `.env.example`,
   `.gitignore` and the `.github/` folder all start with a dot. If you
   used a file explorer with "show hidden files" turned off, or dragged
   files into GitHub's browser upload instead of using `git push`, these
   can silently get left behind.

**Fix:**
```bash
cd your-project-folder      # the one that directly contains package.json
ls -la                       # confirm .eslintrc.json is listed
npm run lint
```
If `.eslintrc.json` is missing, re-copy it from the project (its full
content is just `{ "extends": "next/core-web-vitals" }`) or re-extract
the zip. The safest way to get files into a fresh GitHub repo with
nothing dropped is:
```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
`git add -A` includes dotfiles; drag-and-drop uploads sometimes don't.

---

## 1. Local setup, in order

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file (safe defaults, nothing required yet)
cp .env.example .env.local

# 3. Run it
npm run dev          # → http://localhost:3000

# 4. Before every commit / deploy, these three must all pass clean:
npm run lint
npm test
npm run build
```

Requires **Node.js 18.18+** (Node 20 recommended — check with `node -v`).

The app runs completely with **zero configuration** at this point —
every feature that needs a key shows an honest "coming later" or
"browser limitation" badge instead of pretending to work. Everything
below is optional, and you add it one integration at a time.

---

## 2. Every environment variable — what it does, where it's used, where to get it

### Public (safe to expose — visible in browser)

| Variable | Purpose | Where used |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | App name shown in UI/metadata. | `src/lib/env.ts` |
| `NEXT_PUBLIC_SITE_URL` | Your deployed URL (used to build absolute links, e.g. in alert emails). Set to your real Vercel URL once deployed. | `src/lib/env.ts` |
| `NEXT_PUBLIC_ASSURED_HOME_URL`, `..._EMERGENCY_URL`, `..._CYBER_URL`, `..._WOMEN_URL`, `..._TRAVEL_URL` | Only used if you split a module into its own deployment (§4 below). Leave blank while it's one app. | `src/lib/moduleLinks.ts` |

### Server-only (never prefix these with `NEXT_PUBLIC_`)

| Variable | Unlocks | Where used | Where to get it |
|---|---|---|---|
| `SUPABASE_URL` | Database connection (guardian links, community reports persist across restarts). | `src/lib/env.ts` → `src/lib/server/store.ts` | [supabase.com](https://supabase.com) → **New project** (free tier) → Project Settings → API → "Project URL". |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as above — the server-side key that can bypass RLS (never expose this one to the browser). | same | Same Supabase page → Project Settings → API → "service_role" key (click "reveal"). **Also required:** open Supabase's SQL Editor and run the contents of `supabase/schema.sql` once, before this key will work. |
| `ORS_API_KEY` | Real route comparison + place search on `/travel/routes`. Without it, route comparison shows a "browser limitation / not configured" state instead of guessing. | `src/lib/env.ts` → `src/app/api/route/route.ts`, `src/app/api/geocode/route.ts` | [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup) → free account → Dashboard → "Request a token" → standard (free) tier is enough for a demo. |
| `SHARE_TOKEN_SECRET` | Secret used to hash guardian-link tokens so raw IDs never appear in a URL. | `src/lib/env.ts` → journey/guardian token logic | Not from a provider — generate it yourself: `openssl rand -hex 32` (or any long random string, 32+ chars). |
| `GEMINI_API_KEY` | Lets Mewvi (the assistant) understand vague/ambiguous phrasing better. Mewvi works fully without it, on its built-in rules. | `src/lib/env.ts` → `src/lib/server/gemini.ts` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → sign in with a Google account → "Create API key". Free tier exists; check current limits on that page. |
| `GEMINI_MODEL` | Optional override if Google renames/retires the default model. Defaults to `gemini-2.5-flash` if unset. | `src/lib/env.ts` | Not a key — just a model name string. |
| `RESEND_API_KEY` | Turns on **email** alerts (journey started, check-in overdue, "I need help", arrived safely). | `src/lib/server/notify.ts` | [resend.com](https://resend.com) → free account → API Keys → "Create API Key". **Caveat:** on the free tier you can only send to your *own* verified email until you verify a sending domain — fine for a demo, not for real users yet. |
| `ALERT_FROM_EMAIL` | The "from" address on those emails, e.g. `ASSURED <alerts@yourdomain.com>`. | `src/lib/server/notify.ts` | Must be an address on a domain you've verified inside Resend (Resend → Domains). For a quick demo, Resend also gives you a working `onboarding@resend.dev` sender you can use as-is. |
| `TWILIO_ACCOUNT_SID` | Turns on **SMS** alerts (same events as email). | `src/lib/server/notify.ts` | [twilio.com/try-twilio](https://www.twilio.com/try-twilio) → free trial account → Console dashboard → "Account SID" is shown right at the top. |
| `TWILIO_AUTH_TOKEN` | Twilio auth. | same | Same Console dashboard, right next to Account SID (click "reveal"). |
| `TWILIO_FROM` **or** `TWILIO_MESSAGING_SERVICE_SID` | The sending number/service. Use one, not both. | same | Twilio Console → Phone Numbers → Buy a number (trial gives you one free), or Messaging → Services if you set up a Messaging Service. **Caveat:** trial accounts can only text numbers you've manually verified in the Twilio console, and production SMS to Indian numbers needs DLT registration (a real, multi-day compliance process) — expect this to stay demo-only unless you complete that. |
| `CRON_SECRET` | Shared secret so only your own scheduler can call `/api/cron/alerts` (prevents anyone else from triggering it). | `src/app/api/cron/alerts/route.ts` | Generate yourself: `openssl rand -hex 24`. Set the **same value** in two places — Vercel env vars AND the GitHub repo secret described below. |

None of the server-only variables are required to build, deploy, or
demo the app — each one only turns on one specific feature, and the
app tells the user in-app which ones are off (`/api/status`).

---

## 3. GitHub repository secrets (for the alert scheduler)

The 5-minute "check for overdue check-ins" job runs as a **GitHub
Action** (`.github/workflows/alerts.yml`), not a Vercel cron, so it
stays on every free tier. It needs two **repository secrets** (not the
same as env vars — these live in GitHub, not Vercel):

1. On GitHub: your repo → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**.
2. Add `SITE_URL` = your deployed URL, e.g. `https://your-app.vercel.app`
3. Add `CRON_SECRET` = the exact same value you set for `CRON_SECRET`
   on Vercel (step 2 above).

Without these two secrets, the workflow just logs "not set yet —
skipping" every 5 minutes and does nothing harmful — safe to leave
unset until you're ready.

---

## 4. Deploying (Vercel)

1. Push the repo to GitHub (see the `git init` block in §0 if you
   haven't already).
2. Go to [vercel.com](https://vercel.com) → **Add New… → Project** →
   import your GitHub repo. Vercel auto-detects Next.js — don't change
   the build command.
3. Before clicking Deploy, add whichever env vars from §2 you're ready
   to use, under **Environment Variables** (paste name + value, one at
   a time — or paste all of them from your local `.env.local` at once
   using Vercel's "paste .env" option).
4. **Deploy.** You'll get a URL like `https://your-app.vercel.app`.
5. Go back into Vercel's env vars and set `NEXT_PUBLIC_SITE_URL` to that
   real URL, then redeploy (Vercel → Deployments → ⋯ → Redeploy) so
   links inside alert emails point at the live site, not localhost.
6. If you added Supabase, open Supabase's SQL Editor and run
   `supabase/schema.sql` once — do this before or right after your
   first deploy.
7. Set up the GitHub Action secrets from §3 once the real URL exists.

A custom domain can be attached later under Vercel → your project →
**Settings → Domains** — nothing else in the app needs to change for
that.

---

## 5. Splitting into separate repos (only if/when you actually want this)

Right now everything is **one repo, one app, one deployment** — this is
correct for a hackathon and is what the project is built for by
default. The code is already wired so a future split doesn't need a
rewrite, but it's still real, deliberate work — do this only if you
specifically need e.g. `cyber.assured.in` as its own deployment
later. (Emergency stays out of this mechanism entirely — see the note
in step 3 below.)

**Why it's not "just copy the folder":** `Header`, `Footer`,
`MobileNav`, `ThemeProvider`, `AppShell`, `Mewvi*`,
`src/lib/navigation.ts`, `src/lib/security/sanitize.ts`, `src/lib/env.ts`,
`src/lib/utils.ts` and everything in `src/components/ui/` are shared by
every page. If you copy them into 5 repos, a fix in one repo silently
doesn't apply to the other 4.

**The honest way to do it, step by step:**

1. **Extract a shared package first.** Create a 6th, small repo (e.g.
   `assured-shared`) containing just the shared files listed above.
   Publish it as a private package to **GitHub Packages** (npm-compatible,
   free for private repos on personal accounts within GitHub's limits).
   ```bash
   npm init -y
   npm publish --registry=https://npm.pkg.github.com
   ```
2. **For each domain repo** (e.g. `assured-cyber` for the `/cyber`
   section):
   - `npm install @yourorg/assured-shared`
   - Keep only that domain's route group (e.g. just `/cyber`) and
     its slice of `src/data/`.
   - Set `NEXT_PUBLIC_SITE_URL` to its own future URL.
3. **Wire cross-links.** In the **main** app's env vars, set
   `NEXT_PUBLIC_ASSURED_CYBER_URL=https://cyber.assured.in`
   (and similarly for `_WOMEN_URL`, `_TRAVEL_URL`, etc. for any other
   module you've split out). `src/lib/moduleLinks.ts` automatically
   switches that module's links from relative paths to full URLs the
   moment the variable is set — no code changes needed on the main
   app's side. Note: Emergency isn't part of this mechanism — it stays
   as ordinary routes (`/emergency`, `/emergency/quick`) in the main
   app, since a fast, shareable emergency page doesn't need its own
   deployment to be fast.
4. **Deploy each repo to Vercel separately**, then attach subdomains
   (`cyber.assured.in`, `women.assured.in`, etc.) under each project's
   **Settings → Domains**, pointing your DNS provider's CNAME records
   at Vercel as it instructs.
5. **Re-run `npm run build` / `lint` / `test` in every repo** before
   trusting a split deployment — each one is now an independently
   deployable app and needs its own green build.

If you only need this for one module, you can do just steps 2–4 for
that one module and leave everything else in the main repo — you
don't have to split all domains at once.

---

## 6. Final "does everything actually work" checklist

Run through this after any setup changes, before calling it done:

- [ ] `npm run lint` → `✔ No ESLint warnings or errors`
- [ ] `npm test` → all tests `ok`, `0 fail`
- [ ] `npm run build` → `✓ Compiled successfully`, no red errors
- [ ] `npm run dev` → homepage loads at `localhost:3000`, theme toggle
      and bottom nav work
- [ ] `/api/status` (visit it directly in the browser) → confirms which
      integrations are actually live
- [ ] If Supabase is configured: create a test journey on
      `/travel/check-in`, confirm a row appears in Supabase's table
      editor under `assured_rows`
- [ ] If Resend/Twilio configured: trigger "I need help" on a test
      journey, confirm the alert actually arrives
- [ ] `/demo` → the guided walkthrough runs start to finish without a
      dead end
- [ ] Deployed URL (not just localhost) loads correctly on a phone on
      a different network — this is the real test that it's actually
      live, not just running on your machine
