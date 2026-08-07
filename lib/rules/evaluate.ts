import type { ImmigrationProfile } from "@/lib/domain/profile";
import type {
  DecisionResult,
  PredicateOutcome,
  RuleFixture,
} from "@/lib/domain/rules";

export function evaluateRule(
  rule: RuleFixture,
  profile: ImmigrationProfile,
): DecisionResult {
  const evaluatedAt = new Date().toISOString();
  const outcomes = rule.predicates.map((predicate) => ({
    predicate,
    outcome: predicate.evaluate(profile),
  }));

  const conclusiveExclusion = outcomes.find(
    ({ predicate, outcome }) =>
      predicate.role === "exclusion" && outcome === true,
  );
  const unknowns = outcomes.filter(({ outcome }) => outcome === "unknown");
  const failedApplicability = outcomes.find(
    ({ predicate, outcome }) =>
      predicate.role === "applicability" && outcome === false,
  );
  const ruleStatusUnclear = !["effective", "final"].includes(rule.stage);

  let decision: DecisionResult["decision"];
  const decisionReasons: string[] = [];

  if (conclusiveExclusion) {
    decision = "not_affected";
    decisionReasons.push(
      `Conclusive exclusion: ${conclusiveExclusion.predicate.label}.`,
    );
  } else if (ruleStatusUnclear) {
    decision = "needs_review";
    decisionReasons.push(`Rule stage is ${rule.stage} and requires review.`);
  } else if (unknowns.length > 0) {
    decision = "needs_review";
    decisionReasons.push(
      `${unknowns.length} required ${unknowns.length === 1 ? "fact is" : "facts are"} unknown.`,
    );
  } else if (failedApplicability) {
    decision = "not_affected";
    decisionReasons.push(
      `Known fact does not meet: ${failedApplicability.predicate.label}.`,
    );
  } else {
    decision = "affected";
    decisionReasons.push("All required applicability facts are confirmed.");
  }

  const matchedFacts = outcomes
    .filter(
      ({ predicate, outcome }) =>
        (predicate.role === "applicability" && outcome === true) ||
        (predicate.role === "exclusion" && outcome === true),
    )
    .map(({ predicate }) => ({
      field: predicate.field,
      statement: predicate.describeMatch(profile),
    }));

  const missingFacts = unknowns.map(({ predicate }) => ({
    field: predicate.field,
    reason: `${predicate.label} is not known.`,
  }));

  return {
    ruleId: rule.ruleId,
    ruleVersion: rule.version,
    profileVersion: profile.profileVersion,
    evaluatedAt,
    decision,
    matchedFacts,
    missingFacts,
    decisionReasons,
    recommendedAction:
      decision === "not_affected"
        ? "No action is suggested for this alert. Keep your profile current so future checks use accurate facts."
        : rule.actionTemplate,
    escalationTarget: rule.escalationTarget,
  };
}

export function evaluatePredicateOutcomes(
  outcomes: Array<{ role: "exclusion" | "applicability"; outcome: PredicateOutcome }>,
  ruleStatus: RuleFixture["stage"] = "effective",
): DecisionResult["decision"] {
  if (outcomes.some((item) => item.role === "exclusion" && item.outcome === true))
    return "not_affected";
  if (!["effective", "final"].includes(ruleStatus)) return "needs_review";
  if (outcomes.some((item) => item.outcome === "unknown")) return "needs_review";
  if (
    outcomes.some(
      (item) => item.role === "applicability" && item.outcome === false,
    )
  )
    return "not_affected";
  return "affected";
}
