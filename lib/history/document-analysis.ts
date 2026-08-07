import { z } from "zod";
import { historyInterviewResponseSchema } from "@/lib/history/interview";

export const acceptedDocumentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const documentAnalysisResultSchema =
  historyInterviewResponseSchema.extend({
    documentSummary: z.string().min(1).max(500),
  });

export type DocumentAnalysisResult = z.infer<
  typeof documentAnalysisResultSchema
>;

export function isAcceptedDocumentType(
  value: string,
): value is (typeof acceptedDocumentTypes)[number] {
  return acceptedDocumentTypes.includes(
    value as (typeof acceptedDocumentTypes)[number],
  );
}

export function hasExpectedFileSignature(
  bytes: Uint8Array,
  mimeType: (typeof acceptedDocumentTypes)[number],
) {
  if (mimeType === "application/pdf") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "%PDF";
  }
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function redactIdentifiers(value: string) {
  return value
    .replace(/\b[A-Z]{3}\d{10}\b/g, "[redacted receipt number]")
    .replace(/\bA[- ]?\d{8,9}\b/gi, "[redacted A-number]")
    .replace(/\b\d{11}\b/g, "[redacted admission number]");
}

export function redactDocumentAnalysis(
  result: DocumentAnalysisResult,
): DocumentAnalysisResult {
  return {
    ...result,
    documentSummary: redactIdentifiers(result.documentSummary),
    assistantReply: redactIdentifiers(result.assistantReply),
    followUpQuestion: result.followUpQuestion
      ? redactIdentifiers(result.followUpQuestion)
      : null,
    factProposals: result.factProposals.map((proposal) => ({
      ...proposal,
      label: redactIdentifiers(proposal.label),
      value:
        typeof proposal.value === "string"
          ? redactIdentifiers(proposal.value)
          : Array.isArray(proposal.value)
            ? proposal.value.map(redactIdentifiers)
            : proposal.value,
    })),
    eventProposals: result.eventProposals.map((event) => ({
      ...event,
      title: redactIdentifiers(event.title),
      details: redactIdentifiers(event.details),
    })),
  };
}
