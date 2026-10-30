# Demo script (about 5 minutes)

Follows the judging journey: submit, understand, reveal, act, and track. Times are targets.

## Before you start (once, about 2 minutes)

**Deployed (recommended).** Follow [DEPLOY.md](DEPLOY.md). Shortly before the demo, run
`truncate table public.reports;` in the Supabase SQL editor, then open the officer dashboard
once, so the demo reports are recent. Use a real phone for the citizen steps and a laptop for
the officer steps: they share the same data.

**On one computer.**

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set ADMIN_PASSWORD to a phrase of at least 12 characters.
# Optional: set ANTHROPIC_API_KEY to show AI analysis. The demo works without it.
# Optional: set GOOGLE_EARTH_ENGINE_PROJECT and GOOGLE_EARTH_ENGINE_KEY_FILE for satellite imagery.
rm -rf data          # start from the seed
npm run build
npm run start        # serves on http://localhost:3000
```

Open a phone-sized window (about 375 px wide) for the citizen steps, and a desktop window
for the officer steps. Sign in to `/admin` as `officer` with your `ADMIN_PASSWORD`.
Chrome, Edge or Safari all work.

## 0:00 The problem (30 seconds)

Say it plainly: reports arrive by many channels, the same problem is reported many times,
urgent hazards sit in the same queue as routine requests, and citizens never see what
happened. This app turns scattered reports into a ranked, explained, trackable queue.

## 0:30 Capture a report (phone size)

1. Open http://localhost:3000. Point out the two ways in: citizens and officers. Tap
   **Report a problem** on the citizen card.
2. Description: `Drain outside 14 Lakeview Road is blocked again. Water spills across the road.`
3. Category: **Blocked or open drain**.
4. Location: type coordinates `12.97502` and `77.60102`, and landmark
   `Opposite 14 Lakeview Road`. Type them even on a phone: the duplicate step needs this exact
   spot. Device location works on the deployed site or localhost, in a browser that grants it.
5. Optional: attach any JPEG or PNG photo. It is resized before upload.
6. Tap **Submit report**.

**Expect:** a confirmation with a tracking ID such as `RPT-…`. Note it for step 5.

Point out: the same form validates on the phone and on the server, and the photo is checked
by its file signature, not by its name.

## 1:30 Show how the AI processes it (desktop, `/admin`)

1. On the laptop, open the landing page and click **Sign in as an officer**, or use
   **Officers** in the header. Sign in, find the report the phone just sent in the queue, and
   open it. Say: the phone and the laptop share one database, so the report is already here.
2. In **Analysis**, point out:
   - the summary, which is one sentence written from the report;
   - **Why this priority**, with each factor and its points;
   - **Possibly the same problem as** RPT-1001, RPT-1002, RPT-1003 and RPT-1004.

**Expect:** the duplicate links point to the seeded drain reports on Lakeview Road. The
analysis line says "Calculated by rules" or "by the AI model", depending on whether a key is
set.

Say: duplicates are suggestions, not automatic merges. The officer decides.

## 2:30 Reveal the patterns (`/admin`, top of the page)

1. Point to the four cards: open reports, urgent, possible repeats, hotspots.
2. Point to the map. Dashed circles are hotspots.
3. Under **Hotspots**, find the Lakeview Road card.

**Expect:** a hotspot with about eight open reports and several kinds of problem, labelled
mixed. Its brief says the drains should be inspected first, because a blocked drain is the
likely cause of the waterlogging and road damage nearby. The brief is labelled as written
from the recorded facts, or as AI-drafted, and says to verify it before acting.

Also point out that the queue is ranked, and the four safety reports (exposed wire,
missing manhole cover, flood water, sinkhole) are at the top.

## 3:30 Track the action (desktop, `/admin`)

Open the new report's detail page and do these in order:

1. **Assign a team.** Leave the suggested team, and click **Assign team**.
   **Expect:** "Team assigned." The status is now Assigned to a team.
2. **Try an invalid move.** In Change status, the only options offered are the valid ones.
   Say: the server also refuses invalid moves, for example jumping from Submitted to Resolved.
   If you want to show that, use the browser developer tools to add that option and submit.
   **Expect:** "Not saved. Cannot move a report from Submitted to Resolved."
3. **Move through the workflow.** Choose **Work in progress**, then **Resolved**.
   **Expect:** "Status updated." After resolving, the actions are replaced by "This report is
   closed or merged, so it cannot be changed."
4. **Merge a duplicate.** Open RPT-1014 (a streetlight on Park Avenue, which is a seeded
   duplicate), and merge it into RPT-1013.
   **Expect:** you land on RPT-1013, which now lists RPT-1014 under "Merged into this
   report". RPT-1014 has left the queue.
5. **Show the history.** Scroll to **History** on any report.
   **Expect:** every change, with the officer's name and the time. Say: the history is the
   audit trail, and the citizen sees the same progress in plainer words.

## 4:30 Citizen sees progress (phone, signed out)

1. On the phone, open `/track/` followed by the tracking ID from step 0:30, or enter the ID
   on the landing page. You do not need to sign in.
2. Point out: current status, **What happens next**, and the timeline.

**Expect:** "Assigned to a team" or later, the team name, and the timeline oldest first.
The officer's name, scores and coordinates are not shown. Say: the citizen can see progress
without seeing internal decisions.

Refresh the page after an officer action to show it updating.

## 4:50 Honesty (30 seconds)

Say what is mocked: the teams are placeholders, sign-in is a single shared login, there are
no SMS notifications, and the 40 reports are synthetic. Point to `docs/LIMITATIONS.md` for
the full list, including where the AI can be wrong.

## If something goes wrong

- **Submission fails with "Could not reach the server".** Check that `npm run start` is
  still running, or that the deployed site loads.
- **"We could not save your report".** On the deployed site, check the Vercel logs and the
  troubleshooting table in [DEPLOY.md](DEPLOY.md). A free Supabase project pauses after a week
  without use, and must be restored from the Supabase dashboard.
- **The officer area says it is locked.** `ADMIN_PASSWORD` is missing or shorter than 12
  characters. Set it in `.env.local` or in Vercel, and restart or redeploy.
- **No duplicates appear for the new report.** The seed is dated from when the store was
  filled, and the duplicate rule only looks back 72 hours. Reset it: `truncate table
public.reports;` in Supabase, or `rm -rf data` and a restart on one computer.
- **The map is blank.** It loads OpenStreetMap tiles, which need internet access. The lists
  show the same information.
- **Briefs say "Written from the recorded facts without AI".** That is expected with no key.
  It is the rules fallback, not an error.
