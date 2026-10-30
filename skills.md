# skills.md

Reusable, repeatable recipes for this project. Claude Code and teammates should
follow these instead of reinventing patterns. Add a new recipe when a pattern
is used twice.

Read [CLAUDE.md](CLAUDE.md) first for stack and conventions.

---

## 1. Add a new page

1. Create `src/app/<route>/page.tsx` (for example `src/app/dashboard/page.tsx`).
2. Default export a React component. It is a Server Component unless it has
   `"use client"`.
3. Add a `metadata` export for the page title and description.
4. Check the Next 16 guide in `node_modules/next/dist/docs/01-app/` before
   using dynamic params, search params, or caching.

```tsx
// src/app/dashboard/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your data",
};

export default function DashboardPage() {
  return <main className="p-6">Dashboard</main>;
}
```

## 2. Add an API endpoint (route handler)

1. Create `src/app/api/<name>/route.ts`.
2. Export named HTTP methods (`GET`, `POST`, ...).
3. Validate the body with `zod`. Return `400` on bad input.
4. Keep secrets on the server only.

```ts
// src/app/api/items/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

const ItemSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const parsed = ItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ item: parsed.data }, { status: 201 });
}
```

## 3. Add an interactive (client) component

1. Create `src/components/<name>.tsx`.
2. Put `"use client"` on the first line. Only do this when you need state,
   effects, or event handlers.
3. Keep data fetching in the parent Server Component and pass data down as
   props when possible.

```tsx
// src/components/counter.tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setCount((c) => c + 1)}
      className="rounded-md bg-zinc-900 px-4 py-2 text-white"
    >
      Clicked {count}
    </button>
  );
}
```

## 4. Call an API from the UI

1. Use a `fetch` call to a relative route (for example `/api/items`).
2. Handle loading, error, and empty states. Hackathon demos fail on these.
3. Show validation errors from the server response.

## 5. Read and write a form (Server Action)

Check `node_modules/next/dist/docs/01-app/` for the current Server Actions API before
writing one. The pattern this project uses is in `src/app/admin/reports/[id]/actions.ts`:

- A `"use server"` file exports only async functions. Shared types go in a separate module
  (`src/application/action-state.ts`).
- Each action takes `(previousState, formData)`, parses every field with zod, and returns
  an `ActionState` (`idle`, `saved` or `error`).
- The client form uses `useActionState`, so it works without JavaScript and shows a
  pending state.

## 6. Add an environment variable

1. Add the name (no value) to `.env.example` with a comment.
2. Add the real value to `.env.local`. Never commit `.env.local`.
3. Use `process.env.NAME` on the server. Use `NEXT_PUBLIC_NAME` only if the
   browser needs it.
4. Mention it in [README.md](README.md) if it is required to run the app.

## 7. Add a UI component with the project's style

- Use Tailwind utility classes. Put a long class list in one constant when it repeats.
- Share form control styles from `src/components/report-form/form-field.tsx`
  (`inputClassName`, `FieldLabel`, `FieldError`) so every input looks and behaves the same.
- Use `lucide-react` icons, marked `aria-hidden` when a text label is present.
- Use the light theme's tokens (`canvas`, `brand-50` to `brand-900`) and the shared button
  styles in `src/components/ui/button-styles.ts`. Do not add `dark:` classes.
- Use a `<section>` only with a heading it is labelled by. Use a `<div>` for content
  inside another labelled region, or the page gets duplicate landmarks.

## 7a. Add an officer action (a server action with a form)

1. Write the rule first, as a pure function in `src/domain/officer-actions.ts`, returning
   `ChangeResult`. Add tests for every refusal.
2. Add a use case in `src/application/officer-actions.ts` that calls
   `reportRepository.modify(id, rule)`. Never read a report, change it, and write it back
   yourself.
3. Add a zod input schema and a server action in
   `src/app/admin/reports/[id]/actions.ts`. Parse every field, even though the form is
   ours. Call `revalidatePath` for each page that shows the change.
4. Add a form in `src/components/admin/officer-forms.tsx` with `useActionState`, and show
   only the controls the workflow allows.
5. Record a history entry type in `src/domain/schemas.ts`, describe it in
   `src/application/history.ts`, and decide whether citizens should see it in
   `src/application/citizen-view.ts`. Internal decisions are hidden by default.

## 7b. Change what a report stores

Both stores (Supabase and files) keep each report whole, as JSON, and validate it against
`ReportSchema` on every read and write.

1. Add the field to `ReportSchema` in `src/domain/schemas.ts`. Make it optional, so reports
   saved before the change still pass validation. Types follow from the schema.
2. A new field inside a report needs no database change. Only a new column, index or table
   does: add a new file in `supabase/migrations/` (never edit one that has run), and update
   `src/data/supabase-schema.ts` to match. Keep the table closed to `anon` and `authenticated`.
3. Run `npm test`. Both stores run the same contract
   (`tests/data/report-repository-contract.ts`), and both must still pass.

## 8. Pre-demo checklist

Run these and fix anything that fails:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start   # test the production build at http://localhost:3000
```

Then manually walk through the core user flow once on a fresh browser tab.
Check the mobile width too.

For the deployed site, reset the demo data shortly before judging: run
`truncate table public.reports;` in the Supabase SQL editor, then open the officer dashboard
once. Check that `/api/health` shows `"storage":"supabase"`.

---

## Adding a new skill

Append a numbered section with: when to use it, the steps, and a minimal
working code example. Keep it short. Remove recipes that no longer apply.
