"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cloneProfileForUserInput,
  demoPersonas,
  personaA,
} from "@/lib/demo/personas";
import {
  currentStatusSchema,
  f1StageSchema,
  known,
  unknown,
  type ImmigrationProfile,
} from "@/lib/domain/profile";
import {
  getProfile,
  persistProfile,
  setActiveUserId,
} from "@/lib/profile/service";

export async function switchPersona(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!demoPersonas[userId]) return;
  await setActiveUserId(userId);
  revalidatePath("/", "layout");
  redirect("/runway");
}

export async function saveFastStart(formData: FormData) {
  const currentStatus = currentStatusSchema.parse(
    String(formData.get("currentStatus") ?? "F1"),
  );
  const f1Stage =
    currentStatus === "F1"
      ? f1StageSchema.parse(String(formData.get("f1Stage") ?? "ENROLLED"))
      : "NOT_APPLICABLE";
  const goal = String(formData.get("immediateGoal") ?? "MAINTAIN_STATUS") as
    | "MAINTAIN_STATUS"
    | "STEM_EXTENSION"
    | "H1B_TRANSITION"
    | "EB2_NIW";
  const now = new Date().toISOString();
  const profile: ImmigrationProfile = {
    ...cloneProfileForUserInput(personaA),
    userId: "demo-custom",
    displayName: String(formData.get("displayName") || "Demo user"),
    profileVersion: 1,
    updatedAt: now,
    currentStatus: known(currentStatus, "user"),
    f1Stage: known(f1Stage, "user"),
    validUntil: known(String(formData.get("validUntil")), "user"),
    immediateGoal: known(goal, "user"),
    employerType: known(
      currentStatus === "H1B"
        ? (String(formData.get("employerType")) as
            | "CAP_SUBJECT"
            | "CAP_EXEMPT")
        : "NOT_APPLICABLE",
      "user",
    ),
    employerEVerify:
      formData.get("employerEVerify") === "unknown"
        ? unknown("Employer enrollment has not been confirmed")
        : known(formData.get("employerEVerify") === "yes", "user"),
    plannedTravel: known(formData.get("plannedTravel") === "yes", "user"),
    nextKnownDeadline: known(
      String(formData.get("nextKnownDeadline")),
      "user",
    ),
    historyCompleteness: "incomplete",
  };
  await persistProfile(profile);
  await setActiveUserId(profile.userId);
  revalidatePath("/", "layout");
  redirect("/runway");
}

export async function markEmployerUnknown() {
  const { profile } = await getProfile();
  const updated: ImmigrationProfile = {
    ...profile,
    profileVersion: profile.profileVersion + 1,
    updatedAt: new Date().toISOString(),
    employerEVerify: unknown("Employer enrollment has not been confirmed"),
    historyCompleteness: "needs_review",
  };
  await persistProfile(updated);
  revalidatePath("/", "layout");
  redirect(`/alerts/stem-opt-employer-check-2026?review=1`);
}
