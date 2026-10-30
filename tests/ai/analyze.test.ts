import { describe, expect, it } from "vitest";

import { analyzeReport, type AnalysisInput, type TextCompleter } from "@/ai/analyze";
import { makeReport } from "../support/fixtures";

const NOW = new Date("2026-10-30T10:00:00.000Z");

const INPUT: AnalysisInput = {
  description: "Exposed live wire hanging from the streetlight beside the school gate.",
  category: "streetlight",
  location: { lat: 12.9735, lng: 77.588 },
  reportedAt: NOW,
};

function completerReturning(reply: string | null): TextCompleter {
  return async () => reply;
}

describe("analyzeReport", () => {
  it("uses the model's category and summary when it replies with valid JSON", async () => {
    const complete = completerReturning(
      '{"category": "streetlight", "summary": "Live wire exposed near a school."}',
    );

    const analysis = await analyzeReport(INPUT, [], NOW, complete);

    expect(analysis.method).toBe("llm");
    expect(analysis.summary).toBe("Live wire exposed near a school.");
    expect(analysis.suggestedCategory).toBe("streetlight");
  });

  it("falls back to rules when the model is unavailable", async () => {
    const analysis = await analyzeReport(INPUT, [], NOW, completerReturning(null));

    expect(analysis.method).toBe("rules");
    expect(analysis.summary).toBe(
      "Exposed live wire hanging from the streetlight beside the school gate.",
    );
  });

  it("falls back to rules when the model replies with something invalid", async () => {
    const analysis = await analyzeReport(
      INPUT,
      [],
      NOW,
      completerReturning('{"category": "made-up", "summary": "x"}'),
    );

    expect(analysis.method).toBe("rules");
  });

  it("uses rules when no model is configured", async () => {
    const analysis = await analyzeReport(INPUT, [], NOW, null);

    expect(analysis.method).toBe("rules");
  });

  it("never lets the model change the priority, which comes from named factors", async () => {
    // The model wrongly says this is "other", but the danger is still in the text.
    const complete = completerReturning('{"category": "other", "summary": "Wire problem."}');

    const withModel = await analyzeReport(INPUT, [], NOW, complete);
    const withoutModel = await analyzeReport(INPUT, [], NOW, null);

    expect(withModel.priority).toEqual(withoutModel.priority);
    expect(withModel.priority.level).toBe("urgent");
    expect(withModel.priority.factors.map((factor) => factor.factor)).toContain("Immediate danger");
  });

  it("links likely duplicates and counts nearby open problems", async () => {
    const existing = [
      makeReport({
        id: "RPT-0000A001",
        category: "streetlight",
        description: "Streetlight beside the school gate has a live wire exposed.",
        location: { lat: 12.97351, lng: 77.58801 },
        reportedAt: NOW.toISOString(),
      }),
      makeReport({
        id: "RPT-0000A002",
        category: "waste",
        description: "Garbage pile near the same school gate.",
        location: { lat: 12.97352, lng: 77.58802 },
        reportedAt: NOW.toISOString(),
      }),
    ];

    const analysis = await analyzeReport(INPUT, existing, NOW, null);

    expect(analysis.duplicateOf).toEqual(["RPT-0000A001"]);
    const nearby = analysis.priority.factors.find(
      (factor) => factor.factor === "Other open problems nearby",
    );
    // Two open reports are nearby, but one of them is the duplicate. Each report is counted once.
    expect(nearby?.points).toBe(4);
  });
});
