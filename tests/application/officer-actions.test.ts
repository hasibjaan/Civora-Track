import { describe, expect, it } from "vitest";

import {
  assignReportTeam,
  changeReportStatus,
  mergeReportInto,
  type OfficerStore,
} from "@/application/officer-actions";
import type { ChangeResult } from "@/domain/changes";
import type { ActionContext } from "@/domain/officer-actions";
import type { Report } from "@/domain/types";
import { makeReport } from "../support/fixtures";

const CONTEXT: ActionContext = { actor: "officer", at: new Date("2026-10-30T10:00:00.000Z") };

/** An in-memory store that behaves like the repository: a change is saved only when allowed. */
function memoryStore(reports: Report[]) {
  const byId = new Map(reports.map((report) => [report.id, report]));
  const store: OfficerStore = {
    async get(id) {
      return byId.get(id);
    },
    async modify(id, change): Promise<ChangeResult | undefined> {
      const current = byId.get(id);
      if (!current) return undefined;
      const result = change(current);
      if (result.ok) byId.set(id, result.report);
      return result;
    },
  };
  return { store, stored: (id: string) => byId.get(id) };
}

describe("officer use cases", () => {
  it("saves a team assignment", async () => {
    const { store, stored } = memoryStore([makeReport({ id: "RPT-0000A001" })]);

    const result = await assignReportTeam(store, "RPT-0000A001", "roads", CONTEXT);

    expect(result.ok).toBe(true);
    expect(stored("RPT-0000A001")?.assignedTeam).toBe("roads");
  });

  it("does not save a refused change", async () => {
    const original = makeReport({ id: "RPT-0000A002", status: "resolved" });
    const { store, stored } = memoryStore([original]);

    const result = await changeReportStatus(store, "RPT-0000A002", "triaged", undefined, CONTEXT);

    expect(result.ok).toBe(false);
    expect(stored("RPT-0000A002")).toEqual(original);
  });

  it("reports a report that does not exist", async () => {
    const { store } = memoryStore([]);

    const result = await assignReportTeam(store, "RPT-0000A003", "roads", CONTEXT);

    expect(result).toEqual({ ok: false, error: "This report could not be found." });
  });

  it("saves a status change with its note", async () => {
    const { store, stored } = memoryStore([makeReport({ id: "RPT-0000A004" })]);

    await changeReportStatus(
      store,
      "RPT-0000A004",
      "rejected",
      "Duplicate of a council notice.",
      CONTEXT,
    );

    expect(stored("RPT-0000A004")?.status).toBe("rejected");
    expect(stored("RPT-0000A004")?.history.at(-1)).toMatchObject({
      note: "Duplicate of a council notice.",
    });
  });

  it("merges a duplicate into an open primary report", async () => {
    const { store, stored } = memoryStore([
      makeReport({ id: "RPT-0000B001" }),
      makeReport({ id: "RPT-0000B002" }),
    ]);

    const result = await mergeReportInto(store, "RPT-0000B002", "RPT-0000B001", CONTEXT);

    expect(result.ok).toBe(true);
    expect(stored("RPT-0000B002")?.mergedInto).toBe("RPT-0000B001");
  });

  it("refuses a merge when the primary report does not exist, and changes nothing", async () => {
    const duplicate = makeReport({ id: "RPT-0000B003" });
    const { store, stored } = memoryStore([duplicate]);

    const result = await mergeReportInto(store, "RPT-0000B003", "RPT-0000B999", CONTEXT);

    expect(result.ok).toBe(false);
    expect(stored("RPT-0000B003")).toEqual(duplicate);
  });
});
