import { CATEGORY_LABELS } from "./categories";
import { NEARBY_RADIUS_METERS } from "./open-reports";
import type { Category, PriorityFactor, PriorityLevel } from "./types";

/** Officer-facing names for each priority level. */
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Levels from least to most urgent. A larger rank means more urgent. */
const LEVEL_ORDER: readonly PriorityLevel[] = ["low", "medium", "high", "urgent"];

export function levelRank(level: PriorityLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

/** The most urgent of the given levels. Returns "low" for an empty list. */
export function mostUrgentLevel(levels: readonly PriorityLevel[]): PriorityLevel {
  return levels.reduce<PriorityLevel>(
    (top, level) => (levelRank(level) > levelRank(top) ? level : top),
    "low",
  );
}

/** Base impact of each category. Waterlogging and drains affect the most people. */
const CATEGORY_SEVERITY: Record<Category, number> = {
  waterlogging: 20,
  drainage: 20,
  streetlight: 15,
  road_damage: 15,
  waste: 10,
  other: 5,
};

const DANGER_PATTERN =
  /\b(live wire|exposed wire|electrocut\w*|sinkhole|caved in|manhole|flood water|collaps\w*|fire|injur\w*)\b/i;
const VULNERABLE_PATTERN = /\b(school|hospital|children|child|elderly|bus stop|crossing)\b/i;
const URGENCY_PATTERN = /\b(urgent|urgently|emergency|dangerous|immediately)\b/i;

const DANGER_POINTS = 40;
const VULNERABLE_POINTS = 10;
const URGENCY_POINTS = 10;
const MAX_AGE_POINTS = 10;
const POINTS_PER_DUPLICATE = 3;
const MAX_DUPLICATE_POINTS = 10;
const POINTS_PER_NEARBY_REPORT = 4;
const MAX_NEARBY_POINTS = 16;

const MAX_SCORE = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Minimum score for each level, highest first. Anything below the last entry is "low". */
const LEVEL_THRESHOLDS: ReadonlyArray<readonly [number, PriorityLevel]> = [
  [55, "urgent"],
  [35, "high"],
  [20, "medium"],
];

export interface PriorityInput {
  description: string;
  category: Category;
  reportedAt: Date;
  now: Date;
  duplicateCount: number;
  nearbyOpenCount: number;
}

export interface PriorityResult {
  score: number;
  level: PriorityLevel;
  factors: PriorityFactor[];
}

/**
 * Scores how urgently a report needs attention. Every point comes from a named factor,
 * so an officer can see exactly why a report ranks where it does.
 * The score is deterministic: the same inputs always give the same result.
 */
export function scorePriority(input: PriorityInput): PriorityResult {
  const factors = [
    categoryFactor(input.category),
    dangerFactor(input.description),
    vulnerableFactor(input.description),
    urgencyFactor(input.description),
    ageFactor(input.reportedAt, input.now),
    duplicatesFactor(input.duplicateCount),
    nearbyFactor(input.nearbyOpenCount),
  ].filter(isFactor);

  const score = Math.min(
    MAX_SCORE,
    factors.reduce((total, factor) => total + factor.points, 0),
  );

  return { score, level: levelFor(score), factors };
}

function levelFor(score: number): PriorityLevel {
  return LEVEL_THRESHOLDS.find(([threshold]) => score >= threshold)?.[1] ?? "low";
}

function categoryFactor(category: Category): PriorityFactor {
  return {
    factor: "Category impact",
    points: CATEGORY_SEVERITY[category],
    reason: `${CATEGORY_LABELS[category]} problems affect a wide area.`,
  };
}

/** The name of the factor that marks an immediate danger. Other code checks for it by name. */
export const DANGER_FACTOR = "Immediate danger";

function dangerFactor(description: string): PriorityFactor | null {
  const match = DANGER_PATTERN.exec(description);
  if (!match) return null;
  return {
    factor: DANGER_FACTOR,
    points: DANGER_POINTS,
    reason: `The report mentions "${match[0]}", which can cause injury.`,
  };
}

function vulnerableFactor(description: string): PriorityFactor | null {
  const match = VULNERABLE_PATTERN.exec(description);
  if (!match) return null;
  return {
    factor: "People at risk nearby",
    points: VULNERABLE_POINTS,
    reason: `The report mentions "${match[0]}", where people at risk gather.`,
  };
}

function urgencyFactor(description: string): PriorityFactor | null {
  const match = URGENCY_PATTERN.exec(description);
  if (!match) return null;
  return {
    factor: "Urgency stated",
    points: URGENCY_POINTS,
    reason: `The reporter wrote "${match[0]}".`,
  };
}

function ageFactor(reportedAt: Date, now: Date): PriorityFactor | null {
  const days = Math.floor((now.getTime() - reportedAt.getTime()) / MS_PER_DAY);
  if (days < 1) return null;
  return {
    factor: "Time open",
    points: Math.min(MAX_AGE_POINTS, days),
    reason: `Open for ${days} ${days === 1 ? "day" : "days"}, so it is getting older.`,
  };
}

function duplicatesFactor(count: number): PriorityFactor | null {
  if (count === 0) return null;
  return {
    factor: "Repeated reports",
    points: Math.min(MAX_DUPLICATE_POINTS, count * POINTS_PER_DUPLICATE),
    reason: `${count} other ${count === 1 ? "report" : "reports"} describe the same problem.`,
  };
}

function nearbyFactor(count: number): PriorityFactor | null {
  if (count === 0) return null;
  return {
    factor: "Other open problems nearby",
    points: Math.min(MAX_NEARBY_POINTS, count * POINTS_PER_NEARBY_REPORT),
    reason: `${count} other open ${count === 1 ? "report is" : "reports are"} within ${NEARBY_RADIUS_METERS} m.`,
  };
}

function isFactor(factor: PriorityFactor | null): factor is PriorityFactor {
  return factor !== null;
}
