# Civora

**Your City. Your Voice. Your Change**

An AI-assisted platform that turns scattered citizen reports into a prioritized, explained and
trackable work queue for local officers. Built with Next.js 16 for the PromptWars x ASTRA hackathon.

- **Problem statement:** [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md)
- **Deploy it, with shared data for every device:** [docs/DEPLOY.md](docs/DEPLOY.md)
- **Demo script (about 5 minutes):** [docs/DEMO.md](docs/DEMO.md)
- **Limitations and honesty note:** [docs/LIMITATIONS.md](docs/LIMITATIONS.md)
- **Build plan:** [PLAN.md](PLAN.md)

## How it meets the problem statement

| Requirement                                                                                                    | Where it is in the app                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Capture.** Text and/or photo, category, location (GPS, coordinates or landmark). Under a minute, on a phone. | `/report`: one column, large controls, shared validation on the phone and the server                                                                               |
| **Understand.** Categorize, summarize, flag duplicates, assign priority with reasons.                          | Analysis on every report: AI or rules for category and summary, duplicate suggestions, priority with each factor's reason                                          |
| **Reveal.** Map or dashboard showing recurring problems, high-priority locations and area patterns.            | `/admin`: ranked queue, summary cards, map, and hotspots found by clustering, each with a brief                                                                    |
| **Act.** Review, assign and track each report to resolution, with status visible to the submitter.             | Officer actions with history, and `/track/[id]` showing progress in plain language                                                                                 |
| **AI beyond a chatbot.**                                                                                       | Claude categorizes and summarizes (with a rules fallback), and drafts action briefs. Duplicate detection, clustering and explainable priority run without a model. |
| **Integrity.** Label mocks, do not overclaim.                                                                  | Teams are marked "(mock)", AI briefs say how they were written, and [docs/LIMITATIONS.md](docs/LIMITATIONS.md) lists what is real                                  |

## Quick start (from a clean checkout)

Requirements: Node.js 22 or newer, and npm.

```bash
npm install
cp .env.example .env.local     # then set ADMIN_PASSWORD (12+ characters)
npm run build
npm run start                  # http://localhost:3000
```

This keeps data in `data/` on your computer. To share reports between devices, connect Supabase
and deploy: [docs/DEPLOY.md](docs/DEPLOY.md).

- Start at http://localhost:3000. The landing page has one button for each kind of visitor.
- Citizens: **Report a problem**, or enter a tracking ID to follow a report. No account is needed.
- Officers: **Sign in as an officer**. The browser asks for the username (`officer` by default)
  and your `ADMIN_PASSWORD`.

Use `npm run dev` for development. The production build is the one to demonstrate, since it
has no development overlay.

## Verification

| Check                                                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests (`npm test`)                                   | 280 passing across 37 files, including the seed data's duplicate groups, urgent safety cases, the officer rules, and one shared contract that both stores pass                                                                                                                                                                                                                                                          |
| Shared storage (Supabase)                                 | The SQL ran on Postgres 17 with Supabase's role names. Two app servers shared one database through a local stand-in for Supabase's API: a report sent to one appeared on the other, and two officers saving one report at the same moment both kept their change. On a real Supabase project, the table and private bucket were created, the demo reports were seeded, and the officer and citizen pages loaded from it |
| Lint, typecheck, formatting                               | Pass, with zero warnings allowed                                                                                                                                                                                                                                                                                                                                                                                        |
| Production build                                          | Passes with zero warnings                                                                                                                                                                                                                                                                                                                                                                                               |
| Dependency audit                                          | Zero known vulnerabilities                                                                                                                                                                                                                                                                                                                                                                                              |
| axe-core accessibility audit                              | Zero violations on all seven screens checked, including colour contrast and the officer pages signed in                                                                                                                                                                                                                                                                                                                 |
| Lighthouse, mobile (`/report`)                            | Performance 91, accessibility 100, best practices 100, SEO 100                                                                                                                                                                                                                                                                                                                                                          |
| Lighthouse, mobile (`/track`)                             | Performance 96, accessibility 100, best practices 100. SEO is lower on purpose: tracking pages are kept out of search engines because they hold personal details                                                                                                                                                                                                                                                        |
| Browser flows, headless Chrome at phone and desktop sizes | Submission with photo, the full officer workflow, and the citizen's view after an officer action                                                                                                                                                                                                                                                                                                                        |

Lighthouse and axe results were measured on the production build with the seed data.

## Architecture

The code is layered, and dependencies point inwards:

