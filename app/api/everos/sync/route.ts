import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/domain/profile";
import {
  isEverOSConfigured,
  saveProfileToEverOS,
} from "@/lib/everos/client";

export async function POST(request: NextRequest) {
  if (!isEverOSConfigured()) {
    return NextResponse.json(
      { ok: false, error: "EverOS is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const profile = profileSchema.parse(body.profile);
    await saveProfileToEverOS(profile);
    return NextResponse.json({ ok: true, source: "everos" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "EverOS sync failed",
      },
      { status: 400 },
    );
  }
}
