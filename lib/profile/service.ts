import "server-only";

import { cookies } from "next/headers";
import { demoPersonas, personaA } from "@/lib/demo/personas";
import { profileSchema, type ImmigrationProfile } from "@/lib/domain/profile";
import {
  isEverOSConfigured,
  retrieveProfileFromEverOS,
  saveProfileToEverOS,
} from "@/lib/everos/client";

export type ProfileLoadResult = {
  profile: ImmigrationProfile;
  source: "everos" | "demo-fallback";
  message?: string;
};

export async function getActiveUserId() {
  const store = await cookies();
  return store.get("continuum-user")?.value ?? personaA.userId;
}

export async function setActiveUserId(userId: string) {
  const store = await cookies();
  store.set("continuum-user", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setSessionProfile(profile: ImmigrationProfile) {
  const store = await cookies();
  store.set("continuum-demo-profile", JSON.stringify(profile), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function getProfile(userId?: string): Promise<ProfileLoadResult> {
  const activeUserId = userId ?? (await getActiveUserId());
  if (isEverOSConfigured()) {
    try {
      return {
        profile: await retrieveProfileFromEverOS(activeUserId),
        source: "everos",
      };
    } catch (error) {
      return {
        profile: demoPersonas[activeUserId] ?? personaA,
        source: "demo-fallback",
        message:
          error instanceof Error ? error.message : "EverOS retrieval failed",
      };
    }
  }
  const store = await cookies();
  const value = store.get("continuum-demo-profile")?.value;
  if (value) {
    const parsed = profileSchema.safeParse(JSON.parse(value));
    if (parsed.success && parsed.data.userId === activeUserId) {
      return {
        profile: parsed.data,
        source: "demo-fallback",
        message: "Session profile is active; EverOS is not configured.",
      };
    }
  }
  return {
    profile: demoPersonas[activeUserId] ?? personaA,
    source: "demo-fallback",
    message: "EverOS is not configured; synthetic demo data is active.",
  };
}

export async function persistProfile(input: ImmigrationProfile) {
  const profile = profileSchema.parse(input);
  await setSessionProfile(profile);
  if (!isEverOSConfigured()) {
    return {
      profile,
      source: "demo-fallback" as const,
      message: "Profile validated locally. Configure EverOS to persist it.",
    };
  }
  await saveProfileToEverOS(profile);
  return { profile, source: "everos" as const };
}
