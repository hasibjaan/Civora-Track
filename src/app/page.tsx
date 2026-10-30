import {
  ClipboardList,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { SITE_NAME, SITE_TAGLINE } from "@/components/brand";
import { TrackLookup } from "@/components/track-lookup";
import { primaryButton } from "@/components/ui/button-styles";

/** The four stages a report goes through, matching the platform's lifecycle. */
const STEPS: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: ClipboardList,
    title: "Report",
    text: "Describe the problem, add the location and a photo. It takes about a minute.",
  },
  {
    icon: Sparkles,
    title: "Sorted for you",
    text: "Each report is categorized, checked for duplicates and given a priority, with the reasons shown.",
  },
  {
    icon: Wrench,
    title: "Officers act",
    text: "The council sees urgent problems and hotspots first, and assigns a team to fix them.",
  },
  {
    icon: Search,
    title: "Track progress",
    text: "Follow your report with its tracking ID, from the first review to the fix.",
  },
];

const CARD = "flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8";
const ICON_BADGE =
  "flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-800";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <section aria-labelledby="hero-heading" className="border-b border-brand-100 bg-brand-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-12 md:py-16">
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
            {SITE_NAME}
          </p>
          <h1
            id="hero-heading"
            className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl"
          >
            {SITE_TAGLINE}
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Report a civic problem and see it fixed. Potholes, blocked drains, broken streetlights
            and garbage piles reach the right team faster, and you can follow every step.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="choose-heading"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10"
      >
        <h2 id="choose-heading" className="text-2xl font-semibold text-zinc-950">
          How would you like to continue?
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <article aria-labelledby="citizen-heading" className={CARD}>
            <span className={ICON_BADGE}>
              <UserRound className="size-6" aria-hidden />
            </span>
            <h3 id="citizen-heading" className="text-xl font-semibold text-zinc-950">
              I&apos;m a citizen
            </h3>
            <p className="text-base text-zinc-700">
              Report a problem in your area. You do not need an account: you get a tracking ID
              instead.
            </p>
            <Link href="/report" className={`${primaryButton} w-full sm:w-fit`}>
              Report a problem
            </Link>
            <div className="mt-2 border-t border-zinc-200 pt-5">
              <TrackLookup label="Already reported? Enter your tracking ID" />
            </div>
          </article>

          <article aria-labelledby="officer-heading" className={CARD}>
            <span className={ICON_BADGE}>
              <ShieldCheck className="size-6" aria-hidden />
            </span>
            <h3 id="officer-heading" className="text-xl font-semibold text-zinc-950">
              I&apos;m a council officer
            </h3>
            <p className="text-base text-zinc-700">
              See open reports ranked by priority, hotspots on the map, and a short action brief for
              each one.
            </p>
            {/* No prefetch, so the browser does not ask for credentials before the click. */}
            <Link href="/admin" prefetch={false} className={`${primaryButton} w-full sm:w-fit`}>
              Sign in as an officer
            </Link>
            <p className="text-sm text-zinc-700">
              Your browser will ask for your officer username and password.
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
          <h2 id="how-heading" className="text-2xl font-semibold text-zinc-950">
            How it works
          </h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3">
                <span className={ICON_BADGE}>
                  <step.icon className="size-6" aria-hidden />
                </span>
                <p className="text-sm font-semibold text-brand-700">Step {index + 1}</p>
                <h3 className="text-lg font-semibold text-zinc-950">{step.title}</h3>
                <p className="text-base text-zinc-700">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
