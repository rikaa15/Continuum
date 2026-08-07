import type { ImmigrationProfile } from "@/lib/domain/profile";
import type { RuleFixture } from "@/lib/domain/rules";
import { studentPolicyRule } from "@/lib/rules/fixtures/student-policy";

function knownStatus(profile: ImmigrationProfile) {
  return profile.currentStatus.state === "known"
    ? profile.currentStatus.value
    : null;
}

export const fixedAdmissionScenario: RuleFixture = {
  ruleId: "demo-fixed-admission-periods",
  version: "2026.08-demo.1",
  title: "Fixed admission periods for student status",
  summary:
    "Illustrative final-rule scenario showing how an effective date and travel transition could create a personal deadline.",
  stage: "final",
  effectiveDate: "2026-09-15",
  asOfDate: "2026-08-07",
  sourceTitle:
    "Demonstration scenario — verify any real rule in the Federal Register",
  sourceUrl: "https://www.federalregister.gov/",
  litigationStatus:
    "No litigation posture is asserted. This fixture is not a current-law claim.",
  channel: "rulemaking",
  responseKind: "deadline",
  leadTime: "Illustrative 30–60 day final-rule window",
  reversibility: "moderate",
  transitionSummary:
    "The demonstration assumes different treatment based on status, location, and travel after an effective date.",
  noRegretAction:
    "Confirm the I-94, program or work-authorization end date, and any travel plan before relying on a transition rule.",
  monitoringCadence: "daily",
  reviewedByCounsel: false,
  isDemonstrationFixture: true,
  actionTemplate:
    "Demonstration only: review travel timing and admission records with a DSO or qualified attorney before the illustrative effective date.",
  escalationTarget: "Your DSO or a qualified immigration attorney",
  predicates: [
    {
      id: "exclude-non-f1",
      label: "Current classification is outside F-1",
      field: "currentStatus",
      role: "exclusion",
      evaluate: (profile) => {
        const status = knownStatus(profile);
        if (!status || status === "OTHER") return "unknown";
        return status !== "F1";
      },
      describeMatch: (profile) =>
        `Current status: ${knownStatus(profile) ?? "unknown"}`,
    },
    {
      id: "f1-current",
      label: "Current F-1 classification is confirmed",
      field: "currentStatus",
      role: "applicability",
      evaluate: (profile) => {
        const status = knownStatus(profile);
        if (!status || status === "OTHER") return "unknown";
        return status === "F1";
      },
      describeMatch: () => "Profile records current F-1 classification",
    },
    {
      id: "travel-planned",
      label: "International travel is currently planned",
      field: "plannedTravel",
      role: "applicability",
      evaluate: (profile) =>
        profile.plannedTravel.state === "known"
          ? profile.plannedTravel.value
          : "unknown",
      describeMatch: () => "Profile records planned international travel",
    },
  ],
};

export const wageSelectionScenario: RuleFixture = {
  ruleId: "demo-wage-weighted-h1b-selection",
  version: "2026.08-demo.1",
  title: "Wage-weighted H-1B selection",
  summary:
    "Illustrative rulemaking scenario showing when compensation data could reprioritize an H-1B plan.",
  stage: "final",
  effectiveDate: "2026-02-27",
  asOfDate: "2026-08-07",
  sourceTitle:
    "Demonstration scenario — verify any selection rule with USCIS",
  sourceUrl: "https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations",
  litigationStatus:
    "No current selection methodology or litigation result is asserted by this fixture.",
  channel: "rulemaking",
  responseKind: "reprioritization",
  leadTime: "Illustrative registration-cycle planning window",
  reversibility: "moderate",
  transitionSummary:
    "The demonstration assumes registration treatment varies by offered wage level.",
  noRegretAction:
    "Understand the role’s SOC code, work location, prevailing wage, and offered wage before registration.",
  monitoringCadence: "monthly",
  reviewedByCounsel: false,
  isDemonstrationFixture: true,
  actionTemplate:
    "Compare the offered wage with the applicable prevailing-wage level and keep cap-exempt options in view.",
  escalationTarget: "The sponsoring employer’s immigration counsel",
  predicates: [
    {
      id: "h1b-goal",
      label: "H-1B transition is a confirmed current goal",
      field: "immediateGoal",
      role: "applicability",
      evaluate: (profile) =>
        profile.immediateGoal.state === "known"
          ? profile.immediateGoal.value === "H1B_TRANSITION"
          : "unknown",
      describeMatch: () => "Profile identifies an H-1B transition as the current focus",
    },
  ],
};

export const niwEvidenceScenario: RuleFixture = {
  ruleId: "demo-niw-evidence-guidance",
  version: "2026.08-demo.1",
  title: "NIW evidence expectations changed",
  summary:
    "Illustrative guidance update showing how a policy change could reprioritize evidence-building without creating an immediate filing deadline.",
  stage: "effective",
  effectiveDate: "2026-01-15",
  asOfDate: "2026-08-07",
  sourceTitle:
    "Demonstration scenario — verify guidance in the USCIS Policy Manual",
  sourceUrl: "https://www.uscis.gov/policy-manual",
  litigationStatus:
    "Sub-regulatory guidance may be revised without notice. No current approval-rate claim is asserted.",
  channel: "guidance",
  responseKind: "reprioritization",
  leadTime: "Little or no advance warning",
  reversibility: "high",
  transitionSummary:
    "The demonstration assumes pending and future NIW filings face changed evidentiary emphasis.",
  noRegretAction:
    "Document a specific endeavor, measurable impact, independent validation, and its connection to a documented national need.",
  monitoringCadence: "weekly",
  reviewedByCounsel: false,
  isDemonstrationFixture: true,
  actionTemplate:
    "Move evidence of measurable impact and a specific national need ahead of general field-importance claims.",
  escalationTarget: "Qualified counsel reviewing the proposed NIW endeavor",
  predicates: [
    {
      id: "niw-plan-or-petition",
      label: "NIW planning or an I-140 is recorded",
      field: "immediateGoal",
      role: "applicability",
      evaluate: (profile) => {
        if (profile.immediateGoal.state === "unknown") return "unknown";
        return (
          profile.immediateGoal.value === "EB2_NIW" ||
          profile.pendingCases.some((item) => item.type === "I140")
        );
      },
      describeMatch: (profile) =>
        profile.pendingCases.some((item) => item.type === "I140")
          ? "Profile records an I-140 case"
          : "Profile identifies employment-based permanent residence as the current focus",
    },
  ],
};

export const monitoringRules = [
  fixedAdmissionScenario,
  wageSelectionScenario,
  niwEvidenceScenario,
  studentPolicyRule,
] as const;

export function getMonitoringRule(ruleId: string) {
  return monitoringRules.find((rule) => rule.ruleId === ruleId);
}
