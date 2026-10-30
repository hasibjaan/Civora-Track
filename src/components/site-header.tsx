import { MapPinned } from "lucide-react";
import Link from "next/link";

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-white underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

/** The bar at the top of every page, with the name and the three ways in. */
export function SiteHeader() {
  return (
    <header className="bg-brand-800 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <MapPinned className="size-6" aria-hidden />
          CivicTrack
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link href="/report" className={NAV_LINK}>
                Report a problem
              </Link>
            </li>
            <li>
              <Link href="/track" className={NAV_LINK}>
                Track a report
              </Link>
            </li>
            <li>
              {/* No prefetch: a background request to the officer area would trigger the
                  browser's sign-in prompt before anyone clicked. */}
              <Link href="/admin" prefetch={false} className={NAV_LINK}>
                Officers
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
