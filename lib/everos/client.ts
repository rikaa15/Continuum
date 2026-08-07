import "server-only";

import { profileSchema, type ImmigrationProfile } from "@/lib/domain/profile";

const PROFILE_PREFIX = "CONTINUUM_PROFILE_V1:";

type EverOSConfig = {
  baseUrl: string;
  apiKey?: string;
  appId: string;
  projectId: string;
};

function getConfig(): EverOSConfig {
  const baseUrl = process.env.EVEROS_BASE_URL;
  if (!baseUrl) throw new Error("EVEROS_BASE_URL is not configured");
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey: process.env.EVEROS_API_KEY,
    appId: process.env.EVEROS_APP_ID ?? "continuum",
    projectId: process.env.EVEROS_PROJECT_ID ?? "hackathon",
  };
}

async function request<T>(path: string, body: object): Promise<T> {
  const config = getConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      app_id: config.appId,
      project_id: config.projectId,
      ...body,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`EverOS request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function findProfilePayload(value: unknown): ImmigrationProfile | null {
  if (typeof value === "string") {
    const index = value.indexOf(PROFILE_PREFIX);
    if (index === -1) return null;
    const candidate = value.slice(index + PROFILE_PREFIX.length).trim();
    try {
      return profileSchema.parse(JSON.parse(candidate));
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const profile = findProfilePayload(item);
      if (profile) return profile;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const profile = findProfilePayload(item);
      if (profile) return profile;
    }
  }
  return null;
}

export async function saveProfileToEverOS(profile: ImmigrationProfile) {
  const timestamp = Date.now();
  const sessionId = `continuum-profile-${profile.userId}`;
  await request("/api/v2/memory/add", {
    session_id: sessionId,
    user_id: profile.userId,
    messages: [
      {
        sender_id: profile.userId,
        role: "user",
        timestamp,
        content: `${PROFILE_PREFIX}${JSON.stringify(profile)}`,
      },
    ],
  });
  await request("/api/v2/memory/flush", {
    session_id: sessionId,
    user_id: profile.userId,
  });
  return { sessionId };
}

export async function retrieveProfileFromEverOS(userId: string) {
  const response = await request<unknown>("/api/v2/memory/search", {
    user_id: userId,
    query: `${PROFILE_PREFIX} latest canonical immigration profile`,
    method: "hybrid",
    top_k: 10,
    include_original_data: true,
    filters: { session_id: { eq: `continuum-profile-${userId}` } },
  });
  const profile = findProfilePayload(response);
  if (!profile) {
    throw new Error("EverOS returned no valid canonical profile");
  }
  return profile;
}

export function isEverOSConfigured() {
  return Boolean(process.env.EVEROS_BASE_URL);
}
