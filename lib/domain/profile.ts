import { z } from "zod";

export function knownValue<T extends z.ZodTypeAny>(schema: T) {
  return z.discriminatedUnion("state", [
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
}

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

export const maritalStatusSchema = z.enum([
  "SINGLE",
  "MARRIED",
  "SEPARATED",
  "DIVORCED",
  "WIDOWED",
  "OTHER",
]);

export const historyAreaSchema = z.enum([
  "identity",
  "currentSituation",
  "statusHistory",
  "travelHistory",
  "petitionsAndNotices",
  "family",
]);

export const historyReviewStateSchema = z.enum([
  "not_started",
  "reviewed",
  "needs_review",
]);

export const historyReviewSchema = z.record(
  historyAreaSchema,
  historyReviewStateSchema,
);

export const historyEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "status",
    "entry_exit",
    "education",
    "employment",
    "petition",
    "notice",
    "family",
    "travel",
  ]),
  title: z.string().min(1).max(160),
  details: z.string().max(600).default(""),
  date: z.string().date().nullable(),
  datePrecision: z.enum(["exact", "month", "year", "unknown"]),
  confidence: z.enum(["confirmed", "approximate", "unknown"]),
  source: z.enum(["user", "ai", "demo"]),
  reviewState: z.enum(["proposed", "confirmed"]),
});

export const profileDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  category: historyAreaSchema,
  uploadedAt: z.string().datetime(),
  analysisStatus: z.enum(["uploaded", "analyzed", "error"]),
  summary: z.string().max(500).nullable(),
});

export const profileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  profileVersion: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  citizenshipCountries: knownValue(
    z.array(z.string().trim().min(2).max(80)).min(1).max(4),
  ),
  dateOfBirth: knownValue(z.string().date()),
  countryOfBirth: knownValue(z.string().trim().min(2).max(80)),
  cityOfBirth: knownValue(z.string().trim().min(1).max(100)),
  maritalStatus: knownValue(maritalStatusSchema),
  dependentCount: knownValue(z.number().int().min(0).max(20)),
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
    z.enum([
      "STILL_EXPLORING",
      "MAINTAIN_STATUS",
      "STEM_EXTENSION",
      "H1B_TRANSITION",
      "EB2_NIW",
    ]),
  ),
  employerType: knownValue(
    z.enum(["CAP_SUBJECT", "CAP_EXEMPT", "NOT_APPLICABLE"]),
  ),
  employerEVerify: knownValue(z.boolean()),
  plannedTravel: knownValue(z.boolean()),
  nextKnownDeadline: knownValue(z.string().date()),
  historyCompleteness: z.enum(["complete", "incomplete", "needs_review"]),
  historyReview: historyReviewSchema,
  documents: z.array(profileDocumentSchema).max(30),
  evidenceCriteria: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        state: z.enum(["met", "missing", "needs_review"]),
      }),
    )
    .max(5),
  historyEvents: z.array(historyEventSchema).max(30),
});

export type ImmigrationProfile = z.infer<typeof profileSchema>;
export type ProfileField = Exclude<
  keyof ImmigrationProfile,
  | "userId"
  | "displayName"
  | "profileVersion"
  | "updatedAt"
  | "historyCompleteness"
  | "historyReview"
  | "documents"
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
