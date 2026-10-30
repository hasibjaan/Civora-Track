import {
  ArrowRight,
  ClipboardList,
  CloudRain,
  Construction,
  Copy,
  Droplets,
  Lightbulb,
  MessagesSquare,
  Route,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { SITE_NAME, SITE_TAGLINE } from "@/components/brand";
import {
  CityMapIllustration,
  DrainScene,
  ManholeScene,
  StreetlightScene,
} from "@/components/landing/illustrations";
import { TrackLookup } from "@/components/track-lookup";
import { primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { CATEGORY_LABELS } from "@/domain/categories";
import type { Category } from "@/domain/types";

// The tagline's last phrase is set in italics, so it lands as the promise.
const TAGLINE_SPLIT = SITE_TAGLINE.lastIndexOf(". ") + 1;
const TAGLINE_LEAD = SITE_TAGLINE.slice(0, TAGLINE_SPLIT);
const TAGLINE_LAST = SITE_TAGLINE.slice(TAGLINE_SPLIT).trim();

/** What the platform does for every report. Capabilities only: no invented figures. */
const PROMISES: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Timer, title: "About a minute", text: "to report, on a phone, with or without a photo." },
  {
    icon: Copy,
    title: "Repeats spotted",
    text: "Reports of the same problem are linked, not lost.",
  },
  {
    icon: Scale,
    title: "Priority explained",
    text: "Every point of a score comes with its reason.",
  },
  {
    icon: Route,
    title: "No account needed",
    text: "A tracking ID follows your report to the fix.",
  },
];

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  waterlogging: CloudRain,
  drainage: Droplets,
  road_damage: Construction,
  streetlight: Lightbulb,
  waste: Trash,
  other: MessagesSquare,
};

/** Three stories from the demo data, each showing one thing the platform does. */
const CASES: ReadonlyArray<{
  scene: ComponentType<{ className?: string }>;
  tag: string;
  place: string;
  title: string;
  text: string;
}> = [
  {
    scene: DrainScene,
    tag: "Hotspot",
    place: "Lakeview Road",
    title: "Eight reports, one root cause",
    text: "Neighbours reported blocked drains, standing water and a damaged road within a few metres. Civora grouped them into one hotspot, and its brief told the officer to clear the drains first.",
  },
  {
    scene: ManholeScene,
    tag: "Urgent",
    place: "Station Road",
    title: "A missing manhole cover jumps the queue",
    text: "The report mentioned a bus stop and the dark. The safety factor lifted it to urgent, ahead of older routine work, with each reason shown to the officer.",
  },
  {
    scene: StreetlightScene,
    tag: "Duplicate",
    place: "Park Avenue",
    title: "Two reports, one repair",
    text: "A dark lane was reported twice. Civora flagged the repeat, so the officer can merge it into the first report, and both citizens then follow the same repair on their tracking pages.",
  },
];

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

