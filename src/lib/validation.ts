export interface ValidationIssue {
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

/**
 * Converts zod issues into one message per field, keyed by dotted path
 * (for example "location.lat"). The first message for a field wins.
 */
export function toFieldErrors(issues: ReadonlyArray<ValidationIssue>): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    errors[key] ??= issue.message;
  }

  return errors;
}
