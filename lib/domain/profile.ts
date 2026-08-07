import { z } from "zod";

export const knownValue = <T extends z.ZodTypeAny>(schema: T) =>
  z.discriminatedUnion("state", [
    z.object({
      state: z.literal("known"),
      value: schema,
      source: z.enum(["user", "everos", "demo"]),
      confirmedAt: z.string().datetime(),
    }),
    z.object({
      state: z.literal("unknown"),
      reason: z.string().min(1).default("Not provided"),
    }),
  ]);

export const currentStatusSchema = z.enum([
  "F1",
  "J1",
  "M1",
  "H1B",
  "H1B1",
  "H2A",
  "H2B",
  "H3",
  "H4",
  "O1",
  "O2",
  "O3",
  "L1",
  "L2",
  "TN",
  "TD",
  "E1",
  "E2",
  "E3",
  "B1",
  "B2",
  "P1",
  "P2",
  "P3",
  "P4",
  "Q1",
  "R1",
  "A",
  "G",
  "I",
  "C1",
  "D",
  "K1",
  "K3",
  "TPS",
  "PAROLE",
  "ASYLUM",
  "REFUGEE",
  "PERMANENT_RESIDENT",
  "OTHER",
]);

export const f1StageSchema = z.enum([
  "ENROLLED",
  "CPT",
  "POST_COMPLETION_OPT",
  "STEM_OPT",
  "NOT_APPLICABLE",
]);

export const physicalLocationSchema = z.enum(["IN_US", "OUTSIDE_US"]);

export const currentBasisSchema = z.enum([
  "NONIMMIGRANT_STATUS",
  "PENDING_ADJUSTMENT_ONLY",
  "WORKER_GRACE_PERIOD",
  "TPS",
  "PAROLE",
  "ASYLUM_RELATED",
  "PERMANENT_RESIDENT",
  "OTHER",
  "UNKNOWN",
]);

export const pendingCaseSchema = z.object({
  type: z.enum(["I485", "I140", "I130", "ASYLUM", "TPS", "PAROLE"]),
  status: z.enum(["PENDING", "APPROVED"]),
});

export const aosDetailsSchema = z.object({
  basis: knownValue(
    z.enum(["EMPLOYMENT", "FAMILY", "DIVERSITY", "OTHER", "UNKNOWN"]),
  ),
  receiptDate: knownValue(z.string().date()),
  priorityDate: knownValue(z.string().date()),
  stage: knownValue(
    z.enum(["RECEIPT", "BIOMETRICS", "RFE", "INTERVIEW", "PENDING_DECISION"]),
  ),
  eadState: knownValue(
    z.enum(["NOT_FILED", "PENDING", "APPROVED", "EXPIRED", "UNKNOWN"]),
  ),
  advanceParoleState: knownValue(
    z.enum(["NOT_FILED", "PENDING", "APPROVED", "EXPIRED", "UNKNOWN"]),
  ),
});

export const profileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  profileVersion: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  physicalLocation: knownValue(physicalLocationSchema),
  currentBasis: knownValue(currentBasisSchema),
  currentStatus: knownValue(currentStatusSchema),
  priorStatus: knownValue(currentStatusSchema),
  targetClassification: knownValue(currentStatusSchema),
  employmentEndDate: knownValue(z.string().date()),
  pendingCases: z.array(pendingCaseSchema).max(6),
  aosDetails: aosDetailsSchema.nullable(),
  f1Stage: knownValue(f1StageSchema),
  validUntil: knownValue(z.string().date()),
  immediateGoal: knownValue(
    z.enum(["MAINTAIN_STATUS", "STEM_EXTENSION", "H1B_TRANSITION", "EB2_NIW"]),
  ),
  employerType: knownValue(
    z.enum(["CAP_SUBJECT", "CAP_EXEMPT", "NOT_APPLICABLE"]),
  ),
  employerEVerify: knownValue(z.boolean()),
  plannedTravel: knownValue(z.boolean()),
  nextKnownDeadline: knownValue(z.string().date()),
  historyCompleteness: z.enum(["complete", "incomplete", "needs_review"]),
  evidenceCriteria: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        state: z.enum(["met", "missing", "needs_review"]),
      }),
    )
    .max(5),
  historyEvents: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["status", "education", "employment", "travel", "notice"]),
        title: z.string(),
        date: z.string().date(),
        confidence: z.enum(["confirmed", "approximate", "unknown"]),
      }),
    )
    .max(10),
});

export type ImmigrationProfile = z.infer<typeof profileSchema>;
export type ProfileField = Exclude<
  keyof ImmigrationProfile,
  | "userId"
  | "displayName"
  | "profileVersion"
  | "updatedAt"
  | "historyCompleteness"
  | "evidenceCriteria"
  | "historyEvents"
>;

export function known<T>(
  value: T,
  source: "user" | "everos" | "demo" = "demo",
) {
  return {
    state: "known" as const,
    value,
    source,
    confirmedAt: new Date().toISOString(),
  };
}

export function unknown(reason = "Not provided") {
  return { state: "unknown" as const, reason };
}
