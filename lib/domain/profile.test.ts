import { describe, expect, it } from "vitest";
import { personaA } from "@/lib/demo/personas";
import { historyEventSchema, profileSchema } from "@/lib/domain/profile";
import { getHistoryCompletion } from "@/lib/profile/completeness";

describe("profileSchema", () => {
  it("accepts the versioned synthetic profile", () => {
    expect(profileSchema.parse(personaA).profileVersion).toBe(2);
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

  it("models nationality and family facts separately", () => {
    expect(personaA.citizenshipCountries).toMatchObject({
      state: "known",
      value: ["China"],
    });
    expect(personaA.maritalStatus).toMatchObject({
      state: "known",
      value: "SINGLE",
    });
    expect(personaA.dependentCount).toMatchObject({
      state: "known",
      value: 0,
    });
  });

  it("validates confirmable structured history events", () => {
    const event = historyEventSchema.parse({
      id: "history-1",
      type: "entry_exit",
      title: "Entered the United States",
      details: "Entry described by the user.",
      date: null,
      datePrecision: "unknown",
      confidence: "approximate",
      source: "ai",
      reviewState: "proposed",
    });
    expect(event.reviewState).toBe("proposed");
  });

  it("computes completion from reviewed areas instead of known answers", () => {
    const completion = getHistoryCompletion(personaA);
    expect(completion.percentage).toBe(67);
    expect(completion.nextArea?.id).toBe("travelHistory");
  });

  it("links safe document metadata without storing file contents", () => {
    const parsed = profileSchema.parse({
      ...personaA,
      documents: [
        {
          id: "document-i94",
          name: "i94.pdf",
          mimeType: "application/pdf",
          size: 2048,
          category: "travelHistory",
          uploadedAt: "2026-08-07T20:00:00.000Z",
          analysisStatus: "analyzed",
          summary: "I-94 travel record",
        },
      ],
    });
    expect(parsed.documents[0]).not.toHaveProperty("blob");
    expect(parsed.documents[0].category).toBe("travelHistory");
  });
});
