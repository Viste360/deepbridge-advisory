import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  PDFDocument,
  PDFName,
  type PDFPage,
  PDFSignature,
  popGraphicsState,
  pushGraphicsState,
  rotateDegrees,
  scale,
  StandardFonts,
  type PDFFont,
  rgb,
  translate,
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
import { completeSigningRecord } from "../../_lib/signing-completion.js";

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

export type ManualPdfPlacement = {
  pageIndex: number;
  signature: { x: number; y: number; size: number };
  stamp: { x: number; y: number; rotation: number };
  date: { x: number; y: number; size: number };
};

function normalizedCoordinate(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)
    throw new PortalHttpError(400, `The ${label} position is invalid.`);
  return value;
}

function placementScale(value: unknown, label: string) {
  if (value === undefined) return 1;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0.55 || value > 1.75)
    throw new PortalHttpError(400, `The ${label} size is invalid.`);
  return value;
}

function decodeManualPlacement(value: unknown): ManualPdfPlacement | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object")
    throw new PortalHttpError(400, "The PDF placement is invalid.");
  const input = value as Record<string, unknown>;
  if (!Number.isInteger(input.pageIndex) || Number(input.pageIndex) < 0)
    throw new PortalHttpError(400, "The PDF placement page is invalid.");
  const signature = input.signature as Record<string, unknown> | undefined;
  const stamp = input.stamp as Record<string, unknown> | undefined;
  const date = input.date as Record<string, unknown> | undefined;
  if (!signature || !stamp || !date)
    throw new PortalHttpError(400, "Place the signature, stamp and date in the PDF.");
  const rotation = Number(stamp.rotation);
  if (!Number.isFinite(rotation) || rotation < -8 || rotation > 8)
    throw new PortalHttpError(400, "The stamp angle is invalid.");
  return {
    pageIndex: Number(input.pageIndex),
    signature: {
      x: normalizedCoordinate(signature.x, "signature horizontal"),
      y: normalizedCoordinate(signature.y, "signature vertical"),
      size: placementScale(signature.size, "signature"),
    },
    stamp: {
      x: normalizedCoordinate(stamp.x, "stamp horizontal"),
      y: normalizedCoordinate(stamp.y, "stamp vertical"),
      rotation,
    },
    date: {
      x: normalizedCoordinate(date.x, "date horizontal"),
      y: normalizedCoordinate(date.y, "date vertical"),
      size: placementScale(date.size, "date"),
    },
  };
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

const DEEPBRIDGE_COMPANY_NUMBER = "16775578";
const DEEPBRIDGE_REGISTERED_OFFICE_LINE_1 =
  "Kemp House, 152-160 City Road";
const DEEPBRIDGE_REGISTERED_OFFICE_LINE_2 =
  "London, United Kingdom, EC1V 2NX";

function drawCentredText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  options: {
    centreX: number;
    y: number;
    size: number;
    color: ReturnType<typeof rgb>;
    opacity?: number;
  },
) {
  page.drawText(text, {
    x: options.centreX - font.widthOfTextAtSize(text, options.size) / 2,
    y: options.y,
    size: options.size,
    font,
    color: options.color,
    opacity: options.opacity,
  });
}

