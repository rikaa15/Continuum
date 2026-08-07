import { describe, expect, it } from "vitest";
import {
  hasExpectedFileSignature,
  redactDocumentAnalysis,
} from "@/lib/history/document-analysis";

describe("document analysis safety", () => {
  it("checks PDF and image signatures instead of trusting MIME type", () => {
    expect(
      hasExpectedFileSignature(
        new TextEncoder().encode("%PDF-1.7"),
        "application/pdf",
      ),
    ).toBe(true);
    expect(
      hasExpectedFileSignature(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        "image/jpeg",
      ),
    ).toBe(true);
    expect(
      hasExpectedFileSignature(
        new TextEncoder().encode("not a PDF"),
        "application/pdf",
      ),
    ).toBe(false);
  });

  it("removes common immigration identifiers from extracted text", () => {
    const redacted = redactDocumentAnalysis({
      documentSummary: "I-94 admission number 12345678901",
      assistantReply: "Receipt IOE1234567890 was visible.",
      needsFollowUp: false,
      followUpQuestion: null,
      factProposals: [],
      eventProposals: [
        {
          type: "entry_exit",
          title: "Admission record",
          details: "A-number A123456789",
          date: "2026-01-02",
          datePrecision: "exact",
          confidence: "confirmed",
        },
      ],
    });
    expect(JSON.stringify(redacted)).not.toContain("12345678901");
    expect(JSON.stringify(redacted)).not.toContain("IOE1234567890");
    expect(JSON.stringify(redacted)).not.toContain("A123456789");
  });
});
