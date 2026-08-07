import {
  type ImmigrationProfile,
  known,
  unknown,
} from "@/lib/domain/profile";

const confirmedAt = "2026-08-07T12:00:00.000Z";
const demoKnown = <T>(value: T) => ({
  state: "known" as const,
  value,
  source: "demo" as const,
  confirmedAt,
});

export const personaA: ImmigrationProfile = {
  userId: "demo-maya",
  displayName: "Maya Chen",
  profileVersion: 2,
  updatedAt: confirmedAt,
  citizenshipCountries: demoKnown(["China"]),
  dateOfBirth: demoKnown("1998-04-12"),
  countryOfBirth: demoKnown("China"),
  cityOfBirth: unknown("Not added to the demo profile"),
  maritalStatus: demoKnown("SINGLE"),
  dependentCount: demoKnown(0),
  physicalLocation: demoKnown("IN_US"),
  currentBasis: demoKnown("NONIMMIGRANT_STATUS"),
  currentStatus: demoKnown("F1"),
  priorStatus: unknown("No prior classification recorded"),
  targetClassification: unknown("Already in the United States"),
  employmentEndDate: unknown("Not in a worker grace period"),
  pendingCases: [],
  aosDetails: null,
  f1Stage: demoKnown("STEM_OPT"),
  validUntil: demoKnown("2027-02-14"),
  immediateGoal: demoKnown("MAINTAIN_STATUS"),
  employerType: demoKnown("NOT_APPLICABLE"),
  employerEVerify: demoKnown(true),
  plannedTravel: demoKnown(true),
  nextKnownDeadline: demoKnown("2026-09-18"),
  historyCompleteness: "incomplete",
  historyReview: {
    identity: "reviewed",
    currentSituation: "reviewed",
    statusHistory: "reviewed",
    travelHistory: "needs_review",
    petitionsAndNotices: "not_started",
    family: "reviewed",
  },
  documents: [],
  evidenceCriteria: [
    { id: "i983", label: "Training plan reviewed", state: "met" },
    { id: "everify", label: "Employer E-Verify confirmed", state: "met" },
    { id: "travel", label: "Travel documents reviewed", state: "needs_review" },
  ],
  historyEvents: [
    {
      id: "event-1",
      type: "education",
      title: "Completed degree program",
      details: "",
      date: "2025-05-18",
      datePrecision: "exact",
      confidence: "confirmed",
      source: "demo",
      reviewState: "confirmed",
    },
    {
      id: "event-2",
      type: "employment",
      title: "STEM OPT employment began",
      details: "",
      date: "2025-08-15",
      datePrecision: "exact",
      confidence: "confirmed",
      source: "demo",
      reviewState: "confirmed",
    },
  ],
};

export const personaB: ImmigrationProfile = {
  userId: "demo-daniel",
  displayName: "Daniel Okafor",
  profileVersion: 4,
  updatedAt: confirmedAt,
  citizenshipCountries: demoKnown(["Nigeria"]),
  dateOfBirth: demoKnown("1989-10-08"),
  countryOfBirth: demoKnown("Nigeria"),
  cityOfBirth: demoKnown("Lagos"),
  maritalStatus: demoKnown("MARRIED"),
  dependentCount: demoKnown(1),
  physicalLocation: demoKnown("IN_US"),
  currentBasis: demoKnown("NONIMMIGRANT_STATUS"),
  currentStatus: demoKnown("H1B"),
  priorStatus: unknown("No prior classification recorded"),
  targetClassification: unknown("Already in the United States"),
  employmentEndDate: unknown("Not in a worker grace period"),
  pendingCases: [
    { type: "I140", status: "APPROVED" },
    { type: "I485", status: "PENDING" },
  ],
  aosDetails: {
    basis: demoKnown("EMPLOYMENT"),
    receiptDate: demoKnown("2026-04-12"),
    priorityDate: demoKnown("2024-11-08"),
    stage: demoKnown("BIOMETRICS"),
    eadState: demoKnown("PENDING"),
    advanceParoleState: demoKnown("PENDING"),
  },
  f1Stage: demoKnown("NOT_APPLICABLE"),
  validUntil: demoKnown("2028-09-30"),
  immediateGoal: demoKnown("EB2_NIW"),
  employerType: demoKnown("CAP_EXEMPT"),
  employerEVerify: demoKnown(false),
  plannedTravel: demoKnown(false),
  nextKnownDeadline: demoKnown("2027-03-01"),
  historyCompleteness: "complete",
  historyReview: {
    identity: "reviewed",
    currentSituation: "reviewed",
    statusHistory: "reviewed",
    travelHistory: "reviewed",
    petitionsAndNotices: "reviewed",
    family: "reviewed",
  },
  documents: [],
  evidenceCriteria: [
    { id: "impact", label: "Evidence of field impact", state: "met" },
    { id: "letters", label: "Independent expert letters", state: "missing" },
    { id: "endeavor", label: "Proposed endeavor summary", state: "needs_review" },
  ],
  historyEvents: [
    {
      id: "event-3",
      type: "status",
      title: "H-1B approval",
      details: "Change of status approved.",
      date: "2025-10-01",
      datePrecision: "exact",
      confidence: "confirmed",
      source: "demo",
      reviewState: "confirmed",
    },
  ],
};

export const incompletePersona: ImmigrationProfile = {
  ...personaA,
  userId: "demo-maya-review",
  profileVersion: 2,
  updatedAt: "2026-08-07T12:05:00.000Z",
  employerEVerify: unknown("Employer enrollment has not been confirmed"),
  historyCompleteness: "needs_review",
};

export const demoPersonas = {
  [personaA.userId]: personaA,
  [personaB.userId]: personaB,
  [incompletePersona.userId]: incompletePersona,
};

export function cloneProfileForUserInput(
  profile: ImmigrationProfile,
): ImmigrationProfile {
  const now = new Date().toISOString();
  const clone = structuredClone(profile);
  for (const key of [
    "physicalLocation",
    "citizenshipCountries",
    "dateOfBirth",
    "countryOfBirth",
    "cityOfBirth",
    "maritalStatus",
    "dependentCount",
    "currentBasis",
    "currentStatus",
    "priorStatus",
    "targetClassification",
    "employmentEndDate",
    "f1Stage",
    "validUntil",
    "immediateGoal",
    "employerType",
    "employerEVerify",
    "plannedTravel",
    "nextKnownDeadline",
  ] as const) {
    const field = clone[key];
    if (field.state === "known") {
      clone[key] = known(field.value, "user") as never;
    }
  }
  clone.updatedAt = now;
  return clone;
}
