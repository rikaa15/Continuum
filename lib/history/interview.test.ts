import { describe, expect, it } from "vitest";
import {
  historyInterviewRequestSchema,
  historyInterviewResponseSchema,
  validateFactValue,
} from "@/lib/history/interview";
import { personaA } from "@/lib/demo/personas";
import { confirmHistoryUpdates } from "@/lib/profile/history-updates";

describe("history interview schemas", () => {
  it("accepts only minimal context with a focused user message", () => {
    const input = historyInterviewRequestSchema.parse({
      area: "statusHistory",
      message: "I changed from F-1 to H-1B in 2025.",
      context: {
        currentStatus: "H1B",
        currentBasis: "NONIMMIGRANT_STATUS",
        citizenshipCountries: ["Canada"],
      },
    });
    expect(input.area).toBe("statusHistory");
    expect(input.conversation).toEqual([]);
    expect(input).not.toHaveProperty("profile");
  });

  it("validates proposed facts again before confirmation", () => {
    expect(
      validateFactValue({
        field: "dependentCount",
        value: 2,
        label: "Two dependents",
      }),
    ).toBe(2);
    expect(() =>
      validateFactValue({
        field: "dateOfBirth",
        value: "sometime in 1990",
        label: "Date of birth",
      }),
    ).toThrow();
    expect(() =>
      validateFactValue({
        field: "maritalStatus",
        value: "not married",
        label: "Marital status",
      }),
    ).toThrow();
  });

  it("rejects unstructured or oversized extraction output", () => {
    const parsed = historyInterviewResponseSchema.safeParse({
      assistantReply: "Please clarify the approval date.",
      needsFollowUp: true,
      followUpQuestion: "What date was the petition approved?",
      factProposals: [],
      eventProposals: [
        {
          type: "legal_conclusion",
          title: "Eligible for a benefit",
          details: "",
          date: null,
          datePrecision: "unknown",
          confidence: "unknown",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("stores only proposals explicitly passed for confirmation", () => {
    const unselected = confirmHistoryUpdates(
      personaA,
      "family",
      [],
      [],
      () => "unused",
    );
    expect(unselected.dependentCount).toEqual(personaA.dependentCount);
    expect(unselected.historyEvents).toHaveLength(
      personaA.historyEvents.length,
    );

    const selected = confirmHistoryUpdates(
      personaA,
      "family",
      [
        {
          field: "dependentCount",
          value: 2,
          label: "Two dependents",
        },
      ],
      [
        {
          type: "family",
          title: "Married",
          details: "User reported getting married.",
          date: null,
          datePrecision: "unknown",
          confidence: "unknown",
        },
      ],
      () => "confirmed-event",
    );
    expect(selected.dependentCount).toMatchObject({
      state: "known",
      value: 2,
      source: "user",
    });
    expect(selected.historyEvents.at(-1)).toMatchObject({
      id: "confirmed-event",
      source: "ai",
      reviewState: "confirmed",
    });
  });

  it("replaces an edited event only after a replacement is confirmed", () => {
    const originalId = personaA.historyEvents[0].id;
    const unchanged = confirmHistoryUpdates(
      personaA,
      "statusHistory",
      [],
      [],
      () => "unused",
      originalId,
    );
    expect(
      unchanged.historyEvents.some((event) => event.id === originalId),
    ).toBe(true);

    const updated = confirmHistoryUpdates(
      personaA,
      "statusHistory",
      [],
      [
        {
          type: "education",
          title: "Completed an updated degree program",
          details: "Corrected through the guided interview.",
          date: "2025-05-18",
          datePrecision: "exact",
          confidence: "confirmed",
        },
      ],
      () => "replacement-event",
      originalId,
    );
    expect(updated.historyEvents.some((event) => event.id === originalId)).toBe(
      false,
    );
    expect(updated.historyEvents).toContainEqual(
      expect.objectContaining({ id: "replacement-event" }),
    );
  });
});
