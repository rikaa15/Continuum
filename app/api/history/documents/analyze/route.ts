import { NextResponse } from "next/server";
import { analyzeHistoryDocument } from "@/lib/ai/document-analysis";
import { historyAreaSchema } from "@/lib/domain/profile";
import {
  hasExpectedFileSignature,
  isAcceptedDocumentType,
  MAX_DOCUMENT_BYTES,
} from "@/lib/history/document-analysis";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("A document file is required");
    }
    if (!isAcceptedDocumentType(file.type)) {
      throw new Error("Only PDF, JPEG, and PNG documents are supported");
    }
    if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
      throw new Error("Documents must be between 1 byte and 10 MB");
    }

    const category = historyAreaSchema.parse(formData.get("category"));
    const currentStatusValue = formData.get("currentStatus");
    const currentStatus =
      typeof currentStatusValue === "string" && currentStatusValue
        ? currentStatusValue.slice(0, 40)
        : null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasExpectedFileSignature(bytes, file.type)) {
      throw new Error("The file contents do not match its declared type");
    }

    const result = await analyzeHistoryDocument({
      filename: file.name.slice(0, 180),
      mimeType: file.type,
      bytes,
      category,
      currentStatus,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Document analysis failed",
      },
      { status: 400 },
    );
  }
}