function drawDeepBridgeCompanySeal(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont; serif: PDFFont },
  x: number,
  y: number,
  rotation = 0,
  scaleFactor = 1,
) {
  const ink = rgb(0.03, 0.11, 0.15);
  const teal = rgb(0.19, 0.7, 0.66);
  const muted = rgb(0.36, 0.43, 0.44);
  const stampOpacity = 0.78;
  const width = 164;
  const height = 142;
  const markX = x + 32;
  const markY = y + 103;

  if (rotation !== 0 || scaleFactor !== 1) {
    page.pushOperators(pushGraphicsState());
  }
  if (scaleFactor !== 1) {
    page.pushOperators(
      translate(x, y),
      scale(scaleFactor, scaleFactor),
      translate(-x, -y),
    );
  }
  if (rotation !== 0) {
    const centreX = x + width / 2;
    const centreY = y + height / 2;
    page.pushOperators(
      translate(centreX, centreY),
      rotateDegrees(rotation),
      translate(-centreX, -centreY),
    );
  }

  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.3, 0.56, 0.57),
    borderWidth: 1.2,
    borderOpacity: stampOpacity,
  });
  page.drawText("CORPORATE EXECUTION STAMP", {
    x: x + 12,
    y: y + 126,
    size: 5.3,
    font: fonts.bold,
    color: muted,
    opacity: stampOpacity,
  });

  page.drawCircle({
    x: markX,
    y: markY,
    size: 22,
    borderColor: rgb(0.3, 0.56, 0.57),
    borderWidth: 1.4,
    borderOpacity: stampOpacity,
  });
  page.drawCircle({
    x: markX,
    y: markY,
    size: 19,
    borderColor: rgb(0.07, 0.2, 0.26),
    borderWidth: 0.7,
    borderOpacity: stampOpacity,
  });
  page.drawText("D", {
    x: markX - 13,
    y: markY - 8,
    size: 21,
    font: fonts.serif,
    color: ink,
    opacity: stampOpacity,
  });
  page.drawText("B", {
    x: markX - 1,
    y: markY - 8,
    size: 21,
    font: fonts.serif,
    color: teal,
    opacity: stampOpacity,
  });
  page.drawLine({
    start: { x: markX - 1, y: markY - 17 },
    end: { x: markX + 4, y: markY + 18 },
    thickness: 1,
    color: teal,
    opacity: stampOpacity,
  });

  page.drawText("DEEPBRIDGE", {
    x: x + 61,
    y: y + 107,
    size: 9,
    font: fonts.bold,
    color: ink,
    opacity: stampOpacity,
  });
  page.drawText("ADVISORY", {
    x: x + 61,
    y: y + 96,
    size: 7,
    font: fonts.bold,
    color: teal,
    opacity: stampOpacity,
  });
  page.drawLine({
    start: { x: x + 12, y: y + 74 },
    end: { x: x + width - 12, y: y + 74 },
    thickness: 0.7,
    color: rgb(0.65, 0.75, 0.72),
    opacity: stampOpacity,
  });
  drawCentredText(page, "DUSTDEEP LTD", fonts.bold, {
    centreX: x + width / 2,
    y: y + 60,
    size: 7,
    color: muted,
    opacity: stampOpacity,
  });
  drawCentredText(
    page,
    `Registered in England and Wales - Company no. ${DEEPBRIDGE_COMPANY_NUMBER}`,
    fonts.regular,
    {
      centreX: x + width / 2,
      y: y + 49,
      size: 4.8,
      color: muted,
      opacity: stampOpacity,
    },
  );
  drawCentredText(page, DEEPBRIDGE_REGISTERED_OFFICE_LINE_1, fonts.regular, {
    centreX: x + width / 2,
    y: y + 32,
    size: 5.2,
    color: ink,
    opacity: stampOpacity,
  });
  drawCentredText(page, DEEPBRIDGE_REGISTERED_OFFICE_LINE_2, fonts.regular, {
    centreX: x + width / 2,
    y: y + 22,
    size: 5.2,
    color: ink,
    opacity: stampOpacity,
  });
  if (rotation !== 0 || scaleFactor !== 1)
    page.pushOperators(popGraphicsState());
}

type SignatureBlockPlacement = {
  pageIndex: number;
  signature: { x: number; y: number; width: number };
  date: { x: number; y: number; width: number };
};

let pdfJsPromise:
  | Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")>
  | undefined;

function ensurePdfJsTextExtractionGlobals() {
  // PDF.js initialises browser rendering helpers even though this endpoint
  // only extracts text. Vercel does not bundle the optional native canvas
  // package, so provide inert constructors before the dynamic import. None of
  // these rendering APIs are used by getTextContent().
  if (!globalThis.DOMMatrix) {
    Object.defineProperty(globalThis, "DOMMatrix", {
      configurable: true,
      value: class TextExtractionDOMMatrix {},
    });
  }
  if (!globalThis.ImageData) {
    Object.defineProperty(globalThis, "ImageData", {
      configurable: true,
      value: class TextExtractionImageData {},
    });
  }
  if (!globalThis.Path2D) {
    Object.defineProperty(globalThis, "Path2D", {
      configurable: true,
      value: class TextExtractionPath2D {},
    });
  }
}

