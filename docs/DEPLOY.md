# Deploying Civora

This puts Civora online so that every phone and laptop shares the same reports. Reports live
in a Supabase Postgres database, photos in a private Supabase Storage bucket, and the app runs on
Vercel. The free plans of both are enough for the demo. Allow about 15 minutes.

```
Phones and laptops ──HTTPS──> Vercel (Next.js server) ──secret key──> Supabase
                                                                       ├─ reports table
                                                                       └─ report-photos bucket
```

Browsers never talk to Supabase. Only the server does, so no database key ever reaches a browser.

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a project. Choose the region closest
   to your users, for example Mumbai for India. Keep the database password somewhere safe. The app
   does not use it.
2. Wait until the project says it is ready.

## 2. Create the table and the photo bucket

1. Open **SQL Editor** and start a new query.
2. Paste the whole of
   [supabase/migrations/20261030120000_reports.sql](../supabase/migrations/20261030120000_reports.sql)
   and click **Run**. It is safe to run again if you are unsure whether it ran.
3. Check the result. **Table Editor** shows an empty `reports` table, and **Storage** shows a
   private bucket named `report-photos`.

With the Supabase CLI, `npx supabase link --project-ref <your-project-ref>` followed by
`npx supabase db push` does the same.

## 3. Copy the project URL and a secret key

- **Project URL:** open the project's **Connect** dialog. It looks like `https://abcd.supabase.co`.
  This is `SUPABASE_URL`.
- **Secret key:** open **Settings > API Keys** and create a secret key for this app, for example
  named `civora`. It starts with `sb_secret_`. This is `SUPABASE_SECRET_KEY`. Do not use the
  publishable key: the app refuses it, because the table is closed to it.

The secret key can read and change everything in the project. Put it only in `.env.local` or in
Vercel's environment variables, never in a file in the repository.

## 4. Optional: try it on your computer first

Add both values to `.env.local`:

```bash
SUPABASE_URL=https://abcd.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Then run `npm run build` and `npm run start`, and open http://localhost:3000/api/health. It should
show `"storage":"supabase"`. The first visit to the officer dashboard fills the empty table with the
40 demo reports. Without these two values the app keeps its data in `data/` on your computer, as
before.

## 5. Deploy on Vercel

1. On [vercel.com](https://vercel.com), choose **Add New > Project** and import this GitHub
   repository. Vercel detects Next.js. Keep the default build settings.
2. Add the environment variables before the first deploy:

   | Variable                      | Value                                                                   |
   | ----------------------------- | ----------------------------------------------------------------------- |
   | `SUPABASE_URL`                | From step 3                                                             |
   | `SUPABASE_SECRET_KEY`         | From step 3                                                             |
   | `ADMIN_PASSWORD`              | At least 12 characters. Officers sign in with it.                       |
   | `ADMIN_USERNAME`              | Optional. Defaults to `officer`.                                        |
   | `ANTHROPIC_API_KEY`           | Optional. Turns on AI categories, summaries and briefs.                 |
   | `GOOGLE_EARTH_ENGINE_PROJECT` | Optional. Turns on satellite imagery, with the next one.                |
   | `GOOGLE_EARTH_ENGINE_KEY`     | Optional. Paste the whole service-account key file (JSON) as the value. |

   Vercel's Supabase integration can add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` for you. You
   still need to run step 2.

3. Make sure the production deployment uses the right branch. Vercel deploys the repository's
   default branch to production. If the code is on another branch, such as
   `hackathon-submission`, either merge it into the default branch or set it as the production
   branch in the project's settings, under **Environments > Production**. Share the production
   address, which is public. Preview addresses ask visitors to sign in to Vercel.
4. Under **Settings > Functions**, set the function region to the one nearest your Supabase
   project, for example Mumbai (`bom1`). Every page reads the database, so this keeps pages fast.
5. Deploy. If the Supabase variables are missing, the build stops with a message that names
   them, instead of deploying an app with nowhere to keep reports.

## 6. Check that devices share data

1. Open `https://<your-app>.vercel.app/api/health`. It should show `"storage":"supabase"`.
2. On a phone, open the site, submit a report, and note the tracking ID. Device location works
   here, because the site uses HTTPS.
3. On a laptop, sign in as an officer. The report is in the queue. Assign a team.
4. Back on the phone, open the tracking page. It now says "Assigned to a team".

## Reset the demo data

Duplicate suggestions only look back 72 hours, so start from fresh demo data shortly before
judging:

1. In the **SQL Editor**, run `truncate table public.reports;`
2. Open the officer dashboard. The empty table is refilled with the 40 demo reports, dated from
   now.

Photos of the removed reports stay in the bucket, but nobody can reach them, because the photo
route looks up the report first. Delete them under **Storage** if you like.

## Troubleshooting

Server errors appear in Vercel under the project's **Logs**. They name the failed step and an error
code, never report text.

| What you see                                                | What to do                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| The build stops: "Set SUPABASE_URL and SUPABASE_SECRET_KEY" | Add both variables in Vercel, then redeploy.                                                                                             |
| "Supabase could not list reports (PGRST205)"                | The table does not exist yet. Run step 2.                                                                                                |
| "... (42501)"                                               | The key cannot use the table. Use a secret key, not the publishable key.                                                                 |
| "... (HTTP 401)"                                            | Supabase refused the key. Copy it again, or create a new secret key.                                                                     |
| "... (no response)"                                         | Supabase did not answer within 5 seconds. Free projects pause after a week without use: restore the project from the Supabase dashboard. |
| "Officer area locked"                                       | `ADMIN_PASSWORD` is missing or shorter than 12 characters.                                                                               |

## What protects the data

- **The table is closed to everyone but the server.** Row level security is on with no policies,
  and the public roles have no privileges, so even the publishable key, which is public by design,
  cannot read or change reports.
- **The server can read, add and update reports, but not delete them.** Merged duplicates are kept
  and marked.
- **Two officers saving at once cannot overwrite each other.** The database raises a version number
  on every update, and a change is saved only if the version it was based on is still current.
  Otherwise the app applies the change again to the newer copy.
- **The photo bucket is private.** Photos are served only through `/api/reports/<id>/photo`, which
  validates the ID and looks up the report first. The bucket accepts only JPEG, PNG and WebP up to
  2 MB, the same limits the app checks.
- **Every report is validated** against the app's schema when it is saved and when it is read.
