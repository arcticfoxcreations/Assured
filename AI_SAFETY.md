# ASSURED — AI safety notes (Part 4: Mewvi)

Mewvi is ASSURED's navigation-first assistant. This document says what it may and may not do, and where each rule is enforced in code.

## What Mewvi is for
Helping a person **find and operate ASSURED**: the right helpline, report page, travel tool or guide, plus short guidance for common situations. It is **not** police, medical care, legal representation or emergency response, and it says so in the panel and in urgent replies.

It is **not** a general assistant. Unrelated requests ("write a poem", "who won the IPL") and attempts to change its rules get a polite "I only help with ASSURED".

## Architecture

```
message → sanitise → local classifier (danger decided HERE, always)
        → [optional] Gemini label, only if local is unsure and not danger
        → tools + flows (verified data only) → guard → reply
```

| Piece | File |
|---|---|
| Local intent + danger rules | `src/lib/mewvi/intents.ts` |
| Page awareness | `src/lib/mewvi/context.ts` |
| Safety flows (≤ 4 steps each) | `src/lib/mewvi/flows.ts` |
| Tools | `src/lib/mewvi/tools.ts` |
| Verified data + allow-lists | `src/lib/mewvi/catalog.ts` |
| Hallucination guard | `src/lib/mewvi/guard.ts` |
| Orchestrator | `src/lib/mewvi/respond.ts` |
| Optional Gemini classifier (server) | `src/lib/server/gemini.ts` |
| API | `src/app/api/mewvi/route.ts` |
| Browser client with offline fallback | `src/lib/mewvi/client.ts` |

The same `respond()` runs on the server and in the browser, so Mewvi still answers (including emergency guidance) with no network.

## Tools
`searchHelplines`, `findNearbyHelp`, `navigateTo`, `searchCyberResources`, `searchWomenResources`, `searchTravelTools`, `startCheckIn`, `prepareReport`, `shareLocation` (all in `tools.ts`).

## Rules and how they are enforced

1. **Never invent phone numbers, emails or government URLs.**
   - Reply text is written from templates and the verified dataset (`src/data/helplines`, `src/data/resources`). A model never writes reply text.
   - Every reply passes `guard.ts`: numbers, emails and hostnames in text must match the verified allow-lists or are replaced with `[unverified detail removed]`; links must be a known ASSURED route or a verified official host over https; helpline cards are re-hydrated from the dataset; `tel:` buttons must be a verified number.
   - If something isn't in the dataset (a specific police station, a state office, an email), Mewvi says so and points to the directory instead of guessing.

2. **Sensitive actions need explicit confirmation.** Calling, sharing location and starting a check-in are only ever *proposed* as a confirmation card ("Would you like to open the call option for 112?"). Reply blocks never contain a `tel:` link. The "Call…" button on a helpline card opens the same confirmation. Mewvi never reads or sends a location itself; "Yes" only opens the page, where the person still taps each button.

3. **Gemini is optional and can only return labels.**
   - No `GEMINI_API_KEY` → local rules only (`ai: "off"`).
   - With a key, Gemini is asked to label **vague** messages only. Its output is parsed as JSON and every field is checked against fixed lists (intent, topic, existing route id). Anything else is discarded.
   - **Danger is never sent to a model and never downgraded by one.** Danger and self-harm detection run locally first.
   - Before anything leaves the server, emails, links and phone-like digit runs are masked.
   - Invalid key, rate limit, timeout or malformed output → local rules answer, the reply says `ai: "invalid_key" | "rate_limited" | "unavailable"`, and Gemini is paused briefly (5 min / 1 min / 10 s) so a bad key never slows every message.
   - The key is read only on the server (`src/lib/env.ts`), never prefixed `NEXT_PUBLIC_`.

4. **Immediate danger** (`emergency_danger`, `flow_followed`, `flow_unsafe_transport`, self-harm): lead with 112, then a trusted contact and location sharing, then heading toward a safe public place. Short, never a wall of text. Past-tense mentions ("I was attacked last year") and pure information requests ("what is the emergency number?") are treated as reporting/helpline questions, not emergencies.

5. **No silent action.** Nothing calls, messages, alerts or reports on the person's behalf. This includes the distress demo.

## Privacy
- Messages are processed to produce a reply and are not stored by Mewvi. The conversation lives in the browser tab's memory only.
- The only device state Mewvi is told is whether a journey is active (a yes/no). It never receives a location.
- Evidence Organizer data (notes, files) stays in the browser (localStorage / IndexedDB) and is never uploaded. The scam-call helper analyses text on the device.
- Rate limit: 40 Mewvi requests per minute per IP (best effort; see `rateLimit.ts`).

## Other Part 4 features and their honest limits
- **Evidence Organizer** (`/evidence`): notes, images, documents, dates → summary, timeline, checklist; export as text, copy, print. The checklist is taken from ASSURED's verified report guides. It does **not** claim legal admissibility.
- **Suspicious call helper** (`/cyber/scam-call`): a browser cannot see or block ordinary phone calls. It checks text the person types for common red-flag patterns, never gives a "safe"/"scam" verdict, and links to official reporting.
- **Distress demo** (`/safety/distress-demo`): labelled *Prototype*, *Experimental*, *Requires microphone permission*. It measures loudness against a room baseline. It cannot recognise screams or assault. Audio is processed in memory only. On trigger it only asks "Are you okay?"; "I Need Help" shows a Call 112 button the person must tap. It never contacts anyone.

## Test matrix (`tests/mewvi.test.ts`)
| Requirement | Test |
|---|---|
| Gemini absent | "gemini absent…" |
| Gemini present | "gemini present…", "gemini never receives raw emails…" |
| Invalid key / outage / garbage | "gemini invalid key…", "…rate-limit, outage and garbage…", "parseNlu…" |
| Navigation | "navigation: …", "report assistant: …" |
| Tool execution | "tools: …" |
| Confirmation flows | "sensitive actions are only proposed…" |
| Hallucination prevention | "guard: forged…", "every number Mewvi shows…", "unknown station or email…", "stays inside ASSURED…" |
| Emergency guidance | "emergency: …", "self-harm: …", "guidance flows…", "scenario messages…" |
| Mewvi across routes | "Mewvi answers … on every ASSURED page", "context: …" |

**Status:** these tests were written for this build but **not run** (verification was explicitly skipped). Run `npm test` before relying on them; CI (`.github/workflows/ci.yml`) does so.

## Known limits
- Local matching is keyword/pattern based English. Unusual phrasing may fall through to "outside what I can help with"; with Gemini enabled, vague messages get a second chance.
- Guidance is general safety information, not a substitute for professional or official help.
- Re-verify the helpline data (`sources.json`) before a public launch, as numbers change.

## Turning things off
Remove `GEMINI_API_KEY` to disable Gemini entirely. Mewvi keeps working.
