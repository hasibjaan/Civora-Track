export interface ErrorSummaryItem {
  message: string;
  /** The id of the field the message belongs to, if it maps to one. */
  fieldId?: string;
}

interface ErrorSummaryProps {
  items: ErrorSummaryItem[];
}

/**
 * Lists every problem with the form at the top, with links to each field. Screen-reader
 * users hear the count and can jump straight to the field that needs fixing.
 */
export function ErrorSummary({ items }: ErrorSummaryProps) {
  if (items.length === 0) return null;

  const count = items.length === 1 ? "one problem" : `${items.length} problems`;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base text-red-900"
    >
      <p className="font-semibold">Please fix {count} before submitting:</p>
      <ul className="mt-2 list-disc pl-5">
        {items.map((item) => (
          <li key={item.message}>
            {item.fieldId ? (
              <a href={`#${item.fieldId}`} className="underline underline-offset-2">
                {item.message}
              </a>
            ) : (
              item.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
