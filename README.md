# ASSURED — Your safety assurance

A connected safety ecosystem for India, built as **one Next.js application
with many proper pages** — not a single giant scrollable page and not five
unrelated micro-sites. Emergency help, verified helplines, incident
reporting, travel safety, community reports and a floating assistant
(Mewvi) all live under one deployable app and link to each other the way
Wikipedia articles link to related articles.

English-only by design for this build (no localization layer yet).

This README is the final, consolidated reference for the whole app —
it replaces the earlier "Part 1 / Part 2 / Part 3 / Part 4" notes that
used to live here as the project grew in stages.

---

## 1. Route map

| Route | Purpose |
|---|---|
| `/` | Home — the hub. Hero, SOS shortcut, six safety domains. |
| `/emergency` | `tel:112` action + the most relevant emergency helplines. |
| `/helplines` | Searchable directory of verified helplines. |
| `/helplines/national` | All 16 national helplines. |
| `/helplines/states` | All 36 states/UTs — flagged "Coming in a later part" (national numbers already work everywhere). |
| `/women` | Women's safety hub: helplines, reporting, related pages. |
| `/children` | Child safety hub. |
| `/cyber` | Cyber safety hub: report guides, scam-call helper, evidence organizer. |
| `/cyber/scam-call` | Describe a suspicious call/message → guidance + official reporting links. |
| `/travel` | Travel safety hub: check-in, guardian, routes, location share. |
| `/travel/routes` | Compare route options with safety indicators. |
| `/travel/check-in` | Set a destination/ETA and check in when safe. |
| `/travel/guardian` | Track a journey against its planned route. |
| `/location/share` | Share current location with a trusted contact. |
| `/guardian` | Read-only view a trusted contact opens from their link. |
| `/community` | Community-submitted safety observations. |
| `/safety-map`, `/safety-map/area` | Official data + community reports on one map/area view. |
| `/report`, `/report/women`, `/report/cyber`, `/report/financial-fraud` | What to do now / who to contact / where to report / what evidence to keep, per category. |
| `/evidence` | On-device evidence organizer: notes, files, timeline, export. |
| `/resources` | Verified guides across every category. |
| `/safety/distress-demo` | Experimental loud-sound-triggered check-in prototype. |
| `/demo` | **Guided Demo Mode** — a scripted, presenter-controlled walkthrough (see §11). |
| `/settings` | Theme, privacy, emergency contacts, data controls. |

**Deliberately not built as separate routes:** `/cyber/financial-fraud`
and `/cyber/phishing` from the original route sketch. Financial fraud
guidance lives at `/report/financial-fraud` (it's a *reporting* flow, and
splitting it from the other report categories would duplicate the same
"what to do now / who to contact" structure across two places for no
reader benefit). Phishing guidance lives inside `/cyber/scam-call` and
`/report/cyber`, since in practice a phishing message and a phishing call
get the same official next step (report to 1930 / cybercrime.gov.in).
This follows the brief's own instruction not to create a route for every
possible noun — a route exists here only where the content is genuinely
distinct.

## 2. Feature list — what's real vs. an honest placeholder

**Real and working:**
- Helpline directory (search, filter, `tel:` links, copy button, source + verification date on every entry)
- Report guides for cyber, women's safety and financial fraud
- Resource hubs wired to the same verified data (not generic filler text)
- Emergency page with a real `tel:112` action
- Travel: route comparison, check-in with ETA, live guardian tracking while the tab is open, location sharing with expiring tokens
- Guardian dashboard (read-only, token-gated)
- Community safety reports + safety map
- Evidence organizer (on-device notes/files/timeline/export)
- Mewvi: floating, context-aware assistant present on every page; rule-based by default, optionally sharpened by Gemini for ambiguous phrasing (see `AI_SAFETY.md`)
- Alerting: server-sent email/SMS on journey start, check-in overdue, "I need help", and arrival — only for the channels whose keys are configured
- Guided Demo Mode at `/demo` (new in this integration pass — see §11)

**Honest placeholders (clearly labeled, never faked):**
- `/helplines/states` — all states listed, each marked "Coming in a later part"
- Settings sections (privacy controls, notification preferences, data export) — marked "Coming in a later part"
- Photo/video evidence upload to a report — not enabled (needs secure storage + moderation)
- Push notifications — not built; alerts go by email/SMS only

Every placeholder uses the same `FeatureStatusBadge` component
(`available` / `coming-later` / `browser-limit`) so the UI never shows a
button that quietly does nothing.

## 3. Architecture

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Route groups:** pages are organized into route groups —
  `(emergency)`, `(cyber)`, `(women)`, `(children)`, `(travel)`,
  `(community)`, `(report)`, `(tools)`, `(safety)`, `(demo)` — purely for
  file organization; none of them appear in the URL.
- **Single source of truth for navigation:** `src/lib/navigation.ts`
  defines every route once (id, href, label, description, nav group).
  Header, mobile nav, breadcrumbs and the `RelatedLinks` component all
  read from it, so there are no duplicated path strings and no dead
  links. `relatedRoutes` in the same file drives the Wikipedia-style
  "Related" links at the bottom of each page.
