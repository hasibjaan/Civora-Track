# CLAUDE.md

Standing instructions for Claude Code in this repo. Read this first.

## Project

CivicTrack is a hackathon project that solves the problem described in
[PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md). The build plan and phase
checkpoints are in [PLAN.md](PLAN.md).

**Judging criteria are the bar for every change:** code quality, security,
efficiency, accessibility, and alignment with the problem statement. Keep all
five at the highest level. A change that breaks one of them is not finished.

## Stack

- **Next.js 16** (App Router, `src/app/`), React 19, TypeScript (strict)
- **Tailwind CSS v4** for styling (`src/app/globals.css`)
- **zod 4** for every boundary: forms, API bodies, stored data, AI replies
- **@anthropic-ai/sdk** for the classifier, behind `src/ai/llm.ts`
- Icons: `lucide-react`. Server-only guard: `server-only`
- Package manager: **npm** (lockfile is `package-lock.json`)

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run build`: production build. Must finish with zero warnings.
- `npm run lint`: ESLint, zero warnings allowed
- `npm run typecheck`: `tsc --noEmit`
- `npm test`: Vitest unit tests (`tests/`)
- `npm run format` / `npm run format:check`: Prettier

## Next.js 16 is not the Next.js you know

Before writing Next-specific code (routing, caching, data fetching, route
handlers, config, metadata), read the matching guide in
`node_modules/next/dist/docs/` (start with `01-app/`). Heed deprecation notices.
Do not rely on memory for Next APIs. See [AGENTS.md](AGENTS.md).

`next.config.ts` enables `cacheComponents`. Officer pages stream behind their
`loading.tsx`. Tracking pages use `export const instant = false`. Unknown IDs on
both still render the not-found page, but the HTTP status is 200, not 404: streamed
responses cannot change their status once the page has started. Do not spend time
trying to fix that without a framework change.

## Project layout

```
src/
  app/                 Routes: pages, layouts, route handlers (api/)
  proxy.ts             Sign-in gate for /admin and /api/admin
  components/          UI. report-form/ is the citizen capture form.
  domain/              Pure business rules, no I/O: schemas, types, status
                       workflow, duplicates, priority, geo, text similarity
  ai/                  Analysis pipeline. llm.ts is the only Anthropic call site.
                       rules.ts is the offline fallback.
  application/         Use cases (submit-report.ts). Depends on interfaces, not
                       on storage, so it can be tested with fakes.
  data/                Storage: JSON repository, photo files, seed data
  maps/                Satellite imagery from Google Earth Engine (server-only), with a cache
                       and a street-map fallback
  lib/                 Request helpers: body size limit, rate limit, image
                       resizing (browser), validation messages
