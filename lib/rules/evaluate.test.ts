import { describe, expect, it } from "vitest";
import { incompletePersona, personaA, personaB } from "@/lib/demo/personas";
import { evaluatePredicateOutcomes, evaluateRule } from "@/lib/rules/evaluate";
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
});
