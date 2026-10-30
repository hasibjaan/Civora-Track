/**
 * Finds the first JSON object in a model's reply and parses it. Models sometimes add a
 * sentence before or after the object, so the search takes the outermost braces.
 * Returns null when there is no valid object. The result is untyped: validate it with zod.
 */
export function extractJsonObject(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end < start) return null;

  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
}
