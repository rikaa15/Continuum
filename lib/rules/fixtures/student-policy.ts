import type { RuleFixture } from "@/lib/domain/rules";

export const studentPolicyRule: RuleFixture = {
  ruleId: "stem-opt-employer-check-2026",
  version: "2026.08-demo.1",
  title: "STEM OPT employer eligibility check",
  summary:
    "A demonstration alert that checks whether a STEM OPT participant has confirmed employer participation in E-Verify.",
  stage: "effective",
  effectiveDate: "2016-05-10",
  asOfDate: "2026-08-07",
  sourceTitle: "Study in the States — STEM OPT Hub",
  sourceUrl:
    "https://studyinthestates.dhs.gov/stem-opt-hub/additional-resources/stem-opt-extension-overview",
  litigationStatus: "No litigation status is asserted by this demonstration fixture.",
  channel: "operations",
  responseKind: "deadline",
  leadTime: "Check before accepting or changing STEM OPT employment",
  reversibility: "high",
  transitionSummary:
    "Employer eligibility and training-plan facts can change when employment changes.",
  noRegretAction:
    "Keep current E-Verify confirmation and the signed training plan with your employment records.",
  monitoringCadence: "monthly",
  reviewedByCounsel: false,
  isDemonstrationFixture: true,
  actionTemplate:
    "Confirm the employer’s current E-Verify participation and review your training plan with your designated school official before relying on this alert.",
  escalationTarget: "Your designated school official (DSO) or a qualified attorney",
  predicates: [
    {
      id: "exclude-outside-us",
      label: "User is currently outside the United States",
      field: "physicalLocation",
      role: "exclusion",
      evaluate: (profile) => {
        if (profile.physicalLocation.state === "unknown") return "unknown";
        return profile.physicalLocation.value === "OUTSIDE_US";
      },
      describeMatch: () => "Profile records current location outside the U.S.",
    },
    {
      id: "exclude-non-status-basis",
      label: "Current U.S. basis is not a nonimmigrant status",
      field: "currentBasis",
      role: "exclusion",
      evaluate: (profile) => {
        if (profile.currentBasis.state === "unknown") return "unknown";
        if (
          profile.currentBasis.value === "OTHER" ||
          profile.currentBasis.value === "UNKNOWN"
        ) {
          return "unknown";
        }
        return profile.currentBasis.value !== "NONIMMIGRANT_STATUS";
      },
      describeMatch: (profile) =>
        profile.currentBasis.state === "known"
          ? `Current basis: ${profile.currentBasis.value.replaceAll("_", " ")}`
          : "Current basis is unknown",
    },
    {
      id: "exclude-non-student",
      label: "Current context is outside F-1 practical training",
      field: "currentStatus",
      role: "exclusion",
      evaluate: (profile) => {
        if (profile.currentStatus.state === "unknown") return "unknown";
        if (profile.currentStatus.value === "OTHER") return "unknown";
        return profile.currentStatus.value !== "F1";
      },
      describeMatch: (profile) =>
        profile.currentStatus.state === "known"
          ? `Current status: ${profile.currentStatus.value.replaceAll("_", " ")}`
          : "Current status is unknown",
    },
    {
      id: "stem-opt-context",
      label: "Currently participating in STEM OPT",
      field: "f1Stage",
      role: "applicability",
      evaluate: (profile) => {
        if (profile.f1Stage.state === "unknown") return "unknown";
        return profile.f1Stage.value === "STEM_OPT";
      },
      describeMatch: () =>
        "F-1 profile records current participation in the STEM OPT extension",
    },
    {
      id: "everify-confirmed",
      label: "Employer participates in E-Verify",
      field: "employerEVerify",
      role: "applicability",
      evaluate: (profile) => {
        if (profile.employerEVerify.state === "unknown") return "unknown";
        return profile.employerEVerify.value;
      },
      describeMatch: () => "Employer E-Verify participation is confirmed",
    },
  ],
};
