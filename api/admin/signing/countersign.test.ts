import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  correctedConsultantEmail,
  correctedSigningDocumentDetails,
  createAuditCertificate,
  createCountersignedPdf,
  locateDeepBridgeSignatureBlock,
} from "./countersign";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X1VnWQAAAABJRU5ErkJggg==",
  "base64",
);

describe("portal countersignature PDFs", () => {
  it("uses the genuine Version 1.1 source identity for Roland's signed documents", () => {
    expect(
      correctedSigningDocumentDetails(
        "Professional Consulting Services Framework Agreement",
        "1.2",
        "7f4e5866-6dee-4484-a3d1-2b3997414d34",
      ),
    ).toEqual({
      reference: "DBA-CFA-HSC-2026-001",
      sourceVersion: "1.1",
    });
    expect(
      correctedConsultantEmail(
        "Roland Schneider",
        "yonwallace@gmail.com",
        "3dd2a4ff-97e6-4ee2-8a3f-818c7183d2b2",
      ),
    ).toBe("roland.schneider@hs-con.de");
    expect(
      correctedConsultantEmail(
        "Another Consultant",
        "consultant@example.com",
        "00000000-0000-0000-0000-000000000000",
      ),
    ).toBe("consultant@example.com");
  });

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
    sourcePage.drawText("Signature:", {
      x: 62,
      y: 220,
      size: 9,
      font: sourceFont,
    });
    sourcePage.drawText("Date:", {
      x: 62,
      y: 195,
      size: 9,
      font: sourceFont,
    });
    const sourceBytes = await source.save();
    expect(await locateDeepBridgeSignatureBlock(sourceBytes)).toMatchObject({
      pageIndex: 0,
      signature: { x: 62, y: 220 },
      date: { x: 62, y: 195 },
    });
    const sourceHash = createHash("sha256")
      .update(sourceBytes)
      .digest("hex");
    const signedAt = new Date("2026-07-30T10:30:00.000Z");

    const countersigned = await createCountersignedPdf({
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
    const finalBytes = countersigned.bytes;
    expect(countersigned.signaturePlacement).toBe(
      "original_execution_block_and_appended_countersignature_record",
    );
    const finalDocument = await PDFDocument.load(finalBytes);
    expect(finalDocument.getPageCount()).toBe(2);
    expect(finalDocument.getTitle()).toBe(
      "Professional Consulting Services Framework Agreement - countersigned",
    );
    const { getDocument } = await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );
    const extracted = await getDocument({
      data: finalBytes.slice(),
      useSystemFonts: true,
    }).promise;
    const executionPage = await extracted.getPage(1);
    const executionText = await executionPage.getTextContent();
    const executionRecord = executionText.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(executionRecord).toContain("30 July 2026");
    expect(executionRecord).not.toContain("CORPORATE EXECUTION STAMP");
    const countersignaturePage = await extracted.getPage(2);
    const countersignatureText = await countersignaturePage.getTextContent();
    const countersignatureRecord = countersignatureText.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(countersignatureRecord).toContain("DEEPBRIDGE ADVISORY");
    expect(countersignatureRecord).toContain("CORPORATE EXECUTION STAMP");
    expect(countersignatureRecord).toContain("COUNTERSIGNED AT");
    expect(countersignatureRecord).not.toMatch(/(?:^|\s)SIGNED AT(?:$|\s)/);
    expect(countersignatureRecord).toContain("DUSTDEEP LTD");
    expect(countersignatureRecord).toContain("Company no. 16775578");
    expect(countersignatureRecord).toContain(
      "Kemp House, 152-160 City Road",
    );
    expect(countersignatureRecord).toContain(
      "London, United Kingdom, EC1V 2NX",
    );
    await extracted.destroy();

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
      signaturePlacement: countersigned.signaturePlacement,
    });
    const certificateDocument = await PDFDocument.load(certificateBytes);
    expect(certificateDocument.getPageCount()).toBe(1);
    expect(certificateDocument.getTitle()).toBe(
      "DeepBridge electronic signing audit certificate",
    );
  });

  it("uses the appended record when the source has no readable execution block", async () => {
    const source = await PDFDocument.create();
    const sourcePage = source.addPage([595.28, 841.89]);
    sourcePage.drawText("Scanned consultant-signed agreement", {
      x: 54,
      y: 760,
      size: 18,
    });
    const sourceBytes = await source.save();
    const sourceHash = createHash("sha256")
      .update(sourceBytes)
      .digest("hex");

    const countersigned = await createCountersignedPdf({
      sourceBytes,
      signatureBytes: transparentPng,
      title: "Professional Consulting Services Framework Agreement",
      versionLabel: "1.1",
      consultantName: "Test Consultant",
      consultantEmail: "consultant@example.com",
      signerName: "Yon Wallace",
      signerTitle: "Director, DeepBridge Advisory",
      signedAt: new Date("2026-07-30T10:30:00.000Z"),
      assignedDocumentId: "11111111-1111-4111-8111-111111111111",
      envelopeId: "22222222-2222-4222-8222-222222222222",
      sourceHash,
    });

    expect(countersigned.signaturePlacement).toBe(
      "appended_countersignature_record_only",
    );
    const finalDocument = await PDFDocument.load(countersigned.bytes);
    expect(finalDocument.getPageCount()).toBe(2);
  });

  it("places the signature in the controlled Charter template when text extraction is unavailable", async () => {
    const source = await PDFDocument.create();
    const sourcePage = source.addPage([595.304, 841.89]);
    sourcePage.drawText("Image-only acknowledgement execution page", {
      x: 54,
      y: 760,
      size: 18,
    });
    const sourceBytes = await source.save();
    const sourceHash = createHash("sha256")
      .update(sourceBytes)
      .digest("hex");

    const countersigned = await createCountersignedPdf({
      sourceBytes,
      signatureBytes: transparentPng,
      title: "Professional Consultant Charter Acknowledgement",
      versionLabel: "1.0",
      consultantName: "Test Consultant",
      consultantEmail: "consultant@example.com",
      signerName: "Yon Wallace",
      signerTitle: "Director, DeepBridge Advisory",
      signedAt: new Date("2026-07-31T16:11:48.376Z"),
      assignedDocumentId: "11111111-1111-4111-8111-111111111111",
      envelopeId: "22222222-2222-4222-8222-222222222222",
      sourceHash,
    });

    expect(countersigned.signaturePlacement).toBe(
      "original_execution_block_and_appended_countersignature_record",
    );
    const finalDocument = await PDFDocument.load(countersigned.bytes);
    expect(finalDocument.getPageCount()).toBe(2);
  });

  it("uses administrator-selected positions for the signature and date without stamping the source page", async () => {
    const source = await PDFDocument.create();
    const sourcePage = source.addPage([595.28, 841.89]);
    sourcePage.drawText("Manual placement page", { x: 54, y: 760, size: 18 });
    const sourceBytes = await source.save();

    const countersigned = await createCountersignedPdf({
      sourceBytes,
      signatureBytes: transparentPng,
      title: "Custom agreement",
      versionLabel: "1.0",
      consultantName: "Test Consultant",
      consultantEmail: "consultant@example.com",
      signerName: "Yon Wallace",
      signerTitle: "Director, DeepBridge Advisory",
      signedAt: new Date("2026-07-31T16:11:48.376Z"),
      assignedDocumentId: "11111111-1111-4111-8111-111111111111",
      envelopeId: "22222222-2222-4222-8222-222222222222",
      sourceHash: createHash("sha256").update(sourceBytes).digest("hex"),
      manualPlacement: {
        pageIndex: 0,
        signature: { x: 0.14, y: 0.58, size: 0.9 },
        date: { x: 0.14, y: 0.67, size: 0.85 },
      },
    });

    expect(countersigned.signaturePlacement).toBe(
      "original_execution_block_and_appended_countersignature_record",
    );
    const finalDocument = await PDFDocument.load(countersigned.bytes);
    expect(finalDocument.getPageCount()).toBe(2);
  });

  it("preserves contract source pages and appends only the countersignature record", async () => {
    const source = await PDFDocument.create();
    const sourcePage = source.addPage([595.28, 841.89]);
    sourcePage.drawText("Counterparty-signed partnership contract", {
      x: 54,
      y: 760,
      size: 18,
    });
    const sourceBytes = await source.save();

    const countersigned = await createCountersignedPdf({
      sourceBytes,
      signatureBytes: transparentPng,
      title: "Strategic Delivery Partner Statement of Work",
      versionLabel: "1.0",
      consultantName: "Jozef Lajda",
      consultantEmail: "signatory@example.com",
      signerName: "Yon Wallace",
      signerTitle: "Director",
      signedAt: new Date("2026-08-01T18:30:00.000Z"),
      assignedDocumentId: "11111111-1111-4111-8111-111111111111",
      envelopeId: "22222222-2222-4222-8222-222222222222",
      sourceHash: createHash("sha256").update(sourceBytes).digest("hex"),
      preserveSourcePages: true,
      sourceReference: "SNC-CLIENT-DBA002",
      counterpartyLabel: "Counterparty",
      signedSourceLabel: "Counterparty-signed source SHA-256",
    });

    expect(countersigned.signaturePlacement).toBe(
      "appended_countersignature_record_only",
    );
    const finalDocument = await PDFDocument.load(countersigned.bytes);
    expect(finalDocument.getPageCount()).toBe(2);
  });
});
