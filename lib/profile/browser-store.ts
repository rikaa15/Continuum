import { personaA, personaB } from "@/lib/demo/personas";
import {
  profileSchema,
  type ImmigrationProfile,
} from "@/lib/domain/profile";

const ACTIVE_KEY = "continuum.activeUserId";
const PROFILES_KEY = "continuum.profiles";
const EVEROS_SYNC_KEY = "continuum.everosSyncedUserIds";

export const DEMO_USER_IDS = new Set([personaA.userId, personaB.userId]);

export function isDemoUserId(userId: string) {
  return DEMO_USER_IDS.has(userId);
}

export type BrowserStoreSnapshot = {
  activeUserId: string;
  profiles: Record<string, ImmigrationProfile>;
  everosSyncedUserIds: string[];
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function migrateProfile(value: unknown): ImmigrationProfile | null {
  const current = profileSchema.safeParse(value);
  if (current.success) return current.data;
  if (!value || typeof value !== "object") return null;

  const legacy = value as Record<string, unknown>;
  const currentStatus = legacy.currentStatus as
    | { state?: string; value?: string }
    | undefined;
  const legacyStatus = currentStatus?.value;
  const currentBasis =
    legacyStatus === "PERMANENT_RESIDENT"
      ? "PERMANENT_RESIDENT"
      : legacyStatus === "TPS"
        ? "TPS"
        : legacyStatus === "PAROLE"
          ? "PAROLE"
          : legacyStatus === "ASYLUM"
            ? "ASYLUM_RELATED"
            : "NONIMMIGRANT_STATUS";
  const confirmedAt =
    typeof legacy.updatedAt === "string"
      ? legacy.updatedAt
      : new Date().toISOString();
  const legacyEvents = Array.isArray(legacy.historyEvents)
    ? legacy.historyEvents.map((event, index) => {
        const item = event as Record<string, unknown>;
        return {
          id: typeof item.id === "string" ? item.id : `migrated-${index}`,
          type: item.type === "travel" ? "travel" : item.type,
          title:
            typeof item.title === "string" ? item.title : "History event",
          details: typeof item.details === "string" ? item.details : "",
          date: typeof item.date === "string" ? item.date : null,
          datePrecision:
            typeof item.date === "string" ? "exact" : "unknown",
          confidence:
            item.confidence === "approximate" ||
            item.confidence === "unknown"
              ? item.confidence
              : "confirmed",
          source: item.source === "demo" ? "demo" : "user",
          reviewState: "confirmed",
        };
      })
    : [];
  const allReviewed = legacy.historyCompleteness === "complete";
  const migrated = profileSchema.safeParse({
    ...legacy,
    profileVersion:
      typeof legacy.profileVersion === "number"
        ? legacy.profileVersion + 1
        : 1,
    citizenshipCountries:
      legacy.citizenshipCountries ??
      { state: "unknown", reason: "Not collected yet" },
    dateOfBirth:
      legacy.dateOfBirth ??
      { state: "unknown", reason: "Not collected yet" },
    countryOfBirth:
      legacy.countryOfBirth ??
      { state: "unknown", reason: "Not collected yet" },
    cityOfBirth:
      legacy.cityOfBirth ??
      { state: "unknown", reason: "Not collected yet" },
    maritalStatus:
      legacy.maritalStatus ??
      { state: "unknown", reason: "Not collected yet" },
    dependentCount:
      legacy.dependentCount ??
      { state: "unknown", reason: "Not collected yet" },
    physicalLocation:
      legacy.physicalLocation ?? {
        state: "known",
        value: "IN_US",
        source: "user",
        confirmedAt,
      },
    currentBasis:
      legacy.currentBasis ?? {
        state: "known",
        value: currentBasis,
        source: "user",
        confirmedAt,
      },
    priorStatus:
      legacy.priorStatus ?? {
        state: "unknown",
        reason: "Not collected in the earlier intake",
      },
    targetClassification:
      legacy.targetClassification ?? {
        state: "unknown",
        reason: "Not collected in the earlier intake",
      },
    employmentEndDate:
      legacy.employmentEndDate ?? {
        state: "unknown",
        reason: "Not collected in the earlier intake",
      },
    pendingCases: legacy.pendingCases ?? [],
    aosDetails: legacy.aosDetails ?? null,
    historyReview:
      legacy.historyReview ?? {
        identity: "not_started",
        currentSituation: "reviewed",
        statusHistory: allReviewed ? "reviewed" : "not_started",
        travelHistory: allReviewed ? "reviewed" : "not_started",
        petitionsAndNotices: allReviewed ? "reviewed" : "not_started",
        family: "not_started",
      },
    documents: legacy.documents ?? [],
    historyEvents: legacyEvents,
  });
  return migrated.success ? migrated.data : null;
}

function seedProfiles(): Record<string, ImmigrationProfile> {
  return {
    [personaA.userId]: personaA,
    [personaB.userId]: personaB,
  };
}

function readProfiles(): Record<string, ImmigrationProfile> {
  if (!canUseStorage()) return seedProfiles();
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      const seeded = seedProfiles();
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const profiles: Record<string, ImmigrationProfile> = {};
    for (const [userId, value] of Object.entries(parsed)) {
      const profile = migrateProfile(value);
      if (profile) profiles[userId] = profile;
    }
    if (!profiles[personaA.userId]) profiles[personaA.userId] = personaA;
    if (!profiles[personaB.userId]) profiles[personaB.userId] = personaB;
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return profiles;
  } catch {
    return seedProfiles();
  }
}

