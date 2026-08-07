import { describe, expect, it } from "vitest";
import { personaA } from "@/lib/demo/personas";
import { profileSchema } from "@/lib/domain/profile";

describe("profileSchema", () => {
  it("accepts the versioned synthetic profile", () => {
    expect(profileSchema.parse(personaA).profileVersion).toBe(1);
  });

  it("rejects an unversioned profile", () => {
    const invalid = { ...personaA, profileVersion: 0 };
    expect(profileSchema.safeParse(invalid).success).toBe(false);
  });

  it("preserves explicit unknown values", () => {
    const profile = {
      ...personaA,
      employerEVerify: { state: "unknown", reason: "Ask me later" },
    };
    const parsed = profileSchema.parse(profile);
    expect(parsed.employerEVerify.state).toBe("unknown");
  });

  it("models STEM OPT as an F-1 stage rather than a status", () => {
    expect(personaA.currentStatus).toMatchObject({
      state: "known",
      value: "F1",
    });
    expect(personaA.f1Stage).toMatchObject({
      state: "known",
      value: "STEM_OPT",
    });
  });

  it("keeps physical location, current basis, and pending cases separate", () => {
    expect(personaA.physicalLocation).toMatchObject({
      state: "known",
      value: "IN_US",
    });
    expect(personaA.currentBasis).toMatchObject({
      state: "known",
      value: "NONIMMIGRANT_STATUS",
    });
    expect(personaA.pendingCases).toEqual([]);
  });
});