- **Shared shell:** `AppShell` composes `Header`, `Footer`, `MobileNav`
  and the floating `MewviLauncher` around every page.
- **Data layer:** verified content lives in typed JSON under
  `src/data/` (helplines, report guides, sources) and is only ever read
  through `src/lib/helplines.ts` / `src/lib/reportGuides.ts` — pages
  never import the JSON directly.
- **Server layer:** `src/lib/server/*` holds journeys, reports,
  notifications, rate limiting, tokens and the storage adapter; API
  routes under `src/app/api/*` are thin wrappers around these.
- **Future multi-repo split, already wired for:**
  `src/lib/moduleLinks.ts` resolves cross-module links through
  `NEXT_PUBLIC_ASSURED_*_URL` env vars, falling back to relative paths
  when unset. That means the app runs as one deployment today, and
  splitting a domain (e.g. Cyber, Women, Travel) out to its own
  repo/subdomain later only needs an env var, not a rewrite. Emergency
  itself does **not** use this mechanism: it ships as an ordinary route
  (`/emergency`) plus a minimal, printable variant (`/emergency/quick`)
  in this same app — no separate deployment needed.

## 4. Database structure

One Supabase/Postgres table, intentionally generic (`supabase/schema.sql`):

```sql
create table public.assured_rows (
  col  text   not null,   -- 'journeys' | 'reports'
  id   text   not null,
  k    text,              -- lookup key (hashed guardian token)
  exp  bigint not null,   -- expiry (epoch ms) — expired rows are ignored/purged
  data jsonb  not null,
  primary key (col, id)
);
```

Row Level Security is enabled with **no policies**, so the public/anon
key can read or write nothing — only the server's service-role key
(used inside API routes, never shipped to the browser) can touch this
table. Without Supabase configured, the app falls back to an in-memory
store automatically (fine for a demo; data resets on redeploy/restart).

## 5. APIs

All under `src/app/api/`, all server-only, all rate-limited by IP:

| Route | Does |
|---|---|
| `GET /api/health` | Basic liveness check. |
| `GET /api/status` | Tells the UI which backend pieces are actually configured (DB, alert channels, Gemini) so it never overclaims. |
| `POST /api/journeys` | Start a journey (destination, ETA, guardian contact). |
| `PATCH/DELETE /api/journeys/[id]` | Update position, check in, get help, end journey. |
| `GET /api/guardian` | Guardian's read-only view, resolved from a hashed token (never a raw ID). |
| `POST /api/reports`, `GET /api/reports` | Create/list community safety reports. |
| `POST /api/reports/[id]/flag` | Flag a report; 3 flags auto-hide it pending review. |
| `GET /api/route` | Route comparison via openrouteservice (if `ORS_API_KEY` set). |
| `GET /api/geocode` | Place search. |
| `GET /api/resources` | Serves the verified resource/guide data. |
| `POST /api/mewvi` | Mewvi's rule engine (+ optional Gemini labeling for ambiguous input). |
| `GET /api/cron/alerts` | Called every 5 min by GitHub Actions; sends due overdue-check-in alerts. |

## 6. Environment variables

See `.env.example` for the full list with inline comments. Nothing is
required to `npm run build` or `npm run dev` — every integration
(Supabase, openrouteservice, Resend, Twilio, Gemini) is optional and the
app tells you in-app exactly which ones are missing. Never commit real
values; `NEXT_PUBLIC_*` variables are the only ones exposed to the
browser.

## 7. Local setup

```bash
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
npm run build
npm run lint
npm test
```

Requires Node.js 18.18+ (Node 20+ recommended).

## 8. Deployment

