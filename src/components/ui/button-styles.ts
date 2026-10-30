/** Shared class names, so buttons look and behave the same on every page. */
const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand-700/40 focus:ring-offset-2 disabled:opacity-60";

export const primaryButton = `${BUTTON_BASE} bg-brand-700 text-white hover:bg-brand-800`;

export const secondaryButton = `${BUTTON_BASE} border border-brand-700 bg-white text-brand-800 hover:bg-brand-50`;
