import { NextResponse } from "next/server";
import { runHistoryInterview } from "@/lib/ai/history-interview";
import { historyInterviewRequestSchema } from "@/lib/history/interview";

export async function POST(request: Request) {
  try {
    const input = historyInterviewRequestSchema.parse(await request.json());
    const result = await runHistoryInterview(input);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "History interview failed",
      },
      { status: 400 },
    );
  }
}