```
src/app/          Routes: pages, loading and error states, server actions, API routes
src/proxy.ts      Sign-in gate for /admin and /api/admin
src/application/  Use cases: submission, officer actions, citizen view, dashboard, briefs
src/domain/       Pure business rules: schemas, status workflow, duplicates, clustering,
                  priority, officer rules, briefs (no I/O, no React)
src/ai/           Language-model boundary (server-only): classification, summaries, briefs,
                  and the rules fallback
src/data/         Storage (server-only): Supabase or local files, chosen by settings; seed data
src/maps/         Satellite imagery from Google Earth Engine (server-only)
src/components/   UI: report form, officer forms and dashboard, citizen timeline
src/lib/          Request helpers: body size limit, rate limit, image resizing, sign-in check
supabase/         The SQL that creates the reports table and the photo bucket
tests/            Unit tests, mirroring src/
```

The domain layer imports nothing from the rest of the app, so every rule can be tested
without a server or a browser.

## Storage and sync across devices

Every phone and laptop talks to the same server, and the server keeps one copy of the data. A
report sent from a phone is stored at once, and any officer who opens or refreshes the dashboard
sees it. When an officer acts, the citizen's tracking page shows the change on its next load.

- **Deployed (Supabase):** each report is a row in a Postgres table, and photos sit in a private
  Storage bucket. Several servers can run at once, because the reports live in the database,
  not in any one server.
  [supabase/migrations](supabase/migrations) creates both, and [docs/DEPLOY.md](docs/DEPLOY.md)
  sets them up.
- **On one computer (files):** without Supabase settings, reports go to `data/reports.json` and
  photos to `data/photos/`. This needs no setup, and suits one server only.

Both stores pass the same tests and follow the same rules:

- A change is computed from the stored copy, never from what a page showed earlier. Supabase saves
  a change only if the report's version is unchanged since it was read, and otherwise applies it
  again to the newer copy, so two officers saving at once both keep their change.
- A refused change is never written, and every report is validated when it is saved and read.
- Analysis runs once, when a report is submitted, and is stored with it.
- An empty store is filled with the 40 demo reports, dated from the moment it is filled.

Pages show the data as it was when they loaded. They do not update by themselves: refresh to see
changes made on another device.

## AI approach

- **Categorize and summarize:** Claude (`claude-opus-5-5`) returns a category and a
  one-sentence summary as JSON, validated against a schema. The keyword fallback runs when
  there is no key, the call fails, or the reply is invalid.
- **Duplicates:** open reports in the same category, within 100 m and 72 hours, with at least
  20% shared words, are linked as suggestions. Nothing is merged automatically.
- **Hotspots:** three or more open reports within 150 m of each other form an area, found with
  DBSCAN clustering. The card says whether the problems are mixed (possibly one cause) or
  recurring (one kind of problem).
- **Priority:** a score from named factors (category impact, immediate danger, people at risk,
  stated urgency, age, repeats, nearby problems). The model never sets the priority, and each
  factor is shown with its reason.
- **Action briefs:** a headline, the issue, the evidence, a suggested first action and how soon
  to act. Without a key, a template writes the brief from the recorded facts, so every
  statement traces to a fact. With a key, Claude drafts it from the same facts, and the result is
  cached for 30 minutes. Either way the brief is labelled and must be checked before acting.

## Security

- **Prompt injection:** report text is wrapped in tags with angle brackets removed. Model replies
  must match a strict schema, or the rules take over. The model cannot set priorities or change data.
- **Uploads:** photos are checked by their file signature, not the declared type, and capped at
  2 MB after browser resizing. Files are named only by validated tracking IDs.
- **Abuse:** request bodies are capped while streaming, and submissions are rate-limited (10 per
  10 minutes per client address).
- **Officer area:** HTTP Basic sign-in gated by `src/proxy.ts`. It stays locked unless
  `ADMIN_PASSWORD` is at least 12 characters. Officer changes are server actions, which Next.js
  checks for a matching origin, so cross-site requests are rejected.
- **Officer actions** check the sign-in themselves, not only the proxy's path rules. Submissions must be JSON, which stops cross-site HTML forms from posting reports.
- **Database:** only the server talks to Supabase, with a secret key that never reaches the
  browser. The reports table has row level security on with no policies, and the public roles have
  no privileges, so the public key cannot read it. The server can read, add and update reports, but
  not delete them. The photo bucket is private. Errors are logged by code, never with database
  details, which can contain report text.
- **Citizen privacy:** the tracking page is built by one function that leaves out internal
  decisions, officer names, scores, coordinates, and the ID of any report a duplicate was merged
  into. Tracking pages are kept out of search engines.
- **Browser protections:** Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, a strict
  referrer policy, and a permissions policy that allows geolocation only for this site.

## Design

