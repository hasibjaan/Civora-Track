// Common words that say nothing about what the problem is.
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "all",
  "also",
  "and",
  "are",
  "been",
  "before",
  "but",
  "day",
  "days",
  "every",
  "for",
  "from",
  "has",
  "have",
  "its",
  "just",
  "more",
  "near",
  "not",
  "now",
  "onto",
  "our",
  "please",
  "since",
  "still",
  "that",
  "the",
  "them",
  "there",
  "they",
  "this",
  "too",
  "very",
  "was",
  "week",
  "were",
  "when",
  "with",
]);

/**
 * The distinctive words in a description, lower-cased and lightly stemmed.
 * Words under three letters and stop words are dropped.
 */
export function contentWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .map(stem);

  return new Set(words);
}

/** Jaccard similarity: shared words divided by all distinct words. Ranges from 0 to 1. */
export function jaccardSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  for (const word of a) {
    if (b.has(word)) shared += 1;
  }
  return shared / (a.size + b.size - shared);
}

/** Drops a trailing plural "s" so "drains" and "drain" count as the same word. */
function stem(word: string): string {
  return word.length >= 4 && word.endsWith("s") ? word.slice(0, -1) : word;
}
