# Limitations and honesty note

This note says what is real, what is mocked, where the AI can be wrong, and what we would do
next. It is written for judges, officers and anyone deciding whether to trust the prototype.

## What is real

- **Report capture.** Citizens submit a description, a category, a location (device GPS, or
  typed coordinates) and a landmark, with an optional photo. Photos are resized in the
  browser, checked by their file signature on the server, and stored as files.
- **Storage.** Reports live in a JSON file on the server (`data/reports.json`). Writes are
  serialized and atomic, so concurrent updates cannot overwrite each other.
- **Analysis.** Each report gets a category, a one-sentence summary, a list of likely
  duplicates, and a priority score with the reason for each point. Without an AI key, this
  runs on keyword and distance rules. With a key, Claude proposes the category and summary.
- **Hotspots.** Areas with three or more open reports within 150 m are found with DBSCAN
  clustering. Each hotspot card explains whether the problems are mixed or recurring.
- **Officer workflow.** Assign a team, move through the status workflow, correct the
  category, set a priority with a reason, and merge duplicates. Every change is recorded in
  the history with the officer's name and the time. Invalid moves are refused on the server.
- **Citizen tracking.** A citizen sees the current status, what happens next, and a timeline
  of progress. Internal decisions, officer names, scores and coordinates are not shown.
- **Security controls.** The officer area is behind HTTP Basic sign-in and fails closed
  without a strong password. Responses carry a Content-Security-Policy and other security
  headers. Requests are size-capped while streaming and submissions are rate-limited. The
  photo endpoint validates IDs before touching the filesystem.

## What is mocked

- **Response teams.** The five teams (roads, drainage, streetlights, sanitation, water) are
  placeholders. Their names say "(mock)" everywhere they appear. They are not connected to
  any council directory.
- **Officer sign-in.** There is one shared officer login, set by environment variables. There
  are no per-officer accounts, so the history shows the shared name, not a person.
- **Notifications.** Citizens are not told by SMS or email when the status changes. They
  reload the tracking page to see progress.
- **Demo data.** The 40 seeded reports are synthetic. Their addresses are invented, and their
  coordinates sit inside one city so that the map has something to show. No real person's
  data is used.
- **Integration with the council.** There is none. Reports do not reach any real system.

## Where the AI can be wrong

- **Categories.** The model, or the keyword rules when no model is available, can file a
  report under the wrong category. Officers can correct it, and the correction is recorded.
- **Summaries.** A summary can leave out a detail that matters, or state one that is not in
  the report. The full report text is always shown next to the summary on the officer page.
- **Duplicates.** Two reports can be flagged as duplicates when they are different problems
  in the same place with similar words, for example two drains on one street. Duplicates are
  suggestions. Nothing is merged without an officer's action.
- **Priority.** The priority score is a set of hand-chosen weights. It has not been
  calibrated against real complaint data, so the ordering reflects our judgement, not
  measured outcomes. Every point is shown with its reason so the judgement can be checked.
- **Action briefs.** A brief can suggest the wrong first action. Each brief says whether it
  was written by AI or from the recorded facts, and tells the officer to verify it before
  acting.
- **Prompt injection.** Report text is wrapped in tags, angle brackets are removed, and the
  model's reply must match a strict schema or the rules take over. This reduces the risk. It
  does not remove it, and the model is never allowed to set a priority or change data.

## Limits we tuned ourselves

- The duplicate thresholds (100 m, 72 hours, 20% shared words) and the priority weights were
  chosen by reasoning about the seeded data, and the seed tests check that they behave on it.
  The seed is small and was written by us, so these numbers may not hold for real reports.

## Security and privacy limits

- **Tracking IDs are the only access control for citizens.** Anyone with a tracking ID can see
  that report's status, description and photo. The IDs are 48 random bits, which is hard to
  guess, but a leaked ID exposes that report. Citizens should be told to keep it private.
- **The rate limiter is in memory and trusts `X-Forwarded-For`.** It works for one server
  behind a trusted proxy. It can be bypassed by a client that talks to the server directly
  with a forged header, and it does not share state across servers.
- **Basic credentials are only encoded.** Use HTTPS in any real deployment.
- **Content-Security-Policy allows inline scripts.** Next.js needs them for hydration. A nonce
  based policy would be stricter.
- **Map tiles come from OpenStreetMap.** The map needs internet access, and that provider's
  tile policy is meant for light use. A deployment should use a tile provider it has a
  contract with.
- **Not-found pages return HTTP 200.** The page content is correct, but streamed responses
  cannot change their status code once they have started.
- **Submission needs JavaScript.** Citizens submit the form through `fetch`. Without
  JavaScript the form does nothing.

## Performance limits

- **Priorities are recalculated on every page view.** Each view compares every pair of open
  reports, so the cost grows with the square of the number of reports. Fine for hundreds of
  reports, not for a city.
- **Clustering is quadratic.** It compares every pair of open reports. That is fine for
  hundreds of reports. A city-scale deployment would need a spatial index.
- **The whole report file is held in memory.** It is re-read only when it changes, but it
  must fit in memory.
- **Model calls can slow the officer dashboard.** Briefs are written in parallel with a
  10-second timeout per call and cached for 30 minutes. The page shows a loading state while
  this happens.

## What we verified, and what we did not

- **Verified:** the full test suite (222 unit tests), lint, typecheck, a production build with
  no warnings, zero known dependency vulnerabilities, axe-core on every screen with zero
  violations, Lighthouse on the public pages, and the officer and citizen flows in headless
  Chrome at phone and desktop widths.
- **Verified with an invalid key only:** the AI path. We could not call the live model during
  the build. Submissions and briefs were checked with an invalid key, which exercises the
  fallback, and with fake models in the tests. A successful live call has not been observed.
- **Independent review.** A fresh reviewer read the security- and correctness-critical code and
  reported 16 findings. Each was checked against the code before any change. Fifteen were
  addressed with regression tests. One, a report that officer actions could run without
  signing in, could not be reproduced: the requests were refused. The check was added to every
  action anyway, so the protection no longer depends on the framework refusing them. The
  remaining finding is the inline-script allowance in the Content-Security-Policy, which is
  a known trade-off for Next.js.
- **Not verified:** screen-reader testing with real users, real phones beyond emulation, and
  behaviour under many concurrent users.

## What we would do next

1. Per-officer accounts with a real identity provider, so history shows a person.
2. A real database with migrations, replacing the JSON file.
3. SMS or email notifications when a citizen's report changes status.
4. Calibrate the priority weights and duplicate thresholds on real complaints, using officers'
   corrections as labels.
5. Test with real officers and citizens, including screen-reader users, and fix what they find.
6. A nonce-based Content-Security-Policy, and a tile provider with a contract.
7. A spatial index for clustering, and a shared rate limiter (for example, Redis) for more
   than one server.
