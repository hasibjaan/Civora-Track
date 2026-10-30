# PLAN.md: From Complaints to Action (8-hour build)

Build plan for the PromptWars x ASTRA hackathon. Source: [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md).

The plan is ordered so that a working end-to-end flow exists by about hour 3, and every later phase adds to it. Each phase ends with a checkpoint. If a checkpoint fails, fix it before moving on.

## Code standards (apply in every phase)

- **Separate logic from UI.** Scoring, duplicate detection, clustering, and status rules live in `src/domain/` as pure functions with no React or I/O. Components only render and call those functions.
- **Validate at boundaries.** Every form, route handler, and AI response passes through a zod schema. No `any`, no unchecked `as` casts. Keep `strict` TypeScript on.
- **Small, named units.** One responsibility per file, functions under about 40 lines, and no commented-out code, dead code, or stray `console.log`.
- **Test the logic that makes decisions.** Priority scoring, duplicate detection, clustering, and status transitions get unit tests (Vitest).
- **Format and lint on every save.** Prettier formats; ESLint runs with zero warnings in the final gate.
- **Comments explain why, not what.**

Target folder layout:

```
src/
  domain/      types, categories, status rules, priority, duplicates, clustering (pure)
  ai/          classifier, summarizer, brief generator, rule-based fallbacks
  data/        seed generator, JSON repository
  components/  UI pieces (form, map, queue, timeline)
  app/         routes: /report, /admin, /track/[id], /api/*
  lib/         request helpers (body limits, rate limiting, image resizing)
tests/         unit tests mirroring domain/ and ai/
```

---

## Phase 0: Scope and tooling (0:00–0:30)

- Write the MVP scope in `PROBLEM_STATEMENT.md` and `CLAUDE.md`. List what is in and what is cut.
- Install Vitest and Prettier. Add `test`, `format`, and `typecheck` scripts.
- Create the folder skeleton. Folders are populated with real modules in Phase 1 onward (no empty placeholder files).
- Decide the store: a JSON file in `data/`, read and written through `src/data/repository.ts`.

**Checkpoint:** `npm run lint`, `npm run typecheck`, and `npm test` all run and pass.

---

## Phase 1: Domain model and seed data (0:30–1:15)

- Define types in `src/domain/types.ts`: `Report`, `Category`, `Status`, `Location`, `Priority`, `Analysis`, `HistoryEntry`.
- Write the status transition map (`submitted → triaged → assigned → in_progress → resolved`, with `rejected` as a terminal branch). Test every allowed and forbidden move.
- Write a deterministic seed generator producing 40 reports, including:
  - 4 reports of the same blocked drain (duplicates)
  - 3 to 4 urgent safety reports (exposed wire, flooding near a school)
  - one geographic cluster of mixed categories on one street
  - reports spread across 30+ days
- Write the JSON repository with `list`, `get`, `create`, and `update`.

**Checkpoint:** the seed loads, the repository tests pass, and the status transition tests pass.

---

## Phase 2: Capture (1:15–2:15)

- `/report` page: a single-column, mobile-first form with description, category select, optional image, and location.
- Location paths: "use my location" (browser geolocation) and an address text field. Tap-to-place map pin is added in Phase 4 if time allows.
- Shared zod schema used by both the client form and the server handler. Image size and type are checked.
- On submit, show a confirmation screen with the tracking ID and a link to `/track/[id]`.

**Checkpoint:** submit a report at 375 px width. It persists after a refresh and appears in the JSON store.

---

## Phase 3: The AI pipeline (2:15–3:30)

Build each stage as an independent, typed function, composed in `src/ai/pipeline.ts`:

