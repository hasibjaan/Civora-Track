import "server-only";

import type { Analysis, Report } from "@/domain/types";

import { analyzeReport, type AnalysisInput, type TextCompleter } from "./analyze";
import { createBriefService } from "./brief";
import { createAiCompleter } from "./llm";

const complete: TextCompleter | null = createAiCompleter(process.env.ANTHROPIC_API_KEY);
const briefs = createBriefService({ complete });

/** Analyzes a submission with AI when configured, otherwise with the rule-based fallback. */
export function analyzeSubmission(
  input: AnalysisInput,
  existing: readonly Report[],
  now: Date,
): Promise<Analysis> {
  return analyzeReport(input, existing, now, complete);
}

/** An action brief for a report or a hotspot. Always available, whether or not AI is configured. */
export const briefFor = briefs.briefFor;
