import type { ImmigrationProfile } from "@/lib/domain/profile";

export type ProfileFreshness = "remote_newer" | "local_newer" | "same";

export function compareProfileFreshness(
  localProfile: ImmigrationProfile,
  remoteProfile: ImmigrationProfile,
): ProfileFreshness {
  if (localProfile.userId !== remoteProfile.userId) {
    throw new Error("Cannot reconcile profiles for different users");
  }
  const localTime = Date.parse(localProfile.updatedAt);
  const remoteTime = Date.parse(remoteProfile.updatedAt);
  if (remoteTime > localTime) return "remote_newer";
  if (remoteTime < localTime) return "local_newer";
  if (remoteProfile.profileVersion > localProfile.profileVersion)
    return "remote_newer";
  if (remoteProfile.profileVersion < localProfile.profileVersion)
    return "local_newer";
  return "same";
}
