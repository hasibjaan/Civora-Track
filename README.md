# From Complaints to Action

An AI-assisted platform that turns scattered citizen reports into a prioritized, explained and
trackable work queue for local officers. Built with Next.js 16 for the PromptWars x ASTRA hackathon.

- **Problem statement:** [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md)
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

Requirements: Node.js 20.9 or newer, and npm.

```bash
npm install
cp .env.example .env.local     # then set ADMIN_PASSWORD (12+ characters)
npm run build
npm run start                  # http://localhost:3000
```

- Citizens: http://localhost:3000 → **Report a problem**, and track at `/track/RPT-…`.
- Officers: http://localhost:3000/admin, sign in as `officer` with your `ADMIN_PASSWORD`.

Use `npm run dev` for development. The production build is the one to demonstrate, since it
has no development overlay.

## Verification

| Check                                                     | Result                                                                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests (`npm test`)                                   | 239 passing across 33 files, including the seed data's duplicate groups, urgent safety cases, and the officer rules                                              |
| Lint, typecheck, formatting                               | Pass, with zero warnings allowed                                                                                                                                 |
| Production build                                          | Passes with zero warnings                                                                                                                                        |
| Dependency audit                                          | Zero known vulnerabilities                                                                                                                                       |
| axe-core accessibility audit                              | Zero violations on every screen checked, including the officer pages signed in                                                                                   |
| Lighthouse, mobile (`/report`)                            | Performance 91, accessibility 100, best practices 100, SEO 100                                                                                                   |
| Lighthouse, mobile (`/track`)                             | Performance 96, accessibility 100, best practices 100. SEO is lower on purpose: tracking pages are kept out of search engines because they hold personal details |
| Browser flows, headless Chrome at phone and desktop sizes | Submission with photo, the full officer workflow, and the citizen's view after an officer action                                                                 |

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
src/data/         Storage (server-only): JSON report store, photo files, seed data
src/components/   UI: report form, officer forms and dashboard, citizen timeline
src/lib/          Request helpers: body size limit, rate limit, image resizing, sign-in check
tests/            Unit tests, mirroring src/
```

The domain layer imports nothing from the rest of the app, so every rule can be tested
without a server or a browser.

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
- **Citizen privacy:** the tracking page is built by one function that leaves out internal
  decisions, officer names, scores, coordinates, and the ID of any report a duplicate was merged
  into. Tracking pages are kept out of search engines.
- **Browser protections:** Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, a strict
  referrer policy, and a permissions policy that allows geolocation only for this site.

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
- `ANTHROPIC_API_KEY` (optional): enables Claude for categories, summaries and briefs.
- `NEXT_PUBLIC_APP_NAME` (optional): the page title.

Runtime data lives in `data/` and is git-ignored. Delete it to reseed the demo with recent data.

## Deployment

Not deployed. Next.js deploys to Vercel with default settings, but the JSON store and the
in-memory rate limiter only suit a single server. Read [docs/LIMITATIONS.md](docs/LIMITATIONS.md)
before deploying anywhere public. Use HTTPS, because officer sign-in uses Basic credentials.
