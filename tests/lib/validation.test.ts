import { describe, expect, it } from "vitest";

import { NewReportSchema } from "@/domain/schemas";
import { toFieldErrors } from "@/lib/validation";

describe("toFieldErrors", () => {
  it("keys nested issues by dotted path", () => {
    const result = NewReportSchema.safeParse({
      description: "Short",
      category: "drainage",
      location: { lat: null, lng: 77.59, address: "" },
    });
    if (result.success) throw new Error("expected validation to fail");

    const errors = toFieldErrors(result.error.issues);

    expect(errors["description"]).toBe("Describe the problem in at least 10 characters.");
    expect(errors["location.lat"]).toBe("Add your location.");
    expect(errors["location.address"]).toBe("Add a nearby landmark or street.");
  });

  it("keeps only the first message for each field", () => {
    const errors = toFieldErrors([
      { path: ["description"], message: "first" },
      { path: ["description"], message: "second" },
    ]);

    expect(errors).toEqual({ description: "first" });
  });
});
