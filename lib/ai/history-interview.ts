import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import {
  historyInterviewResponseSchema,
  validateFactValue,
  type HistoryInterviewRequest,
  type HistoryInterviewResponse,
} from "@/lib/history/interview";

function fallbackResponse(): HistoryInterviewResponse {
  return {
    assistantReply:
      "I couldn’t safely turn that answer into a clean timeline yet. Please try again, or break it into a few shorter messages with dates when you know them.",
    needsFollowUp: true,
    followUpQuestion:
      "What is the single most important event you want to add first?",
    factProposals: [],
    eventProposals: [],
  };
}

function removePlaceholderFacts(
  result: HistoryInterviewResponse,
  input: HistoryInterviewRequest,
) {
  const placeholders = new Set([
    "unknown",
    "not provided",
    "not stated",
    "n/a",
  ]);
  return {
    ...result,
    factProposals: result.factProposals.filter((proposal) => {
      try {
        validateFactValue(proposal);
      } catch {
        return false;
      }
      const values = Array.isArray(proposal.value)
        ? proposal.value
        : [proposal.value];
      const isPlaceholder = values.some(
        (value) =>
          typeof value === "string" &&
          placeholders.has(value.trim().toLowerCase()),
      );
      const repeatsKnownCitizenship =
        proposal.field === "citizenshipCountries" &&
        Array.isArray(proposal.value) &&
        proposal.value.length === input.context.citizenshipCountries.length &&
        proposal.value.every((country) =>
          input.context.citizenshipCountries.some(
            (knownCountry) =>
              knownCountry.toLowerCase() === country.toLowerCase(),
          ),
        );
      return !isPlaceholder && !repeatsKnownCitizenship;
    }),
  };
}

export async function runHistoryInterview(
  input: HistoryInterviewRequest,
): Promise<HistoryInterviewResponse> {
  if (!process.env.OPENAI_API_KEY) return fallbackResponse();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  try {
    const response = await client.responses.create({
      model,
      max_output_tokens: 3000,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "history_interview_response",
          strict: true,
          schema: z.toJSONSchema(historyInterviewResponseSchema),
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a careful immigration-history interviewer, not a legal adviser. Build a clean, cumulative timeline from the full conversation. If minimalKnownContext.existingEvent is present, the user is editing that saved event: use it as context, incorporate the user's corrections, and return the complete replacement event or events rather than only the changed fragment. minimalKnownContext.reviewedFacts contains confirmed answers already collected in intake. Treat those questions as answered: do not ask for marital status, dependents, citizenship, current status, or any other reviewed fact again unless the user says it changed or contradicts it. Other minimalKnownContext fields are background only: do not repeat them as new fact proposals unless the user explicitly corrects them in the conversation. Extract only facts the user explicitly stated; never infer eligibility, lawful status, grace-period eligibility, nationality, dates, form numbers, or outcomes. Never create a fact proposal whose value is 'unknown', 'not provided', or another placeholder; ask about it instead. Correct spelling and casing. Split a long narrative into separate concise events for each entry, school/program, SEVIS transfer, status change, work authorization period, employment change, petition, notice, and departure. Titles must be polished factual summaries, not copied paragraphs; details should be concise and must never repeat the entire raw answer. Preserve the user's tense: an authorization that will expire has not expired yet. Preserve uncertainty with approximate or unknown confidence. Use null and unknown date precision when no date was stated. Never turn a user's expected grace period into a confirmed legal conclusion or invent labels such as 'F-1 worker grace period'; call it a user-reported or expected post-employment grace-period window. Return cumulative proposals reflecting all user messages in this conversation, replacing earlier rough wording with cleaner wording. Put the conversational summary in assistantReply. When clarification is useful, followUpQuestion must ask one short question about one fact only. Never use a numbered list, never combine several dates or topics in one question, and accept that the user may answer 'I don't know'. Ask the next unresolved question on the following turn. Otherwise use null. needsFollowUp must be true exactly when followUpQuestion is not null. The user must review every proposal before it is saved.",
        },
        {
          role: "user",
          content: JSON.stringify({
            selectedArea: input.area,
            currentDate: new Date().toISOString().slice(0, 10),
            minimalKnownContext: input.context,
            conversation: input.conversation,
            latestUserMessage: input.message,
          }),
        },
      ],
    });

    if (!response.output_text.trim()) {
      throw new Error(
        `Model returned no structured text (${response.status ?? "unknown status"})`,
      );
    }
    const parsed = historyInterviewResponseSchema.parse(
      JSON.parse(response.output_text),
    );
    if (parsed.needsFollowUp !== Boolean(parsed.followUpQuestion)) {
      throw new Error("Model returned an inconsistent follow-up state");
    }
    return removePlaceholderFacts(parsed, input);
  } catch (error) {
    console.error(
      "History interview extraction failed:",
      error instanceof Error ? error.message : error,
    );
    return fallbackResponse();
  }
}
