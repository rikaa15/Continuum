import type { ImmigrationProfile } from "@/lib/domain/profile";

export const historyAreas = [
  {
    id: "identity",
    label: "Identity and citizenship",
    prompt:
      "Let’s review your citizenship, birth details, and any facts that could affect nationality-specific pathways.",
  },
  {
    id: "currentSituation",
    label: "Current situation",
    prompt:
      "Tell me what status or immigration basis you have today and any dates you are unsure about.",
  },
  {
    id: "statusHistory",
    label: "Status history",
    prompt:
      "Walk me through prior U.S. statuses, changes of status, approvals, denials, or gaps.",
  },
  {
    id: "travelHistory",
    label: "Entries and travel",
    prompt:
      "Tell me about important U.S. entries, departures, visa use, or travel complications.",
  },
  {
    id: "petitionsAndNotices",
    label: "Petitions and notices",
    prompt:
      "Describe petitions, applications, RFEs, notices, interviews, approvals, or denials that matter to your history.",
  },
  {
    id: "family",
    label: "Family and dependents",
    prompt:
      "Tell me about a spouse or dependents whose immigration situation should be tracked with yours.",
  },
] as const;

export type HistoryAreaId = (typeof historyAreas)[number]["id"];

export function getHistoryCompletion(profile: ImmigrationProfile) {
  const reviewed = historyAreas.filter(
    (area) => profile.historyReview[area.id] === "reviewed",
  ).length;
  const percentage = Math.round((reviewed / historyAreas.length) * 100);
  const nextArea =
    historyAreas.find(
      (area) => profile.historyReview[area.id] !== "reviewed",
    ) ?? null;
  const needsReview = historyAreas.filter(
    (area) => profile.historyReview[area.id] === "needs_review",
  ).length;

  return {
    reviewed,
    total: historyAreas.length,
    percentage,
    nextArea,
    needsReview,
    status:
      percentage === 100
        ? ("complete" as const)
        : needsReview > 0
          ? ("needs_review" as const)
          : ("incomplete" as const),
  };
}
