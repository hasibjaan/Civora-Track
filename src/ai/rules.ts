import type { Category } from "@/domain/types";

/**
 * Keyword patterns used when AI is unavailable. Each pattern is global so every match
 * can be counted. The category with the most matches wins.
 */
const CATEGORY_KEYWORDS: ReadonlyArray<readonly [Exclude<Category, "other">, RegExp]> = [
  ["waterlogging", /\b(water stands|waterlog\w*|flood\w*|puddles?|pooling|knee-deep)\b/gi],
  ["drainage", /\b(drains?|sewers?|manholes?|clogged|gutters?)\b/gi],
  [
    "streetlight",
    /\b(streetlights?|street lights?|lamp posts?|flicker\w*|live wires?|lights? (?:is |are )?(?:out|off))\b/gi,
  ],
  ["road_damage", /\b(potholes?|roads?|cracks?|cracked|sinkholes?|speed breakers?|footpaths?)\b/gi],
  ["waste", /\b(garbage|waste|bins?|trash|litter|dump\w*|debris|sweepers?)\b/gi],
];

const SENTENCE_END = /[.!?]\s/;
const MAX_SUMMARY_LENGTH = 140;

/** Picks the category whose keywords appear most often. Returns "other" when nothing matches. */
export function classifyByKeywords(description: string): Category {
  let best: Category = "other";
  let bestCount = 0;

  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    const count = description.match(pattern)?.length ?? 0;
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }

  return best;
}

/** Uses the first sentence of the description, shortened to a readable length. */
export function summarizeByRules(description: string): string {
  const trimmed = description.trim();
  const sentenceEnd = trimmed.search(SENTENCE_END);
  const firstSentence = sentenceEnd === -1 ? trimmed : trimmed.slice(0, sentenceEnd + 1);

  if (firstSentence.length <= MAX_SUMMARY_LENGTH) return firstSentence;
  return `${firstSentence.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…`;
}