function loadPdfJs() {
  ensurePdfJsTextExtractionGlobals();
  pdfJsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfJsPromise;
}

export async function locateDeepBridgeSignatureBlock(
  sourceBytes: Uint8Array,
): Promise<SignatureBlockPlacement | null> {
  const { getDocument } = await loadPdfJs();
  const source = await getDocument({
    data: sourceBytes.slice(),
    useSystemFonts: true,
  }).promise;

  try {
    for (let pageNumber = source.numPages; pageNumber >= 1; pageNumber -= 1) {
      const page = await source.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) =>
        "str" in item
          ? [
              {
                text: item.str.replace(/\s+/g, " ").trim(),
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                fontSize: Math.hypot(item.transform[0], item.transform[1]),
              },
            ]
          : [],
      );
      const signatures = items.filter(
        (item) =>
          /^signature\s*:/i.test(item.text) && item.x < viewport.width * 0.52,
      );
      const dates = items.filter(
        (item) =>
          /^date\s*:/i.test(item.text) && item.x < viewport.width * 0.52,
      );

      for (const signature of signatures) {
        const date = dates.find(
          (candidate) =>
            candidate.y < signature.y &&
            signature.y - candidate.y >= 10 &&
            signature.y - candidate.y <= 70 &&
            Math.abs(candidate.x - signature.x) <= 45,
        );
        if (!date) continue;
        return {
          pageIndex: pageNumber - 1,
          signature: {
            x: signature.x,
            y: signature.y,
            width: Math.min(signature.width, signature.fontSize * 5.1),
          },
          date: {
            x: date.x,
            y: date.y,
            width: Math.min(date.width, date.fontSize * 2.7),
          },
        };
      }
    }
    return null;
  } finally {
    await source.destroy();
  }
}

function formatSigningDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function locateKnownTemplateSignatureBlock(
  pdf: PDFDocument,
  title: string,
): SignatureBlockPlacement | null {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle.includes("professional consultant charter acknowledgement")) {
    return null;
  }

  const pageIndex = pdf.getPageCount() - 1;
  if (pageIndex < 0) return null;
  const page = pdf.getPage(pageIndex);
  const scaleX = page.getWidth() / 595.304;
  const scaleY = page.getHeight() / 841.89;

  // The controlled Charter template ends with a two-column acknowledgement
  // block. Use its normalized DeepBridge-column coordinates if text
  // extraction is unavailable in the serverless PDF runtime.
  return {
    pageIndex,
    signature: {
      x: 63.25 * scaleX,
      y: 558.339 * scaleY,
      width: 39.48 * scaleX,
    },
    date: {
      x: 63.25 * scaleX,
      y: 540.789 * scaleY,
      width: 19.96 * scaleX,
    },
  };
}

