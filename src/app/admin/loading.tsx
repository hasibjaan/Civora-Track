/** Placeholder while the dashboard loads. Model-written briefs can take a second or two. */
export default function Loading() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8">
      <p role="status" className="text-base text-zinc-700 dark:text-zinc-300">
        Loading the dashboard...
      </p>
      <div aria-hidden className="grid animate-pulse gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      <div aria-hidden className="h-80 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </main>
  );
}
