import { describe, expect, it } from "vitest";
import { incompletePersona, personaA, personaB } from "@/lib/demo/personas";
import { known, unknown } from "@/lib/domain/profile";
import { confirmHistoryUpdates } from "@/lib/profile/history-updates";
import { classifyMonitoringResult } from "@/lib/rules/classify";
import { evaluatePredicateOutcomes, evaluateRule } from "@/lib/rules/evaluate";
import {
  fixedAdmissionScenario,
  niwEvidenceScenario,
  wageSelectionScenario,
} from "@/lib/rules/fixtures/monitoring";
import { studentPolicyRule } from "@/lib/rules/fixtures/student-policy";

describe("evaluateRule", () => {
  it("marks the STEM OPT persona affected", () => {
    expect(evaluateRule(studentPolicyRule, personaA).decision).toBe("affected");
  });

  it("marks H-1B conclusively not affected", () => {
    const result = evaluateRule(studentPolicyRule, personaB);
    expect(result.decision).toBe("not_affected");
    expect(result.decisionReasons[0]).toContain("Conclusive exclusion");
  });

  it("requires review when an applicability fact is unknown", () => {
    const result = evaluateRule(studentPolicyRule, incompletePersona);
    expect(result.decision).toBe("needs_review");
    expect(result.missingFacts.map((fact) => fact.field)).toContain(
      "employerEVerify",
    );
  });

  it("lets conclusive exclusion take precedence over an unknown fact", () => {
    expect(
      evaluatePredicateOutcomes([
        { role: "exclusion", outcome: true },
        { role: "applicability", outcome: "unknown" },
      ]),
    ).toBe("not_affected");
  });

  it("does not turn missing information into not affected", () => {
    expect(
      evaluatePredicateOutcomes([
        { role: "exclusion", outcome: false },
        { role: "applicability", outcome: "unknown" },
        { role: "applicability", outcome: false },
      ]),
    ).toBe("needs_review");
  });

  it("requires review when rule status is unclear", () => {
    expect(
      evaluatePredicateOutcomes(
        [{ role: "applicability", outcome: true }],
        "proposed",
      ),
    ).toBe("needs_review");
  });

  it("supports an H-1B profile with overlapping I-140 and I-485 cases", () => {
    expect(personaB.pendingCases).toEqual([
      { type: "I140", status: "APPROVED" },
      { type: "I485", status: "PENDING" },
    ]);
    expect(evaluateRule(studentPolicyRule, personaB).decision).toBe(
      "not_affected",
    );
  });

  it("excludes an adjustment-only authorized-stay profile", () => {
    const profile = {
      ...personaB,
      currentBasis: known("PENDING_ADJUSTMENT_ONLY" as const),
      currentStatus: unknown("No underlying nonimmigrant status"),
    };
    expect(evaluateRule(studentPolicyRule, profile).decision).toBe(
      "not_affected",
    );
  });

  it("excludes a worker grace-period profile", () => {
    const profile = {
      ...personaB,
      currentBasis: known("WORKER_GRACE_PERIOD" as const),
      currentStatus: unknown("Employment ended"),
      priorStatus: known("H1B" as const),
      employmentEndDate: known("2026-08-01"),
    };
    expect(evaluateRule(studentPolicyRule, profile).decision).toBe(
      "not_affected",
    );
  });

  it("excludes an outside-U.S. target pathway", () => {
    const profile = {
      ...personaB,
      physicalLocation: known("OUTSIDE_US" as const),
      currentBasis: unknown("Outside the United States"),
      currentStatus: unknown("No current U.S. status"),
      targetClassification: known("O1" as const),
    };
    expect(evaluateRule(studentPolicyRule, profile).decision).toBe(
      "not_affected",
    );
  });

  it("requires review when the current U.S. basis is unknown", () => {
    const profile = {
      ...personaA,
      currentBasis: unknown("User is not sure"),
      currentStatus: unknown("User is not sure"),
    };
    expect(evaluateRule(studentPolicyRule, profile).decision).toBe(
      "needs_review",
    );
  });

  it("does not let confirmed narrative history alter a rule decision", () => {
    const withHistory = confirmHistoryUpdates(
      personaA,
      "statusHistory",
      [],
      [
        {
          type: "status",
          title: "User described a prior status",
          details: "Confirmed for the timeline only.",
          date: null,
          datePrecision: "unknown",
          confidence: "unknown",
        },
      ],
      () => "history-only",
    );
    const before = evaluateRule(studentPolicyRule, personaA);
    const after = evaluateRule(studentPolicyRule, withHistory);
    expect(after.decision).toBe(before.decision);
    expect(after.matchedFacts).toEqual(before.matchedFacts);
    expect(after.missingFacts).toEqual(before.missingFacts);
    expect(after.decisionReasons).toEqual(before.decisionReasons);
  });

  it("classifies personalized monitoring as deadline, reprioritization, or noise", () => {
    const mayaDeadline = evaluateRule(fixedAdmissionScenario, personaA);
    const danielNoise = evaluateRule(fixedAdmissionScenario, personaB);
    const danielReprioritization = evaluateRule(niwEvidenceScenario, personaB);
    const mayaNoise = evaluateRule(wageSelectionScenario, personaA);

    expect(
      classifyMonitoringResult(fixedAdmissionScenario, mayaDeadline),
    ).toBe("deadline");
    expect(
      classifyMonitoringResult(fixedAdmissionScenario, danielNoise),
    ).toBe("noise");
    expect(
      classifyMonitoringResult(
        niwEvidenceScenario,
        danielReprioritization,
      ),
    ).toBe("reprioritization");
    expect(classifyMonitoringResult(wageSelectionScenario, mayaNoise)).toBe(
      "noise",
    );
  });
});