function drawSignatureInExecutionBlock(
  page: PDFPage,
  placement: SignatureBlockPlacement,
  signature: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  regular: PDFFont,
  signedAt: Date,
) {
  const signatureRatio = signature.width / signature.height;
  const signatureHeight = 34;
  const startX = placement.signature.x + placement.signature.width + 6;
  const availableWidth = Math.max(90, page.getWidth() / 2 - startX - 20);
  const signatureWidth = Math.min(
    availableWidth,
    signatureHeight * signatureRatio,
  );
  page.drawImage(signature, {
    x: startX,
    y: placement.signature.y - 13,
    width: signatureWidth,
    height: signatureHeight,
  });

  const dateText = formatSigningDate(signedAt);
  const dateX = placement.date.x + placement.date.width + 6;
  const dateSize = 9.5;
  page.drawText(dateText, {
    x: dateX,
    y: placement.date.y,
    size: dateSize,
    font: regular,
    color: rgb(0.03, 0.11, 0.15),
  });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function drawManualPdfPlacement(
  page: PDFPage,
  placement: ManualPdfPlacement,
  signature: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  fonts: { regular: PDFFont; bold: PDFFont; serif: PDFFont },
  signedAt: Date,
) {
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const signatureRatio = signature.width / signature.height;
  const signatureScale = placement.signature.size ?? 1;
  const signatureHeight = 34 * signatureScale;
  const signatureWidth = Math.min(
    210 * signatureScale,
    signatureHeight * signatureRatio,
  );
  const signatureX = clamp(
    placement.signature.x * pageWidth,
    12,
    pageWidth - signatureWidth - 12,
  );
  const signatureY = clamp(
    pageHeight - placement.signature.y * pageHeight - signatureHeight,
    12,
    pageHeight - signatureHeight - 12,
  );
  page.drawImage(signature, {
    x: signatureX,
    y: signatureY,
    width: signatureWidth,
    height: signatureHeight,
  });

  const dateText = formatSigningDate(signedAt);
  const dateSize = 9.5 * (placement.date.size ?? 1);
  const dateWidth = fonts.regular.widthOfTextAtSize(dateText, dateSize);
  const dateX = clamp(
    placement.date.x * pageWidth,
    12,
    pageWidth - dateWidth - 12,
  );
  const dateY = clamp(
    pageHeight - placement.date.y * pageHeight - dateSize,
    12,
    pageHeight - dateSize - 12,
  );
  page.drawText(dateText, {
    x: dateX,
    y: dateY,
    size: dateSize,
    font: fonts.regular,
    color: rgb(0.03, 0.11, 0.15),
  });

  const stampWidth = 164;
  const stampHeight = 142;
  const stampX = clamp(
    placement.stamp.x * pageWidth,
    12,
    pageWidth - stampWidth - 12,
  );
  const stampY = clamp(
    pageHeight - placement.stamp.y * pageHeight - stampHeight,
    12,
    pageHeight - stampHeight - 12,
  );
  drawDeepBridgeCompanySeal(
    page,
    fonts,
    stampX,
    stampY,
    -placement.stamp.rotation,
  );
}

const DEEPBRIDGE_COUNTERSIGNATORY_EMAIL =
  "yon.wallace@deepbridgeadvisory.co.uk";
const DEEPBRIDGE_SIGNED_FOR =
  "DUSTDEEP LTD trading as DeepBridge Advisory";
const COUNTERSIGNATURE_RECORD_VERSION = "1.0";
const ROLAND_FRAMEWORK_DOCUMENT_ID = "7f4e5866-6dee-4484-a3d1-2b3997414d34";
const ROLAND_SOW_DOCUMENT_ID = "3dd2a4ff-97e6-4ee2-8a3f-818c7183d2b2";

function isRolandCorrectedDocument(assignedDocumentId?: string) {
  return (
    assignedDocumentId === ROLAND_FRAMEWORK_DOCUMENT_ID ||
    assignedDocumentId === ROLAND_SOW_DOCUMENT_ID
  );
}

export function correctedSigningDocumentDetails(
  title: string,
  recordedVersionLabel: string,
  assignedDocumentId?: string,
) {
  const normalizedVersion = recordedVersionLabel.replace(/^v/i, "");
  if (title === "Professional Consulting Services Framework Agreement") {
    return {
      reference: "DBA-CFA-HSC-2026-001",
      sourceVersion:
        isRolandCorrectedDocument(assignedDocumentId) &&
        normalizedVersion === "1.2"
          ? "1.1"
          : normalizedVersion,
    };
  }
  if (title === "Statement of Work — Planning Cluster Lead") {
    return {
      reference: "DBA-SOW-HSC-2026-001",
      sourceVersion:
        isRolandCorrectedDocument(assignedDocumentId) &&
        normalizedVersion === "1.2"
          ? "1.1"
          : normalizedVersion,
    };
  }
  if (title === "Professional Consultant Charter Acknowledgement") {
    return {
      reference: "DBA-CHR-HSC-2026-001",
      sourceVersion: normalizedVersion,
    };
  }
  return { reference: "See source document", sourceVersion: normalizedVersion };
}

export function correctedConsultantEmail(
  consultantName: string,
  recordedEmail: string,
  assignedDocumentId?: string,
) {
  return isRolandCorrectedDocument(assignedDocumentId) ||
    (consultantName === "Roland Schneider" &&
      recordedEmail.toLowerCase() === "yonwallace@gmail.com")
    ? "roland.schneider@hs-con.de"
    : recordedEmail;
}

function drawLabeledBlock(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  const muted = rgb(0.36, 0.43, 0.44);
  const ink = rgb(0.03, 0.11, 0.15);
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 6.7,
    font: fonts.bold,
    color: muted,
  });
  drawWrappedText(page, value, fonts.regular, {
    x,
    y: y - 13,
    size: 7.7,
    width,
    lineHeight: 10,
    color: ink,
  });
}

