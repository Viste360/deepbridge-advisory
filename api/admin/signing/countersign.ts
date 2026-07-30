import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  PDFDocument,
  PDFName,
  type PDFPage,
  PDFSignature,
  StandardFonts,
  type PDFFont,
  rgb,
} from "pdf-lib";
import {
  enforceRateLimit,
  getSupabaseAdmin,
  handleApiError,
  json,
  PortalHttpError,
  readJsonBody,
  requestContext,
  requirePortalUser,
} from "../../_lib/server.js";
import { requestMalwareScan } from "../../_lib/scanner.js";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

function normalisedIdentity(value: string) {
  return value.toLocaleLowerCase("en-GB").replace(/\s+/g, " ").trim();
}

function sha256(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeSignature(value: unknown) {
  if (typeof value !== "string" || value.length > 90_000)
    throw new PortalHttpError(400, "The signature preview is invalid.");
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match)
    throw new PortalHttpError(400, "The signature preview must be a PNG image.");
  const bytes = Buffer.from(match[1], "base64");
  if (
    bytes.length < 100 ||
    bytes.length > 65_000 ||
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
  ) {
    throw new PortalHttpError(400, "The signature preview is invalid.");
  }
  return bytes;
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  options: {
    x: number;
    y: number;
    size: number;
    width: number;
    lineHeight: number;
    color: ReturnType<typeof rgb>;
  },
) {
  const lines = wrapText(text, font, options.size, options.width);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font,
      color: options.color,
    });
  });
  return options.y - lines.length * options.lineHeight;
}

function drawKeyValue(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  key: string,
  value: string,
  y: number,
) {
  page.drawText(key.toUpperCase(), {
    x: 54,
    y,
    size: 8,
    font: fonts.bold,
    color: rgb(0.35, 0.42, 0.43),
  });
  page.drawText(value, {
    x: 190,
    y: y - 1,
    size: 9,
    font: fonts.regular,
    color: rgb(0.04, 0.12, 0.15),
  });
}