const SECTION = "mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 md:py-20";
const EYEBROW = "font-mono text-sm font-medium tracking-widest text-terracotta uppercase";
const SECTION_TITLE = "text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl";
const CARD = "flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8";
const ICON_BADGE =
  "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden border-b border-brand-100 bg-brand-50"
      >
        {/* Soft marigold glow behind the map, purely decorative. */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-96 rounded-full bg-marigold/30 blur-3xl"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="flex flex-col gap-6">
            <p className={EYEBROW}>{SITE_NAME} · civic reporting</p>
            <h1
              id="hero-heading"
              className="text-5xl leading-[1.05] font-semibold tracking-tight text-zinc-950 md:text-6xl"
            >
              {TAGLINE_LEAD} <em className="font-medium text-brand-700 italic">{TAGLINE_LAST}</em>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-700">
              Report a civic problem and see it fixed. Potholes, blocked drains, broken streetlights
              and garbage piles reach the right team faster, and you can follow every step.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/report" className={primaryButton}>
                Report a problem
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              <Link href="/track" className={secondaryButton}>
                Track a report
              </Link>
            </div>
          </div>
          <CityMapIllustration className="w-full drop-shadow-xl" />
        </div>
      </section>

      <section aria-labelledby="promises-heading" className="border-b border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <h2 id="promises-heading" className="sr-only">
            What every report gets
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((promise) => (
              <li key={promise.title} className="flex gap-4">
                <span className={ICON_BADGE}>
                  <promise.icon className="size-6" aria-hidden />
                </span>
                <p className="text-base text-zinc-700">
                  <span className="block font-display text-xl font-semibold text-zinc-950">
                    {promise.title}
                  </span>
                  {promise.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="choose-heading" className={SECTION}>
        <div className="flex flex-col gap-3">
          <p className={EYEBROW}>Start here</p>
          <h2 id="choose-heading" className={SECTION_TITLE}>
            How would you like to continue?
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <article aria-labelledby="citizen-heading" className={CARD}>
            <span className={ICON_BADGE}>
              <UserRound className="size-6" aria-hidden />
            </span>
            <h3 id="citizen-heading" className="text-2xl font-semibold text-zinc-950">
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
            <h3 id="officer-heading" className="text-2xl font-semibold text-zinc-950">
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

      <section aria-labelledby="categories-heading" className="bg-brand-800 text-white">
        <div className={SECTION}>
          <div className="flex flex-col gap-3">
            <p className="font-mono text-sm font-medium tracking-widest text-marigold uppercase">
              What you can report
            </p>
            <h2
              id="categories-heading"
              className="text-3xl font-semibold tracking-tight md:text-4xl"
            >
              The problems you walk past <em className="font-medium italic">every day</em>
            </h2>
          </div>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <li
                  key={category}
                  className="flex flex-col items-start gap-3 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15"
                >
                  <Icon className="size-7 text-marigold" aria-hidden />
                  <span className="text-base font-medium">{CATEGORY_LABELS[category]}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cases-heading" className={SECTION}>
        <div className="flex flex-col gap-3">
          <p className={EYEBROW}>Cases</p>
          <h2 id="cases-heading" className={SECTION_TITLE}>
            From scattered complaints to{" "}
            <em className="font-medium text-brand-700 italic">action</em>
          </h2>
          <p className="max-w-2xl text-base text-zinc-700">
            Three stories from {SITE_NAME}&apos;s demo data. The places and reports are synthetic,
            but each one shows what the platform really does with them.
          </p>
        </div>
        <ul className="grid gap-6 lg:grid-cols-3">
          {CASES.map((story) => (
            <li
              key={story.title}
              className="flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm"
            >
              <story.scene className="h-auto w-full" />
              <article className="flex flex-1 flex-col gap-3 p-6">
                <p className="flex flex-wrap items-center gap-2 font-mono text-sm text-zinc-700">
                  <span className="rounded-full bg-marigold-100 px-3 py-1 font-medium text-terracotta">
                    {story.tag}
                  </span>
                  {story.place}
                </p>
                <h3 className="text-2xl font-semibold text-zinc-950">{story.title}</h3>
                <p className="text-base text-zinc-700">{story.text}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="border-t border-zinc-200 bg-white">
        <div className={SECTION}>
          <div className="flex flex-col gap-3">
            <p className={EYEBROW}>How it works</p>
            <h2 id="how-heading" className={SECTION_TITLE}>
              Four steps from street to solution
            </h2>
          </div>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3 border-t-2 border-brand-700 pt-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-5xl font-light text-brand-700 italic">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <step.icon className="size-7 text-terracotta" aria-hidden />
                </div>
                <h3 className="text-xl font-semibold text-zinc-950">{step.title}</h3>
                <p className="text-base text-zinc-700">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="closing-heading" className="px-4 py-14 md:py-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 rounded-[2rem] bg-brand-900 px-6 py-12 text-white md:flex-row md:items-center md:justify-between md:px-12">
          <div className="flex flex-col gap-3">
            <h2 id="closing-heading" className="text-3xl font-semibold tracking-tight md:text-4xl">
              Seen something that needs fixing?
            </h2>
            <p className="max-w-xl text-lg text-brand-100">
              Tell the people who can fix it. It takes about a minute, and you can follow it to the
              end.
            </p>
          </div>
          <Link
            href="/report"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-marigold px-6 py-3 text-base font-semibold text-brand-900 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
          >
            Report a problem
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
