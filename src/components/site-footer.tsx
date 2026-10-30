import { SITE_NAME } from "@/components/brand";

/** Every page says plainly what is a prototype, so no one mistakes the demo for a live service. */
export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <p className="mx-auto w-full max-w-6xl px-4 py-5 text-sm text-zinc-700">
        {SITE_NAME} is a hackathon prototype. The response teams and the demo reports are mocked,
        and reports do not reach a real council.
      </p>
    </footer>
  );
}