1. Push this repo to GitHub.
2. On [Vercel](https://vercel.com): **New Project** → import the repo →
   framework auto-detects as Next.js → add any env vars you want →
   **Deploy**.
3. Vercel gives a public URL (`https://your-project.vercel.app`) —
   that's what works from another phone/network; `localhost:3000` only
   works on the machine running `npm run dev`.
4. Every push to the connected branch redeploys automatically.
5. If using the alert cron, add `SITE_URL` and `CRON_SECRET` as GitHub
   repo secrets so `.github/workflows/alerts.yml` can call
   `/api/cron/alerts` every 5 minutes.

GitHub Pages cannot run this app as-is (static-only; this uses the
Next.js App Router). Use Vercel, Netlify (Next.js runtime), or any host
with first-class Next.js support.

**Keeping it one deployment:** everything above assumes one repo, one
app, one deployment, as the brief asks for. Splitting a module out to
`cyber.assured.in` etc. later is possible without a rewrite (§3) but
is a distinct, deliberate step — not something to do "just because."
Emergency is intentionally excluded from this mechanism (see §3) since
it stays in the main app.

## 9. Free-tier limitations

- **Supabase free tier:** fine for a hackathon/demo; rows expire and are
  purged by application logic, not a paid cron product.
- **Resend (email):** can send only to your own verified address until
  you verify a sending domain — expect this limit in a demo.
- **Twilio (SMS):** trial accounts can only reach phone numbers you've
  manually verified; production SMS to Indian numbers needs DLT
  registration, which takes real time to set up.
- **openrouteservice:** free key is rate-limited (fine for a demo, not
  for production traffic).
- **Gemini:** optional; without a key Mewvi still works fully on its
  built-in rules.
- **Vercel Hobby plan:** serverless function duration and cron frequency
  are capped; the alert cron here uses GitHub Actions instead of
  Vercel Cron specifically to stay inside the free tier.

## 10. Government data sources

Every helpline and report guide cites a real government or statutory
publisher in `src/data/helplines/sources.json`, each with a title, an
official URL and a `verifiedOn` date. Publishers currently cited
include the Ministry of Home Affairs (ERSS-112, I4C cybercrime/1930),
the Ministry of Women and Child Development (Mission Shakti, CHILDLINE),
the National Commission for Women, NALSA, NDMA, NHAI, Indian Railways,
the Department of Telecommunications, and the Ministry of Tourism. Two
numbers were corrected from the original research draft after checking
primary sources (Elderline's actual hours, and the National Consumer
Helpline's actual hours) — see the inline note in
`src/data/helplines/sources.json`. Re-verify against each `url` before
a public launch and bump `verifiedOn` when you do; helpline hours and
numbers do change.

## 11. Browser limitations

ASSURED never claims: automatic authority notification, an automatic
phone call without you pressing call, background surveillance,
guaranteed background GPS, or recording after the browser closes.
`tel:` links open your phone's own dialer — you still press call. Live
tracking works only while the tracking tab/page stays open (no native
background service on the web). Battery percentage shows only where the
browser exposes it (mostly Chrome on Android).

## 12. Native-app features for the future

Things that need a real native app (not achievable in a browser) and
are honestly marked "coming later" rather than faked:
- True background location tracking with the app closed
- Silent/panic-gesture SOS (volume-button combos, shake-to-trigger)
- Push notifications instead of email/SMS-only alerts
- On-device call/SMS screening for scam detection
- Offline-first mode with local caching of helpline data
- Native share-sheet integration for evidence export

## 13. Asset checklist

See `ASSET_CHECKLIST.md` for the full list of expected logo, icon,
Mewvi and page-header assets and their exact paths under
`public/assets/`. Placeholders currently exist for the mark, app icons
and Mewvi/page-illustration folders; drop in final art at those paths
and nothing else needs to change.

## 14. Security

- No secrets in this repository; `.env.example` only has placeholders.
- `publicEnv` / `serverEnv` split in `src/lib/env.ts` keeps it explicit
  what's exposed to the browser vs. server-only.
- Input sanitization in `src/lib/security/sanitize.ts`, applied to all
  user-submitted text (reports, journey labels).
- Guardian access is token-gated: tokens live in the URL `#fragment`
  (never sent to the server in a Referer header or logged) and are
  stored hashed, never in plaintext.
- Location-sharing tokens expire (ETA + 3 hours) and are wiped on
  arrival/end.
- Community reports are coordinate-rounded to ~100m and auto-deleted
  after 180 days; 3 independent flags auto-hide a report pending review.
- Rate limiting by IP on every mutating API route.
- Row Level Security enabled on the one Supabase table, with zero
  policies for the anon key — only the server's service-role key can
  read or write it.
- Security headers set in `next.config.js`.

## 15. Demo Mode walkthrough

`/demo` is a self-contained, presenter-controlled script (no real API
calls) that follows one scenario end-to-end: a student, Priya, heading
home for the weekend.

1. **Start Journey** → pick a destination (pre-filled for the demo)
2. **Add a guardian** ("Maa")
3. **Route selected**, with a safety indicator
4. **Journey in progress**, with a live elapsed timer
5. Presenter taps **"Simulate route deviation"**
6. **Mewvi appears**: *"You've moved off your planned route. Are you okay?"*
7. Presenter taps **"I need help"**
8. **Location sharing** turns on (simulated, clearly labeled)
9. **Guardian dashboard** view: what the trusted contact would see
10. **Emergency options**: a real `tel:112` link (opens the phone's own
    dialer; still requires pressing call) plus restart/exit controls

Every screen carries a persistent banner: *"DEMO SIMULATION — no
emergency service, guardian or location has actually been contacted."*
Nothing in the demo writes to the database, sends a real alert, or
dials a number without the presenter's explicit tap. It's reachable
from Settings and from the Related links on `/emergency` and
`/travel/guardian`, and deliberately not on the homepage — the homepage
stays a hub, per the design brief.

---

## Appendix — Mewvi and the intelligence layer

Full rules and the test matrix are in **`AI_SAFETY.md`**. Mewvi is
navigation-first and context-aware, answers only from verified data,
and asks for a confirming tap before any sensitive action. `GEMINI_API_KEY`
is optional and, when set, only helps Mewvi label ambiguous phrasing —
it never writes replies to sensitive/danger messages and never sees
those messages at all. `/api/status` reports `assistant.gemini`
(true/false) so the UI never overclaims what's active.