export async function createCountersignedPdf(input: {
  sourceBytes: Uint8Array;
  signatureBytes: Uint8Array;
  title: string;
  versionLabel: string;
  consultantName: string;
  consultantEmail: string;
  signerName: string;
  signerTitle: string;
  signedAt: Date;
  assignedDocumentId: string;
  envelopeId: string;
  sourceHash: string;
}) {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(input.sourceBytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch {
    throw new PortalHttpError(
      400,
      "The consultant-signed PDF could not be opened. Download an unencrypted PDF and try again.",
    );
  }
  const hasAcroForm = Boolean(pdf.catalog.get(PDFName.of("AcroForm")));
  if (
    hasAcroForm &&
    pdf.getForm().getFields().some((field) => field instanceof PDFSignature)
  ) {
    throw new PortalHttpError(
      409,
      "This PDF contains a certificate-based digital signature. Countersign it in Google Workspace to preserve that certificate, then upload the completed pack.",
    );
  }
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signature = await pdf.embedPng(input.signatureBytes);
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(0.03, 0.11, 0.15);
  const teal = rgb(0.19, 0.7, 0.66);
  const muted = rgb(0.36, 0.43, 0.44);

  page.drawRectangle({
    x: 0,
    y: 710,
    width: 595.28,
    height: 131.89,
    color: ink,
  });
  page.drawText("D / B", {
    x: 54,
    y: 786,
    size: 23,
    font: bold,
    color: teal,
  });
  page.drawText("DEEPBRIDGE ADVISORY", {
    x: 54,
    y: 753,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("ELECTRONIC COUNTERSIGNATURE RECORD", {
    x: 54,
    y: 731,
    size: 8,
    font: bold,
    color: rgb(0.68, 0.83, 0.82),
  });

  page.drawText("Signed for DeepBridge", {
    x: 54,
    y: 657,
    size: 25,
    font: bold,
    color: ink,
  });
  const afterTitle = drawWrappedText(page, input.title, bold, {
    x: 54,
    y: 622,
    size: 13,
    width: 487,
    lineHeight: 17,
    color: rgb(0.12, 0.28, 0.31),
  });
  page.drawText(`Version ${input.versionLabel}`, {
    x: 54,
    y: afterTitle - 2,
    size: 9,
    font: regular,
    color: muted,
  });

  page.drawRectangle({
    x: 54,
    y: 354,
    width: 487,
    height: 185,
    borderWidth: 1,
    borderColor: rgb(0.72, 0.8, 0.78),
    color: rgb(0.96, 0.98, 0.97),
  });
  page.drawText(
    "I have reviewed the complete consultant-signed agreement and, being authorised to sign for DeepBridge Advisory, intend this electronic signature to bind DeepBridge to this document.",
    {
      x: 76,
      y: 505,
      size: 9,
      font: regular,
      color: muted,
      maxWidth: 443,
      lineHeight: 13,
    },
  );
  const signatureRatio = signature.width / signature.height;
  const signatureHeight = 68;
  const signatureWidth = Math.min(330, signatureHeight * signatureRatio);
  page.drawImage(signature, {
    x: 76,
    y: 401,
    width: signatureWidth,
    height: signatureHeight,
  });
  page.drawLine({
    start: { x: 76, y: 396 },
    end: { x: 390, y: 396 },
    thickness: 0.8,
    color: rgb(0.45, 0.55, 0.54),
  });
  page.drawText(input.signerName, {
    x: 76,
    y: 378,
    size: 10,
    font: bold,
    color: ink,
  });
  page.drawText(input.signerTitle, {
    x: 76,
    y: 364,
    size: 8.5,
    font: regular,
    color: muted,
  });

  const signedAt = input.signedAt.toISOString();
  drawKeyValue(
    page,
    { regular, bold },
    "Signed at",
    `${signedAt} (UTC)`,
    319,
  );
  drawKeyValue(
    page,
    { regular, bold },
    "Consultant",
    `${input.consultantName} (${input.consultantEmail})`,
    294,
  );
  drawKeyValue(
    page,
    { regular, bold },
    "Document record",
    input.assignedDocumentId,
    269,
  );
  drawKeyValue(
    page,
    { regular, bold },
    "Envelope record",
    input.envelopeId,
    244,
  );

  page.drawText("CONSULTANT-SIGNED SOURCE SHA-256", {
    x: 54,
    y: 197,
    size: 8,
    font: bold,
    color: muted,
  });
  page.drawText(input.sourceHash, {
    x: 54,
    y: 178,
    size: 7.2,
    font: regular,
    color: ink,
  });
  page.drawRectangle({
    x: 54,
    y: 107,
    width: 487,
    height: 42,
    color: rgb(0.88, 0.95, 0.93),
  });
  page.drawText(
    "This page forms part of the countersigned agreement. The accompanying audit certificate records the final document hash and authenticated portal event.",
    {
      x: 68,
      y: 130,
      size: 8,
      font: regular,
      color: rgb(0.14, 0.32, 0.31),
      maxWidth: 459,
      lineHeight: 11,
    },
  );
  page.drawText(
    `Page ${pdf.getPageCount()} of ${pdf.getPageCount()} - DeepBridge electronic countersignature`,
    {
      x: 54,
      y: 55,
      size: 7,
      font: regular,
      color: muted,
    },
  );

  pdf.setTitle(`${input.title} - countersigned`);
  pdf.setAuthor("DeepBridge Advisory");
  pdf.setSubject("Electronic countersignature record");
  pdf.setModificationDate(input.signedAt);
  return pdf.save({ useObjectStreams: true });
}

export async function createAuditCertificate(input: {
  title: string;
  versionLabel: string;
  consultantName: string;
  consultantEmail: string;
  signerName: string;
  signerTitle: string;
  signedAt: Date;
  assignedDocumentId: string;
  envelopeId: string;
  sourceHash: string;
  finalHash: string;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(0.03, 0.11, 0.15);
  const muted = rgb(0.36, 0.43, 0.44);
  const teal = rgb(0.19, 0.7, 0.66);

  page.drawRectangle({
    x: 0,
    y: 704,
    width: 595.28,
    height: 137.89,
    color: ink,
  });
  page.drawText("DEEPBRIDGE ADVISORY", {
    x: 54,
    y: 782,
    size: 11,
    font: bold,
    color: teal,
  });
  page.drawText("Electronic signing audit certificate", {
    x: 54,
    y: 742,
    size: 25,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Portal-generated evidence record", {
    x: 54,
    y: 720,
    size: 9,
    font: regular,
    color: rgb(0.68, 0.83, 0.82),
  });

  const afterTitle = drawWrappedText(page, input.title, bold, {
    x: 54,
    y: 650,
    size: 16,
    width: 487,
    lineHeight: 20,
    color: ink,
  });
  page.drawText(`Version ${input.versionLabel}`, {
    x: 54,
    y: afterTitle - 3,
    size: 9,
    font: regular,
    color: muted,
  });

  const signedAt = input.signedAt.toISOString();
  let y = afterTitle - 48;
  const values: Array<[string, string]> = [
    ["Consultant", `${input.consultantName} (${input.consultantEmail})`],
    ["DeepBridge signatory", input.signerName],
    ["Signing authority", input.signerTitle],
    ["Signed at", `${signedAt} (UTC)`],
    ["Signature method", "Authenticated portal electronic signature"],
    ["Assigned document ID", input.assignedDocumentId],
    ["Signature envelope ID", input.envelopeId],
  ];
  for (const [key, value] of values) {
    drawKeyValue(page, { regular, bold }, key, value, y);
    y -= 31;
  }

  page.drawText("CONSULTANT-SIGNED SOURCE SHA-256", {
    x: 54,
    y: 326,
    size: 8,
    font: bold,
    color: muted,
  });
  page.drawText(input.sourceHash.slice(0, 32), {
    x: 54,
    y: 307,
    size: 8,
    font: regular,
    color: ink,
  });
  page.drawText(input.sourceHash.slice(32), {
    x: 54,
    y: 293,
    size: 8,
    font: regular,
    color: ink,
  });
  page.drawText("FINAL COUNTERSIGNED PDF SHA-256", {
    x: 54,
    y: 252,
    size: 8,
    font: bold,
    color: muted,
  });
  page.drawText(input.finalHash.slice(0, 32), {
    x: 54,
    y: 233,
    size: 8,
    font: regular,
    color: ink,
  });
  page.drawText(input.finalHash.slice(32), {
    x: 54,
    y: 219,
    size: 8,
    font: regular,
    color: ink,
  });

  page.drawRectangle({
    x: 54,
    y: 109,
    width: 487,
    height: 70,
    color: rgb(0.88, 0.95, 0.93),
  });
  page.drawText(
    "The administrator authenticated to the private DeepBridge portal and confirmed both signing authority and intent. The portal appended the countersignature record to the reviewed PDF. Both artifacts are released only after malware scanning.",
    {
      x: 68,
      y: 154,
      size: 8,
      font: regular,
      color: rgb(0.14, 0.32, 0.31),
      maxWidth: 459,
      lineHeight: 11,
    },
  );
  page.drawText("Generated by the DeepBridge Consultant Portal", {
    x: 54,
    y: 58,
    size: 7,
    font: regular,
    color: muted,
  });

  pdf.setTitle("DeepBridge electronic signing audit certificate");
  pdf.setAuthor("DeepBridge Advisory");
  pdf.setCreationDate(input.signedAt);
  return pdf.save({ useObjectStreams: true });
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }

  try {
    const actor = await requirePortalUser(request, response, "admin");
    await enforceRateLimit(
      request,
      actor.user.id,
      "portal_countersign",
      10,
      3_600,
    );
    const body = await readJsonBody(request);
    const assignedDocumentId = cleanText(body.assignedDocumentId, 36);
    const signerName = cleanText(body.signerName, 100);
    const signerTitle = cleanText(body.signerTitle, 120);
    const confirmed = body.confirmed === true;
    if (!/^[0-9a-f-]{36}$/i.test(assignedDocumentId))
      throw new PortalHttpError(400, "A valid assigned document is required.");
    if (signerName.length < 2 || signerTitle.length < 2 || !confirmed)
      throw new PortalHttpError(
        400,
        "Confirm the signatory name, authority and signing intent.",
      );
    if (
      normalisedIdentity(signerName) !==
      normalisedIdentity(actor.profile.full_name)
    ) {
      throw new PortalHttpError(
        403,
        "The signature name must match the authenticated administrator.",
      );
    }
    const signatureBytes = decodeSignature(body.signatureImageDataUrl);

    const admin = getSupabaseAdmin();
    const { data: assigned, error: assignedError } = await admin
      .from("assigned_documents")
      .select(
        "id, consultant_id, assignment_id, status, document_versions!inner(version_label, documents!inner(title, category))",
      )
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    if (assigned.status !== "awaiting_deepbridge")
      throw new PortalHttpError(
        409,
        "The agreement is not ready for DeepBridge countersignature.",
      );

    const { data: envelope, error: envelopeError } = await admin
      .from("signature_envelopes")
      .select(
        "id, provider, provider_status, pending_final_storage_path, final_content_sha256, final_scan_status",
      )
      .eq("assigned_document_id", assignedDocumentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (
      envelopeError ||
      !envelope ||
      envelope.provider_status !== "consultant_signed" ||
      envelope.final_scan_status !== "clean" ||
      !envelope.pending_final_storage_path
    ) {
      throw new PortalHttpError(
        409,
        "Upload and security-check the consultant-signed PDF before countersigning.",
      );
    }

    const version = Array.isArray(assigned.document_versions)
      ? assigned.document_versions[0]
      : assigned.document_versions;
    const document = Array.isArray(version?.documents)
      ? version.documents[0]
      : version?.documents;
    if (document?.category !== "signature")
      throw new PortalHttpError(409, "This document does not require signing.");

    const { data: consultant, error: consultantError } = await admin
      .from("portal_profiles")
      .select("full_name, email")
      .eq("id", assigned.consultant_id)
      .single();
    if (consultantError || !consultant)
      throw new PortalHttpError(404, "Consultant record not found.");

    const { data: sourceBlob, error: sourceError } = await admin.storage
      .from("signed-documents")
      .download(envelope.pending_final_storage_path);
    if (sourceError || !sourceBlob)
      throw new PortalHttpError(
        409,
        "The consultant-signed PDF is not available.",
      );
    const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
    if (
      sourceBytes.length < 5 ||
      sourceBytes.length > 25 * 1024 * 1024 ||
      Buffer.from(sourceBytes.subarray(0, 5)).toString("ascii") !== "%PDF-"
    ) {
      throw new PortalHttpError(
        400,
        "The consultant-signed file is not a valid PDF.",
      );
    }
    const sourceHash = sha256(sourceBytes);
    if (
      envelope.final_content_sha256 &&
      envelope.final_content_sha256 !== sourceHash
    ) {
      throw new PortalHttpError(
        409,
        "The consultant-signed PDF does not match its verified upload.",
      );
    }

    const signedAt = new Date();
    const finalBytes = await createCountersignedPdf({
      sourceBytes,
      signatureBytes,
      title: document.title,
      versionLabel: version.version_label,
      consultantName: consultant.full_name,
      consultantEmail: consultant.email,
      signerName,
      signerTitle,
      signedAt,
      assignedDocumentId,
      envelopeId: envelope.id,
      sourceHash,
    });
    const finalHash = sha256(finalBytes);
    const certificateBytes = await createAuditCertificate({
      title: document.title,
      versionLabel: version.version_label,
      consultantName: consultant.full_name,
      consultantEmail: consultant.email,
      signerName,
      signerTitle,
      signedAt,
      assignedDocumentId,
      envelopeId: envelope.id,
      sourceHash,
      finalHash,
    });
    const certificateHash = sha256(certificateBytes);
    const prefix = `${assigned.consultant_id}/${assignedDocumentId}/${envelope.id}`;
    const finalPath = `${prefix}/final-${randomUUID()}.pdf`;
    const certificatePath = `${prefix}/certificate-${randomUUID()}.pdf`;

    const finalUpload = await admin.storage
      .from("signed-documents")
      .upload(finalPath, finalBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (finalUpload.error) throw finalUpload.error;
    const certificateUpload = await admin.storage
      .from("signed-documents")
      .upload(certificatePath, certificateBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (certificateUpload.error) {
      await admin.storage.from("signed-documents").remove([finalPath]);
      throw certificateUpload.error;
    }

    const { error: updateError } = await admin
      .from("signature_envelopes")
      .update({
        provider_status: "security_review",
        pending_final_storage_path: finalPath,
        pending_certificate_storage_path: certificatePath,
        final_content_sha256: finalHash,
        certificate_content_sha256: certificateHash,
        final_scan_status: "pending",
        certificate_scan_status: "pending",
      })
      .eq("id", envelope.id);
    if (updateError) {
      await admin.storage
        .from("signed-documents")
        .remove([finalPath, certificatePath]);
      throw updateError;
    }

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "portal_countersignature_applied",
      object_type: "signature_envelope",
      object_id: envelope.id,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: {
        signature_method: "authenticated_portal_electronic_signature",
        signer_name: signerName,
        signer_title: signerTitle,
        signed_at: signedAt.toISOString(),
        source_storage_path: envelope.pending_final_storage_path,
        source_content_sha256: sourceHash,
        final_content_sha256: finalHash,
        certificate_content_sha256: certificateHash,
        confirmed_signing_intent: true,
        scan_status: "pending",
      },
    });

    await Promise.all([
      requestMalwareScan({
        objectType: "signature_artifact",
        objectId: envelope.id,
        artifactKind: "final",
        bucket: "signed-documents",
        storagePath: finalPath,
      }),
      requestMalwareScan({
        objectType: "signature_artifact",
        objectId: envelope.id,
        artifactKind: "certificate",
        bucket: "signed-documents",
        storagePath: certificatePath,
      }),
    ]);

    return json(response, 202, {
      envelopeId: envelope.id,
      status: "pending_security_scan",
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