One light theme: a warm off-white page, white cards, and a deep civic green for the header,
buttons and links, with marigold and terracotta as warm accents. The green is kept apart from the
priority colours (red, orange and amber), so urgency always stands out. The theme is defined once,
in `src/app/globals.css`, and buttons share the styles in `src/components/ui/button-styles.ts`.

Three typefaces, each with one job: Fraunces, an expressive serif, for every heading; Figtree for
reading; and IBM Plex Mono for tracking IDs and small labels. All are self-hosted at build time,
so no font request leaves the site. The landing page illustrations are inline SVG
(`src/components/landing/illustrations.tsx`): they need no image requests and are hidden from
screen readers, because the text beside them says the same thing.

## Satellite imagery (Google Earth Engine)

The officer map can show satellite imagery from Google Earth Engine: a cloud-filtered Sentinel-2
true-colour composite of the last 90 days, rendered tile by tile for the area being viewed. A
layer button switches between satellite and the OpenStreetMap street map. This is recent imagery,
not a live camera feed.

To turn it on, you need a Google Cloud project registered with Earth Engine and a service account
with access to it. Set `GOOGLE_EARTH_ENGINE_PROJECT`, and either put the key file in `secrets/`
(git-ignored) and set `GOOGLE_EARTH_ENGINE_KEY_FILE`, or paste the key's JSON into
`GOOGLE_EARTH_ENGINE_KEY`, which is the way to do it on Vercel. Without them, or if Earth Engine
fails, the map shows the street map only, and nothing else changes.

## Accessibility

- Every control has a visible label. Errors are linked to their fields with `aria-describedby`,
  and a summary at the top lists every problem with links to each field.
- After a failed submit, focus moves to the first invalid field. After a successful submit, focus
  moves to the confirmation.
- A skip link on every page. Text is at least 16 px on phones, and targets are at least 48 px tall.
- Priority is shown as text as well as colour. The map is supplementary: the lists give the same
  information without it.
- Pages that load data have loading states, and the queue and hotspot lists have empty states.
  Every page has an error page and a not-found page.

## Officer workflow

Open a report from the queue to:

- **Assign a team.** New reports are triaged and assigned in one step. The teams are placeholders
  marked "(mock)". Once work starts, the team is fixed.
- **Change the status.** Only the moves the workflow allows are offered. Rejecting a report needs
  a reason. Work cannot start without a team.
- **Correct the category or set the priority.** An officer's priority overrides the calculated
  level, but the calculated score stays visible. A reason is required.
- **Merge a duplicate.** The duplicate leaves the queue and is listed on the report it was merged
  into. Nothing is deleted.

Every change is recorded with the officer's name and the time. The server checks each change
again, and a refused change is never saved. Two officers acting at once cannot overwrite each
other's edits.

## Citizen tracking

`/track/RPT-…` shows the current status, what happens next, and the timeline of progress. Internal
decisions, officer names, and scores are not shown. A duplicate that was merged shows the progress of
the report it joined, without revealing that report's ID.

## Scripts

| Command                                   | What it does                       |
| ----------------------------------------- | ---------------------------------- |
| `npm run dev`                             | Development server                 |
| `npm run build`                           | Production build                   |
| `npm run start`                           | Serve the production build         |
| `npm run lint`                            | ESLint, zero warnings allowed      |
| `npm run typecheck`                       | TypeScript, without emitting files |
| `npm test`                                | Unit tests with Vitest             |
| `npm run format` / `npm run format:check` | Prettier                           |

## Environment variables

See [.env.example](.env.example). Put real values in `.env.local`, which is git-ignored.

- `ADMIN_PASSWORD` (required for the officer area): at least 12 characters.
- `ADMIN_USERNAME` (optional): defaults to `officer`.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (required when deployed): shared storage for every
  device. Set both or neither. Without them, data stays in `data/` on this computer.
- `ANTHROPIC_API_KEY` (optional): enables Claude for categories, summaries and briefs.
- `GOOGLE_EARTH_ENGINE_PROJECT`, with `GOOGLE_EARTH_ENGINE_KEY_FILE` or `GOOGLE_EARTH_ENGINE_KEY`
  (optional): turn on satellite imagery on the officer map.

`/api/health` reports which storage the server uses: `"storage":"supabase"` or `"files"`.

To reseed the demo with recent data, delete `data/` (files), or run
`truncate table public.reports;` in the Supabase SQL editor (Supabase). The next dashboard visit
refills the store.

## Deployment

Vercel for the app, and Supabase for the data. The step-by-step guide is
[docs/DEPLOY.md](docs/DEPLOY.md). On Vercel, the build refuses to finish without the Supabase
settings, because files saved there are neither kept nor shared. Read
[docs/LIMITATIONS.md](docs/LIMITATIONS.md) before deploying anywhere public.
