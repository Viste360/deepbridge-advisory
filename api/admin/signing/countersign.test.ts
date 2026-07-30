import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  createAuditCertificate,
  createCountersignedPdf,
} from "./countersign";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X1VnWQAAAABJRU5ErkJggg==",
  "base64",
);

describe("portal countersignature PDFs", () => {
  it("appends a branded countersignature page and creates an audit certificate", async () => {
    const source = await PDFDocument.create();
    const sourceFont = await source.embedFont(StandardFonts.Helvetica);
    const sourcePage = source.addPage([595.28, 841.89]);
    sourcePage.drawText("Consultant-signed agreement", {
      x: 54,
      y: 760,
      size: 18,
      font: sourceFont,
    });
    const sourceBytes = await source.save();
    const sourceHash = createHash("sha256")
      .update(sourceBytes)
      .digest("hex");
    const signedAt = new Date("2026-07-30T10:30:00.000Z");

    const finalBytes = await createCountersignedPdf({
      sourceBytes,
      signatureBytes: transparentPng,
      title: "Professional Consulting Services Framework Agreement",
      versionLabel: "1.1",
      consultantName: "Test Consultant",
      consultantEmail: "consultant@example.com",
      signerName: "Yon Wallace",
      signerTitle: "Director, DeepBridge Advisory",
      signedAt,
      assignedDocumentId: "11111111-1111-4111-8111-111111111111",
      envelopeId: "22222222-2222-4222-8222-222222222222",
      sourceHash,
    });
    const finalDocument = await PDFDocument.load(finalBytes);
    expect(finalDocument.getPageCount()).toBe(2);
    expect(finalDocument.getTitle()).toBe(
      "Professional Consulting Services Framework Agreement - countersigned",
    );

    const finalHash = createHash("sha256").update(finalBytes).digest("hex");
    const certificateBytes = await createAuditCertificate({
      title: "Professional Consulting Services Framework Agreement",
      versionLabel: "1.1",
      consultantName: "Test Consultant",
      consultantEmail: "consultant@example.com",
      signerName: "Yon Wallace",
      signerTitle: "Director, DeepBridge Advisory",
      signedAt,
      assignedDocumentId: "11111111-1111-4111-8111-111111111111",
      envelopeId: "22222222-2222-4222-8222-222222222222",
      sourceHash,
      finalHash,
    });
    const certificateDocument = await PDFDocument.load(certificateBytes);
    expect(certificateDocument.getPageCount()).toBe(1);
    expect(certificateDocument.getTitle()).toBe(
      "DeepBridge electronic signing audit certificate",
    );
  });
});
