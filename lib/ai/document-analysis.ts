import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import {
  documentAnalysisResultSchema,
  redactDocumentAnalysis,
  type DocumentAnalysisResult,
} from "@/lib/history/document-analysis";
import type { HistoryAreaId } from "@/lib/profile/completeness";

type AnalyzeDocumentInput = {
  filename: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  bytes: Uint8Array;
  category: HistoryAreaId;
  currentStatus: string | null;
};

export async function analyzeHistoryDocument(
  input: AnalyzeDocumentInput,
): Promise<DocumentAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Document analysis is not configured");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const dataUrl = `data:${input.mimeType};base64,${Buffer.from(input.bytes).toString("base64")}`;
  const documentContent =
    input.mimeType === "application/pdf"
      ? {
          type: "input_file" as const,
          filename: input.filename,
          file_data: dataUrl,
          detail: "high" as const,
        }
      : {
          type: "input_image" as const,
          image_url: dataUrl,
          detail: "high" as const,
        };

  const response = await client.responses.create({
    model,
    max_output_tokens: 3000,
    reasoning: { effort: "low" },
    text: {
      format: {
        type: "json_schema",
        name: "immigration_document_analysis",
        strict: true,
        schema: z.toJSONSchema(documentAnalysisResultSchema),
      },
    },
    input: [
      {
        role: "system",
        content:
          "Analyze the supplied immigration document as evidence intake, not legal advice. Extract only text and dates visibly supported by the document. Never infer lawful status, eligibility, grace periods, or outcomes. For I-94 records, create separate entry_exit events for documented admissions and use the admission date as the event date; include class of admission and admit-until date in concise details when visible. For visas, notices, EADs, I-20s, and receipts, identify the document and supported dates without treating a visa expiration date as a status expiration date. Do not include passport numbers, admission numbers, A-numbers, receipt numbers, addresses, barcodes, or other unique identifiers in summaries or proposals. Use documentSummary for a short description with no unique identifiers. Ask one short follow-up only when a critical field is unreadable or ambiguous. All extracted facts are proposals requiring user confirmation.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              historyArea: input.category,
              currentStatusContext: input.currentStatus,
              instruction:
                "Return clean structured proposals supported by this document.",
            }),
          },
          documentContent,
        ],
      },
    ],
  });

  if (!response.output_text.trim()) {
    throw new Error("The document produced no readable structured output");
  }
  const parsed = documentAnalysisResultSchema.parse(
    JSON.parse(response.output_text),
  );
  if (parsed.needsFollowUp !== Boolean(parsed.followUpQuestion)) {
    throw new Error("Document analysis returned an inconsistent follow-up");
  }
  return redactDocumentAnalysis(parsed);
}
