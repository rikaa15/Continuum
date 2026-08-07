import { demoPersonas, personaA } from "@/lib/demo/personas";
import {
  profileSchema,
  type ImmigrationProfile,
} from "@/lib/domain/profile";

const ACTIVE_KEY = "continuum.activeUserId";
const PROFILES_KEY = "continuum.profiles";
const EVEROS_SYNC_KEY = "continuum.everosSyncedUserIds";

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
  const migrated = profileSchema.safeParse({
    ...legacy,
    physicalLocation: {
      state: "known",
      value: "IN_US",
      source: "user",
      confirmedAt,
    },
    currentBasis: {
      state: "known",
      value: currentBasis,
      source: "user",
      confirmedAt,
    },
    priorStatus: {
      state: "unknown",
      reason: "Not collected in the earlier intake",
    },
    targetClassification: {
      state: "unknown",
      reason: "Not collected in the earlier intake",
    },
    employmentEndDate: {
      state: "unknown",
      reason: "Not collected in the earlier intake",
    },
    pendingCases: [],
    aosDetails: null,
  });
  return migrated.success ? migrated.data : null;
}

function readProfiles(): Record<string, ImmigrationProfile> {
  if (!canUseStorage()) return { ...demoPersonas };
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) {
      const seeded = {
        [personaA.userId]: personaA,
        [demoPersonas["demo-daniel"].userId]: demoPersonas["demo-daniel"],
      };
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
    if (!profiles["demo-daniel"]) profiles["demo-daniel"] = demoPersonas["demo-daniel"];
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return profiles;
  } catch {
    return { ...demoPersonas };
  }
}

function writeProfiles(profiles: Record<string, ImmigrationProfile>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

let cachedSnapshot: BrowserStoreSnapshot | null = null;
let cachedSerialized = "";

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
}

export function saveProfileToBrowser(profile: ImmigrationProfile) {
  const profiles = readProfiles();
  profiles[profile.userId] = profileSchema.parse(profile);
  writeProfiles(profiles);
  setActiveUserId(profile.userId);
  return profiles[profile.userId];
}

export function markEverosSynced(userId: string) {
  if (!canUseStorage()) return;
  const current = new Set(
    JSON.parse(window.localStorage.getItem(EVEROS_SYNC_KEY) ?? "[]") as string[],
  );
  current.add(userId);
  window.localStorage.setItem(EVEROS_SYNC_KEY, JSON.stringify([...current]));
}

export function createLocalUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}`;
}
