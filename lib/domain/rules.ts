import { z } from "zod";
import type { ImmigrationProfile, ProfileField } from "@/lib/domain/profile";

export type PredicateRole = "exclusion" | "applicability";
export type PredicateOutcome = true | false | "unknown";

export type RulePredicate = {
  id: string;
  label: string;
  field: ProfileField;
  role: PredicateRole;
  evaluate: (profile: ImmigrationProfile) => PredicateOutcome;
  describeMatch: (profile: ImmigrationProfile) => string;
};

export type RuleFixture = {
  ruleId: string;
  version: string;
  title: string;
  summary: string;
  stage: "proposed" | "final" | "effective" | "enjoined" | "vacated";
  effectiveDate: string;
  asOfDate: string;
  sourceTitle: string;
  sourceUrl: string;
  litigationStatus: string;
  reviewedByCounsel: boolean;
  isDemonstrationFixture: boolean;
  actionTemplate: string;
  escalationTarget: string;
  predicates: RulePredicate[];
};

export const decisionResultSchema = z.object({
  ruleId: z.string(),
  ruleVersion: z.string(),
  profileVersion: z.number().int(),
  evaluatedAt: z.string().datetime(),
  decision: z.enum(["affected", "not_affected", "needs_review"]),
  matchedFacts: z.array(z.object({ field: z.string(), statement: z.string() })),
  missingFacts: z.array(z.object({ field: z.string(), reason: z.string() })),
  decisionReasons: z.array(z.string()),
  recommendedAction: z.string(),
  escalationTarget: z.string(),
  explanation: z.string().optional(),
});

export type DecisionResult = z.infer<typeof decisionResultSchema>;
