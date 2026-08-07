import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { explainDecision } from "@/lib/ai/explain";
import { profileSchema } from "@/lib/domain/profile";
import { decisionResultSchema } from "@/lib/domain/rules";
import { getMonitoringRule } from "@/lib/rules/fixtures/monitoring";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = profileSchema.parse(body.profile);
    const result = decisionResultSchema.parse(body.result);
    const rule = getMonitoringRule(result.ruleId);
    if (!rule || rule.version !== result.ruleVersion) {
      throw new Error("Unknown or mismatched monitoring rule");
    }
    const explanation = await explainDecision(result, rule, profile);
    return NextResponse.json({
      ok: true,
      explanation: explanation.explanation,
      optimizedUsage: explanation.optimizedUsage,
      baselineUsage: explanation.baselineUsage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Explanation failed",
      },
      { status: 400 },
    );
  }
}