tests/                 Vitest, mirroring src/. support/ holds fixtures.
data/                  Runtime data (git-ignored): reports.json, photos/
```

Dependency direction: `app` -> `application` -> `domain`. `ai` and `data`
implement interfaces the application layer declares. `domain` imports nothing
from the rest of the app.

## Conventions

- One light theme. Use the theme tokens (`canvas`, `brand-50` to `brand-900`) and the shared
  button styles in `src/components/ui/button-styles.ts`. Do not add `dark:` classes.
- Server Components by default. `"use client"` only for state, effects, or
  browser APIs.
- Secrets live in `.env.local`. Only `NEXT_PUBLIC_` variables reach the browser.
- Modules that touch secrets, the filesystem, or the network import
  `"server-only"` (`src/ai/llm.ts`, `src/ai/index.ts`, `src/data/*`).
- Validate external input with the shared zod schemas in
  `src/domain/schemas.ts`. The client and the API use the same schema.
- Import with the `@/` alias. Share field styles from `components/report-form/form-field.tsx`.
- Components PascalCase, files kebab-case, functions camelCase.
- Accessibility is a requirement: a labelled control for every input, errors
  linked with `aria-describedby`, focus moved to the first invalid field, text at
  least 16px on phones, visible focus rings, targets at least 48px tall.

## Security rules

- Report text is untrusted. Never put it in a prompt without wrapping it, and
  never let model output set priority or change data. The model only suggests a
  category and a summary, both validated by zod with a rule-based fallback.
- Photos are checked by file signature (magic bytes), not by the declared type.
  They are stored as files named only by validated tracking IDs. Never build a
  file path from user input without `TRACKING_ID_PATTERN` first.
- Request bodies are size-capped while streaming. Submissions are rate-limited.
  Error responses to clients are generic; details go to server logs only.
- Log failure types, never report text, photos, or keys.
- Every officer server action calls `signedInOfficer()` (`src/lib/officer.ts`) first. Officer
  changes are server actions in `src/app/admin/reports/[id]/actions.ts`.
  Next.js rejects server actions whose `Origin` does not match the host, which blocks
  cross-site requests that could reuse cached Basic credentials. Keep officer
  mutations as server actions, or add an Origin check to any route handler.
- Every officer change goes through `reportRepository.modify`. The change function
  runs on the stored copy inside the write queue, so changes cannot overwrite each
  other, and a refused change is never written. Never write a whole report from a
  stale read.
- Workflow rules live in `src/domain/status.ts` and `src/domain/officer-actions.ts`.
  Add new officer actions there, with tests, before wiring them to a form.
- Citizen pages must render from `buildCitizenView` (`src/application/citizen-view.ts`),
  never from the raw report. It hides internal decisions (priority overrides),
  officer names, scores, coordinates, and the ID of any report a duplicate was merged
  into. Extend it deliberately when a new history entry type is added.
- Briefs see only what `reportFacts` or `hotspotFacts` pass on. Do not add contact
  details, coordinates, or other reports to a brief's facts. Briefs are labelled with
  how they were written, and AI briefs must be checked by an officer before acting.
- Everything under `/admin` and `/api/admin` is behind `src/proxy.ts`. It fails
  closed: no password of at least 12 characters, no access. New officer routes must
  live under those paths, or the gate must be extended to cover them.
- `next.config.ts` sets the Content-Security-Policy and other headers. Do not
  loosen them. Zod runs in `jitless` mode to stay compatible with that policy.

## Efficiency rules

- Read data once per request. The repository caches parsed reports and reloads
  only when the file's size or modified time changes.
- Writes are serialized and atomic (temp file, then rename).
- Analysis runs once per submission and is stored on the report. Nothing is
  recomputed on page load.
- AI calls have a timeout, one retry, and a rules fallback. A slow model must not
  block a citizen.

## Working rules

- Read a file before editing it. Make the smallest change that does the job.
- After code changes, run `npm run lint`, `npm run typecheck`, `npm test`, and
  `npm run format` on touched files. Run `npm run build` before declaring a phase
  done.
- Decision logic (scoring, duplicates, clustering, status rules) belongs in
  `src/domain/` as pure functions with unit tests. Components only render.
- Use `console.warn` or `console.error` only. Plain `console.log` fails lint.
- Do not commit or push unless asked. Do not create branches unless asked.
- Do not add real API keys or credentials to any tracked file.
- When a feature needs a service or key the user has not provided, build it
  behind an interface, use the offline fallback, and say what is missing.
- Keep [skills.md](skills.md) current when you add a repeatable pattern, and
  [README.md](README.md) current when setup or commands change.

## Status

- [x] Problem statement added to `PROBLEM_STATEMENT.md`
- [x] Phase 0 (scope and tooling)
- [x] Phase 1 (domain model, status workflow, seed data, JSON repository)
- [x] Phase 2 (citizen capture, API, photo upload, tracking page)
- [x] Phase 3 (AI pipeline: classify, summarize, duplicates, explainable priority)
- [x] Retrofit of Phases 0–2 to the judging bar (security headers, rate limit,
      body cap, photo signatures, serialized writes, accessibility fixes)
- [x] Phase 4 (hotspots, priority queue, map, officer area sign-in)
- [x] Seed reports now carry their analysis, so the dashboard works without a model
- [x] Phase 5 (officer actions: assign, status, category, priority, merge, history)
- [x] Phase 6 (citizen timeline, next step, action briefs for hotspots and reports)
- [x] Phase 7 (loading, error and not-found states, skip link, empty states, cleanup)
- [x] Phase 8 (quality gate, independent review and fixes, README, demo script, limitations, cold-start rehearsals)