function writeProfiles(profiles: Record<string, ImmigrationProfile>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

let cachedSnapshot: BrowserStoreSnapshot | null = null;
let cachedSerialized = "";

function clearCachedSnapshot() {
  cachedSnapshot = null;
  cachedSerialized = "";
}

export function loadBrowserStore(): BrowserStoreSnapshot {
  const profiles = readProfiles();
  let activeUserId = personaA.userId;
  let everosSyncedUserIds: string[] = [];
  if (canUseStorage()) {
    activeUserId = window.localStorage.getItem(ACTIVE_KEY) ?? personaA.userId;
    if (!profiles[activeUserId]) activeUserId = personaA.userId;
    try {
      everosSyncedUserIds = JSON.parse(
        window.localStorage.getItem(EVEROS_SYNC_KEY) ?? "[]",
      ) as string[];
    } catch {
      everosSyncedUserIds = [];
    }
  }
  const next = { activeUserId, profiles, everosSyncedUserIds };
  const serialized = JSON.stringify(next);
  if (cachedSnapshot && cachedSerialized === serialized) return cachedSnapshot;
  cachedSnapshot = next;
  cachedSerialized = serialized;
  return next;
}

export function setActiveUserId(userId: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACTIVE_KEY, userId);
  clearCachedSnapshot();
}

export function saveProfileToBrowser(profile: ImmigrationProfile) {
  const profiles = readProfiles();
  profiles[profile.userId] = profileSchema.parse(profile);
  writeProfiles(profiles);
  setActiveUserId(profile.userId);
  clearCachedSnapshot();
  return profiles[profile.userId];
}

export function deleteProfileFromBrowser(userId: string) {
  if (isDemoUserId(userId)) {
    throw new Error("Demo profiles cannot be deleted");
  }
  const profiles = readProfiles();
  delete profiles[userId];
  writeProfiles(profiles);

  if (canUseStorage()) {
    const synced = new Set(
      JSON.parse(window.localStorage.getItem(EVEROS_SYNC_KEY) ?? "[]") as string[],
    );
    synced.delete(userId);
    window.localStorage.setItem(EVEROS_SYNC_KEY, JSON.stringify([...synced]));
  }

  const currentActive = canUseStorage()
    ? (window.localStorage.getItem(ACTIVE_KEY) ?? personaA.userId)
    : personaA.userId;
  const nextActive =
    currentActive === userId || !profiles[currentActive]
      ? personaA.userId
      : currentActive;
  setActiveUserId(nextActive);
  clearCachedSnapshot();
  return loadBrowserStore();
}

export function signOutBrowserSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACTIVE_KEY);
  clearCachedSnapshot();
}

export function markEverosSynced(userId: string) {
  if (!canUseStorage()) return;
  const current = new Set(
    JSON.parse(window.localStorage.getItem(EVEROS_SYNC_KEY) ?? "[]") as string[],
  );
  current.add(userId);
  window.localStorage.setItem(EVEROS_SYNC_KEY, JSON.stringify([...current]));
  clearCachedSnapshot();
}

export function createLocalUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}`;
}
