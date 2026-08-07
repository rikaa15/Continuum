import type {
  AlertResponseKind,
  DecisionResult,
  RuleFixture,
} from "@/lib/domain/rules";

export type PersonalizedAlertKind =
  | AlertResponseKind
  | "noise"
  | "needs_review";

export function classifyMonitoringResult(
  rule: RuleFixture,
  result: DecisionResult,
): PersonalizedAlertKind {
  if (result.decision === "not_affected") return "noise";
  if (result.decision === "needs_review") return "needs_review";
  return rule.responseKind;
}
