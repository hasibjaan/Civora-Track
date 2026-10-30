/** Placeholder while a report loads, including its action brief. */
export default function Loading() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
      <p role="status" className="text-base text-zinc-700 dark:text-zinc-300">
        Loading the report...
      </p>
      <div aria-hidden className="flex animate-pulse flex-col gap-4">
        <div className="h-8 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-40 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </main>
  );
}