function appendCountersignatureRecordPage(
  pdf: PDFDocument,
  signature: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  fonts: { regular: PDFFont; bold: PDFFont; serif: PDFFont },
  input: {
    title: string;
    versionLabel: string;
    consultantName: string;
    consultantEmail: string;
    signerName: string;
    signedAt: Date;
    assignedDocumentId: string;
    envelopeId: string;
    sourceHash: string;
  },
) {
  const details = correctedSigningDocumentDetails(
    input.title,
    input.versionLabel,
    input.assignedDocumentId,
  );
  const consultantEmail = correctedConsultantEmail(
    input.consultantName,
    input.consultantEmail,
    input.assignedDocumentId,
  );
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(0.03, 0.11, 0.15);
  const teal = rgb(0.19, 0.7, 0.66);
  const muted = rgb(0.36, 0.43, 0.44);
  const paleTeal = rgb(0.88, 0.95, 0.93);

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
    font: fonts.bold,
    color: teal,
  });
  page.drawText("DEEPBRIDGE ADVISORY", {
    x: 54,
    y: 753,
    size: 10,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("ELECTRONIC COUNTERSIGNATURE RECORD", {
    x: 54,
    y: 731,
    size: 8,
    font: fonts.bold,
    color: rgb(0.68, 0.83, 0.82),
  });

  page.drawText("Countersigned for DeepBridge Advisory", {
    x: 54,
    y: 668,
    size: 19,
    font: fonts.bold,
    color: ink,
  });
  drawWrappedText(page, input.title, fonts.bold, {
    x: 54,
    y: 636,
    size: 12.5,
    width: 487,
    lineHeight: 16,
    color: rgb(0.12, 0.28, 0.31),
  });

  page.drawRectangle({
    x: 54,
    y: 545,
    width: 487,
    height: 58,
    color: paleTeal,
  });
  drawLabeledBlock(
    page,
    fonts,
    "Source document reference",
    details.reference,
    68,
    584,
    210,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Source document version",
    details.sourceVersion,
    303,
    584,
    93,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Countersignature record version",
    COUNTERSIGNATURE_RECORD_VERSION,
    410,
    584,
    115,
  );

  page.drawRectangle({
    x: 54,
    y: 337,
    width: 487,
    height: 187,
    borderWidth: 1,
    borderColor: rgb(0.72, 0.8, 0.78),
    color: rgb(0.97, 0.985, 0.98),
  });
  drawWrappedText(
    page,
    "I have reviewed the complete consultant-signed document and, being authorised to sign for DUSTDEEP LTD trading as DeepBridge Advisory, intend this electronic countersignature to bind DeepBridge to the document.",
    fonts.regular,
    {
      x: 74,
      y: 495,
      size: 8.7,
      width: 447,
      lineHeight: 12,
      color: muted,
    },
  );
  const signatureRatio = signature.width / signature.height;
  const signatureHeight = 43;
  const signatureWidth = Math.min(245, signatureHeight * signatureRatio);
  page.drawImage(signature, {
    x: 74,
    y: 397,
    width: signatureWidth,
    height: signatureHeight,
  });
  page.drawLine({
    start: { x: 74, y: 390 },
    end: { x: 326, y: 390 },
    thickness: 0.7,
    color: rgb(0.45, 0.55, 0.54),
  });
  page.drawText(input.signerName, {
    x: 74,
    y: 375,
    size: 8.5,
    font: fonts.bold,
    color: ink,
  });
  page.drawText("Director", {
    x: 74,
    y: 361,
    size: 7.6,
    font: fonts.regular,
    color: muted,
  });
  page.drawText(DEEPBRIDGE_SIGNED_FOR, {
    x: 74,
    y: 348,
    size: 7.3,
    font: fonts.regular,
    color: muted,
  });
  drawDeepBridgeCompanySeal(page, fonts, 392, 365, 0, 0.82);

  drawLabeledBlock(
    page,
    fonts,
    "Countersignatory",
    input.signerName,
    54,
    306,
    225,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Consultant signatory",
    input.consultantName,
    304,
    306,
    237,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Countersignatory email",
    DEEPBRIDGE_COUNTERSIGNATORY_EMAIL,
    54,
    270,
    225,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Consultant email",
    consultantEmail,
    304,
    270,
    237,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Signed for",
    DEEPBRIDGE_SIGNED_FOR,
    54,
    234,
    225,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Signed at",
    `${input.signedAt.toISOString()} (UTC)`,
    304,
    234,
    237,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Document record",
    input.assignedDocumentId,
    54,
    187,
    225,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Envelope record",
    input.envelopeId,
    304,
    187,
    237,
  );
  drawLabeledBlock(
    page,
    fonts,
    "Consultant-signed source SHA-256",
    input.sourceHash,
    54,
    145,
    487,
  );

  page.drawRectangle({ x: 54, y: 76, width: 487, height: 42, color: paleTeal });
  drawWrappedText(
    page,
    "This page forms part of the countersigned agreement and records the DeepBridge countersignature event and the SHA-256 hash of the consultant-signed source document.",
    fonts.regular,
    {
      x: 68,
      y: 101,
      size: 7.5,
      width: 459,
      lineHeight: 10,
      color: rgb(0.14, 0.32, 0.31),
    },
  );
  page.drawText(
    `Page ${pdf.getPageCount()} of ${pdf.getPageCount()} - DeepBridge electronic countersignature`,
    { x: 54, y: 48, size: 7, font: fonts.regular, color: muted },
  );
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
  manualPlacement?: ManualPdfPlacement;
}): Promise<{
  bytes: Uint8Array;
  signaturePlacement:
    | "original_execution_block_and_appended_countersignature_record"
    | "appended_countersignature_record_only";
}> {
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
  let placement: SignatureBlockPlacement | null = null;
  if (!input.manualPlacement) {
    try {
      placement = await locateDeepBridgeSignatureBlock(input.sourceBytes);
    } catch {
      placement = null;
    }
    placement ??= locateKnownTemplateSignatureBlock(pdf, input.title);
  }
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const signature = await pdf.embedPng(input.signatureBytes);
  if (input.manualPlacement) {
    if (input.manualPlacement.pageIndex >= pdf.getPageCount())
      throw new PortalHttpError(400, "The selected PDF page is invalid.");
    drawManualPdfPlacement(
      pdf.getPage(input.manualPlacement.pageIndex),
      input.manualPlacement,
      signature,
      { regular, bold, serif },
      input.signedAt,
    );
  } else if (placement) {
    const executionPage = pdf.getPage(placement.pageIndex);
    drawSignatureInExecutionBlock(
      executionPage,
      placement,
      signature,
      regular,
      input.signedAt,
    );
  }
  appendCountersignatureRecordPage(pdf, signature, { regular, bold, serif }, input);
  pdf.setTitle(`${input.title} - countersigned`);
  pdf.setAuthor("DeepBridge Advisory");
  pdf.setSubject("Electronic countersignature record");
  pdf.setModificationDate(input.signedAt);
  return {
    bytes: await pdf.save({ useObjectStreams: true }),
    signaturePlacement: input.manualPlacement || placement
      ? "original_execution_block_and_appended_countersignature_record"
      : "appended_countersignature_record_only",
  };
}

