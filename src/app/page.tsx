import Link from "next/link";

export default function Home() {
  return (
    <main
      id="main"
      className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-24 text-center font-sans dark:bg-black"
    >
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        See a problem in your area?
      </h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Report a pothole, blocked drain, broken streetlight or garbage pile. You can follow it from
        submission to resolution.
      </p>
      <Link
        href="/report"
        className="flex min-h-12 items-center justify-center rounded-lg bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Report a problem
      </Link>
    </main>
  );
}
