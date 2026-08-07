import "server-only";

import OpenAI from "openai";
import type { ImmigrationProfile } from "@/lib/domain/profile";
import type { DecisionResult, RuleFixture } from "@/lib/domain/rules";

export type TokenUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  measured: boolean;
};

export type ExplanationRun = {
  explanation: string;
  optimizedUsage: TokenUsage;
  baselineUsage: TokenUsage;
};

function templateExplanation(result: DecisionResult) {
  if (result.decision === "affected") {
    return `This check applies based on the confirmed facts shown below. ${result.recommendedAction}`;
  }
  if (result.decision === "not_affected") {
    return `This alert does not apply based on a confirmed exclusion in your current profile. ${result.recommendedAction}`;
  }
  return `Continuum needs one or more facts before it can reach a conclusion. ${result.recommendedAction}`;
}

function assertGrounded(text: string, payload: string) {
  const mentionedForms = text.match(/\b(?:I|ETA)-\d{3,4}[A-Z]?\b/g) ?? [];
  const unsupportedForm = mentionedForms.find((form) => !payload.includes(form));
  const mentionedDates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  const unsupportedDate = mentionedDates.find((date) => !payload.includes(date));
  if (unsupportedForm || unsupportedDate) {
    throw new Error("Explanation added an unsupported form or date");
  }
  return text;
}

async function callModel(payload: object, model: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const serialized = JSON.stringify(payload);
  const response = await client.responses.create({
    model,
    temperature: 0,
    max_output_tokens: 140,
    input: [
      {
        role: "system",
        content:
          "Explain the supplied deterministic immigration-planning result in 2 calm sentences. Use only supplied facts. Do not add dates, forms, eligibility claims, or legal conclusions. Do not say this is legal advice.",
      },
      { role: "user", content: serialized },
    ],
  });
  return {
    explanation: assertGrounded(response.output_text.trim(), serialized),
    usage: {
      model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      measured: true,
    },
  };
}

export async function explainDecision(
  result: DecisionResult,
  rule: RuleFixture,
  profile: ImmigrationProfile,
): Promise<ExplanationRun> {
  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const fallback = templateExplanation(result);
  if (!process.env.OPENAI_API_KEY) {
    const selectedLength = JSON.stringify({ result, rule }).length;
    const baselineLength = JSON.stringify({ result, rule, profile }).length;
    return {
      explanation: fallback,
      optimizedUsage: {
        model,
        inputTokens: Math.ceil(selectedLength / 4),
        outputTokens: Math.ceil(fallback.length / 4),
        measured: false,
      },
      baselineUsage: {
        model,
        inputTokens: Math.ceil(baselineLength / 4),
        outputTokens: Math.ceil(fallback.length / 4),
        measured: false,
      },
    };
  }

  try {
    const [optimized, baseline] = await Promise.all([
      callModel({ result, rule: { title: rule.title, summary: rule.summary } }, model),
      callModel({ result, rule, fullProfile: profile }, model),
    ]);
    return {
      explanation: optimized.explanation,
      optimizedUsage: optimized.usage,
      baselineUsage: baseline.usage,
    };
  } catch {
    return {
      explanation: fallback,
      optimizedUsage: { model, inputTokens: 0, outputTokens: 0, measured: false },
      baselineUsage: { model, inputTokens: 0, outputTokens: 0, measured: false },
    };
  }
}