export async function replaceCountersignatureRecordPage(input: {
  existingCountersignedBytes: Uint8Array;
  signatureBytes: Uint8Array;
  title: string;
  versionLabel: string;
  consultantName: string;
  consultantEmail: string;
  signerName: string;
  signedAt: Date;
  assignedDocumentId: string;
  envelopeId: string;
  sourceHash: string;
}) {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(input.existingCountersignedBytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch {
    throw new PortalHttpError(
      400,
      "The existing countersigned PDF could not be opened.",
    );
  }
  if (pdf.getPageCount() < 2)
    throw new PortalHttpError(
      409,
      "The existing countersignature record page could not be identified.",
    );

  pdf.removePage(pdf.getPageCount() - 1);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const signature = await pdf.embedPng(input.signatureBytes);
  appendCountersignatureRecordPage(
    pdf,
    signature,
    { regular, bold, serif },
    input,
  );
  pdf.setTitle(`${input.title} - countersigned`);
  pdf.setAuthor("DeepBridge Advisory");
  pdf.setSubject("Electronic countersignature record");
  pdf.setModificationDate(input.signedAt);
  return await pdf.save({ useObjectStreams: true });
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
  signaturePlacement?:
    | "original_execution_block_and_appended_countersignature_record"
    | "appended_countersignature_record_only";
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(0.03, 0.11, 0.15);
  const muted = rgb(0.36, 0.43, 0.44);
  const teal = rgb(0.19, 0.7, 0.66);
  const details = correctedSigningDocumentDetails(
    input.title,
    input.versionLabel,
    input.assignedDocumentId,
  );
  const consultantEmail = correctedConsultantEmail(
    input.consultantName,
    input.consultantEmail,
    input.assignedDocumentId,
  );

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
  page.drawText(`Source document version ${details.sourceVersion}`, {
    x: 54,
    y: afterTitle - 3,
    size: 9,
    font: regular,
    color: muted,
  });

  const signedAt = input.signedAt.toISOString();
  let y = afterTitle - 48;
  const values: Array<[string, string]> = [
    ["Consultant signatory", input.consultantName],
    ["Consultant email", consultantEmail],
    ["Countersignatory", input.signerName],
    ["Countersignatory email", DEEPBRIDGE_COUNTERSIGNATORY_EMAIL],
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
    input.signaturePlacement === "appended_countersignature_record_only"
      ? "The administrator authenticated to the private DeepBridge portal and confirmed both signing authority and intent. The dated countersignature page forms the binding DeepBridge signature. The portal verified both server-generated artifacts against their recorded SHA-256 hashes."
      : "The administrator authenticated to the private DeepBridge portal and confirmed both signing authority and intent. The portal placed the signature and date in the original DeepBridge execution block and appended the countersignature record. The portal verified both server-generated artifacts against their recorded SHA-256 hashes.",
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
    const manualPlacement = decodeManualPlacement(body.placement);
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
        "id, consultant_id, assignment_id, status, document_versions!inner(version_label, documents!inner(slug, title, category))",
      )
      .eq("id", assignedDocumentId)
      .single();
    if (assignedError || !assigned)
      throw new PortalHttpError(404, "Assigned document not found.");
    if (
      assigned.status !== "awaiting_deepbridge" &&
      assigned.status !== "completed"
    )
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
    const countersigned = await createCountersignedPdf({
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
      manualPlacement,
    });
    const finalBytes = countersigned.bytes;
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
      signaturePlacement: countersigned.signaturePlacement,
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
        updated_at: signedAt.toISOString(),
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
        visible_signing_date: formatSigningDate(signedAt),
        signature_placement: countersigned.signaturePlacement,
        placement_mode: manualPlacement ? "administrator_selected" : "automatic",
        manual_placement: manualPlacement ?? null,
        source_storage_path: envelope.pending_final_storage_path,
        source_content_sha256: sourceHash,
        final_content_sha256: finalHash,
        certificate_content_sha256: certificateHash,
        confirmed_signing_intent: true,
        output_verification: "server_generated_pdf_and_sha256",
      },
    });

    await completeSigningRecord({
      admin,
      envelopeId: envelope.id,
      assignedDocumentId,
      assignmentId: assigned.assignment_id,
      consultantId: assigned.consultant_id,
      documentSlug: document.slug,
      finalStoragePath: finalPath,
      certificateStoragePath: certificatePath,
      completedAt: signedAt.toISOString(),
    });

    await admin.from("audit_events").insert({
      actor_id: actor.user.id,
      actor_label: actor.profile.full_name,
      action: "portal_generated_signing_completed",
      object_type: "signature_envelope",
      object_id: envelope.id,
      assignment_id: assigned.assignment_id,
      consultant_id: assigned.consultant_id,
      ...requestContext(request),
      metadata: {
        verification: "server_generated_pdf_and_sha256",
        final_content_sha256: finalHash,
        certificate_content_sha256: certificateHash,
        previous_completed_copy_retired: assigned.status === "completed",
      },
    });

    return json(response, 200, {
      envelopeId: envelope.id,
      status: "completed",
      downloadAvailable: true,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}
