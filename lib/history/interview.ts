import { z } from "zod";
import {
  historyAreaSchema,
  maritalStatusSchema,
} from "@/lib/domain/profile";

export const proposedFactSchema = z.object({
  field: z.enum([
    "citizenshipCountries",
    "dateOfBirth",
    "countryOfBirth",
    "cityOfBirth",
    "maritalStatus",
    "dependentCount",
  ]),
  value: z.union([
    z.string().max(120),
    z.number().int().min(0).max(20),
    z.array(z.string().min(2).max(80)).min(1).max(4),
  ]),
  label: z.string().min(1).max(120),
});

export const proposedEventSchema = z.object({
  type: z.enum([
    "status",
    "entry_exit",
    "education",
    "employment",
    "petition",
    "notice",
    "family",
    "travel",
  ]),
  title: z.string().min(1).max(160),
  details: z.string().max(600),
  date: z.string().date().nullable(),
  datePrecision: z.enum(["exact", "month", "year", "unknown"]),
  confidence: z.enum(["confirmed", "approximate", "unknown"]),
});

export const historyInterviewRequestSchema = z.object({
  area: historyAreaSchema,
  message: z.string().trim().min(1).max(2500),
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2500),
      }),
    )
    .max(20)
    .default([]),
  context: z
    .object({
      currentStatus: z.string().max(40).nullable(),
      currentBasis: z.string().max(60).nullable(),
      citizenshipCountries: z.array(z.string().max(80)).max(4),
      reviewedFacts: z.record(
        z.string().min(1).max(60),
        z.union([
          z.string().max(160),
          z.number(),
          z.boolean(),
          z.array(z.string().max(80)).max(8),
        ]),
      ).default({}),
      existingEvent: z
        .object({
          id: z.string().min(1).max(120),
          type: proposedEventSchema.shape.type,
          title: z.string().min(1).max(160),
          details: z.string().max(600),
          date: z.string().date().nullable(),
          datePrecision: proposedEventSchema.shape.datePrecision,
          confidence: proposedEventSchema.shape.confidence,
        })
        .nullable()
        .default(null),
    })
    .strict(),
});

export const historyInterviewResponseSchema = z.object({
  assistantReply: z.string().min(1).max(700),
  needsFollowUp: z.boolean(),
  followUpQuestion: z.string().min(1).max(220).nullable(),
  factProposals: z.array(proposedFactSchema).max(6),
  eventProposals: z.array(proposedEventSchema).max(12),
});

export type HistoryInterviewRequest = z.infer<
  typeof historyInterviewRequestSchema
>;
export type HistoryInterviewResponse = z.infer<
  typeof historyInterviewResponseSchema
>;
export type ProposedFact = z.infer<typeof proposedFactSchema>;
export type ProposedEvent = z.infer<typeof proposedEventSchema>;

export function validateFactValue(proposal: ProposedFact) {
  switch (proposal.field) {
    case "citizenshipCountries":
      return z
        .array(z.string().trim().min(2).max(80))
        .min(1)
        .max(4)
        .parse(proposal.value);
    case "dateOfBirth":
      return z.string().date().parse(proposal.value);
    case "maritalStatus":
      return maritalStatusSchema.parse(proposal.value);
    case "dependentCount":
      return z.number().int().min(0).max(20).parse(proposal.value);
    case "countryOfBirth":
      return z.string().trim().min(2).max(80).parse(proposal.value);
    case "cityOfBirth":
      return z.string().trim().min(1).max(100).parse(proposal.value);
  }
}
