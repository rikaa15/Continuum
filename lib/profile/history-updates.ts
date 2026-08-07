import {
  known,
  type ImmigrationProfile,
} from "@/lib/domain/profile";
import {
  validateFactValue,
  type ProposedEvent,
  type ProposedFact,
} from "@/lib/history/interview";
import type { HistoryAreaId } from "@/lib/profile/completeness";
import { getHistoryCompletion } from "@/lib/profile/completeness";

function applyFact(
  profile: ImmigrationProfile,
  proposal: ProposedFact,
): ImmigrationProfile {
  const value = validateFactValue(proposal);
  switch (proposal.field) {
    case "citizenshipCountries":
      return {
        ...profile,
        citizenshipCountries: known(value as string[], "user"),
      };
    case "dateOfBirth":
      return { ...profile, dateOfBirth: known(value as string, "user") };
    case "countryOfBirth":
      return { ...profile, countryOfBirth: known(value as string, "user") };
    case "cityOfBirth":
      return { ...profile, cityOfBirth: known(value as string, "user") };
    case "maritalStatus":
      return {
        ...profile,
        maritalStatus: known(
          value as
            | "SINGLE"
            | "MARRIED"
            | "SEPARATED"
            | "DIVORCED"
            | "WIDOWED"
            | "OTHER",
          "user",
        ),
      };
    case "dependentCount":
      return { ...profile, dependentCount: known(value as number, "user") };
  }
}

function defaultIdFactory() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `history-${crypto.randomUUID()}`;
  }
  return `history-${Date.now()}-${Math.random()}`;
}

export function confirmHistoryUpdates(
  profile: ImmigrationProfile,
  area: HistoryAreaId,
  factProposals: ProposedFact[],
  eventProposals: ProposedEvent[],
  idFactory = defaultIdFactory,
  replaceEventId?: string,
) {
  let next = structuredClone(profile);
  factProposals.forEach((proposal) => {
    next = applyFact(next, proposal);
  });
  const events = eventProposals.map((event) => ({
    ...event,
    id: idFactory(),
    source: "ai" as const,
    reviewState: "confirmed" as const,
  }));
  const retainedEvents =
    replaceEventId && events.length > 0
      ? next.historyEvents.filter((event) => event.id !== replaceEventId)
      : next.historyEvents;
  next.historyEvents = [...retainedEvents, ...events].slice(-30);
  next.historyReview = { ...next.historyReview, [area]: "reviewed" };
  next.profileVersion += 1;
  next.updatedAt = new Date().toISOString();
  next.historyCompleteness = getHistoryCompletion(next).status;
  return next;
}