1. **Classify:** the LLM returns a category as JSON. A rule-based keyword classifier is the fallback, used when there is no API key or the call fails.
2. **Summarize:** one-sentence summary of the description.
3. **Duplicate check** (`domain/duplicates.ts`, pure): combines text similarity, category match, distance under about 100 m, and a window under about 72 h. Returns matched report IDs and a score. It links reports and does not delete them.
4. **Priority** (`domain/priority.ts`, pure): a weighted score with named factors (safety keyword, category severity, linked-report count, cluster membership, age). Returns the score plus `{ factor, points, reason }` entries, which the UI renders directly.

Store the `Analysis` on each report, so the pipeline runs once per submission.

**Tests:** priority factors sum correctly, duplicates are detected for seeded pairs, and unrelated nearby reports are not merged.

**Checkpoint:** submitting a report shows its category, summary, duplicate link, priority score, and reasons.

---

## Phase 4: Reveal (3:30–4:30)

- `domain/clustering.ts` (pure): group open reports by location (DBSCAN or grid). Flag clusters of 3 or more with mixed categories. Test on the seeded street cluster.
- `/admin` dashboard: summary cards (open, urgent, duplicates merged, clusters) and a priority-sorted queue.
- Map with Leaflet and OpenStreetMap tiles (no API key). Markers colored by priority; clusters drawn as a highlighted area.

**Checkpoint:** the dashboard shows the seeded cluster as a hotspot, and the top of the queue is the urgent safety report.

---

## Phase 5: Act (4:30–5:30)

- Report detail panel in `/admin`: category and priority overrides, assignment to a team (mock team names, labelled as mocked), and status changes restricted to the transition map.
- Merge action: link a duplicate to a primary report.
- Every change appends a `HistoryEntry` (who, what, when), shown to officers and citizens.

**Checkpoint:** assign a report, move it to `resolved`, and try an invalid transition. The invalid one is blocked with an error.

---

## Phase 6: Citizen tracking and action brief (5:30–6:30)

- `/track/[id]`: current status, a plain-language timeline, and the expected next step. No internal notes.
- Action brief: for a cluster or high-priority report, the LLM generates a short structured brief (issue, evidence, suggested action, urgency). A rule-based template is the fallback. Labelled "Generated by AI, verify before acting."
- Cache briefs for seed data so the demo does not depend on a live API call.

**Checkpoint:** an officer's status change is visible on the citizen's tracking page after a refresh.

---

## Phase 7: Polish and edge cases (6:30–7:15)

- Loading, empty, and error states on every page.
- AI failure path: with the LLM disabled, the fallbacks still produce results.
- Accessibility pass: labels, focus states, contrast, keyboard use in the admin panel.
- Mobile check on `/report` and `/track/[id]`.
- Remove dead code; read every file once for naming and comments.

**Checkpoint:** with the API key unset, the whole demo still works.

---

## Phase 8: Quality gate, docs, and rehearsal (7:15–8:00)

- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. All pass with zero warnings.
- README: setup, scripts, architecture, the AI approach for each feature, and how to run without an API key.
- Limitations and Honesty section: what is real, what is mocked, where the AI can be wrong, and what comes next.
- Rehearse the 5-minute demo twice from a cold start. Record a backup video.

**Checkpoint:** a fresh clone runs with `npm install && npm run dev`, and the demo flow works.

---

## Cut lines (decide early)

- **At hour 4, if behind:** drop image categorization by vision, the tap-to-place map pin, and embeddings. Keep text similarity.
- **At hour 5.5, if behind:** replace the LLM action brief with the template brief and label it honestly.
- **Never cut:** the end-to-end flow, priority and duplicate explanations, the citizen status view, and the limitations note.

## Demo checkpoints

| Time | Must be true                                                                    |
| ---- | ------------------------------------------------------------------------------- |
| 3:30 | Submit a report and see category, summary, duplicate link, and priority reasons |
| 5:30 | Hotspot visible on the dashboard; an officer can assign and move a report       |
| 7:00 | Citizen sees the status change; the fallback path works without an API key      |
| 8:00 | Quality gate passes, README and limitations written, demo rehearsed             |
