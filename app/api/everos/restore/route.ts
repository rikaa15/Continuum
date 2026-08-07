import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/domain/profile";
import {
  isEverOSConfigured,
  retrieveProfileFromEverOS,
} from "@/lib/everos/client";
import { compareProfileFreshness } from "@/lib/everos/reconcile";

export async function POST(request: Request) {
  if (!isEverOSConfigured()) {
    return NextResponse.json(
      { ok: false, error: "EverOS is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const localProfile = profileSchema.parse(body.localProfile);
    const remoteProfile = await retrieveProfileFromEverOS(localProfile.userId);
    if (remoteProfile.userId !== localProfile.userId) {
      throw new Error("EverOS returned a profile for a different user");
    }

    const relation = compareProfileFreshness(localProfile, remoteProfile);

    return NextResponse.json({
      ok: true,
      relation,
      remoteProfile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "EverOS restore failed",
      },
      { status: 400 },
    );
  }
}
