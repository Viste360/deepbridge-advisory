import { describe, expect, it } from "vitest";
import { buildDocumentDownloadName } from "./access";

describe("document download filenames", () => {
  it("uses a professional signed-agreement filename", () => {
    expect(
      buildDocumentDownloadName({
        consultantName: "Roland Schneider",
        title: "Professional Consulting Services Framework Agreement",
        versionLabel: "1.2",
        kind: "final",
      }),
    ).toBe(
      "DeepBridge-Roland-Schneider-Professional-Consulting-Services-Framework-Agreement-v1.2-Signed.pdf",
    );
  });

  it("sanitizes names and identifies audit certificates", () => {
    expect(
      buildDocumentDownloadName({
        consultantName: "Zoë O'Connor",
        title: "Statement of Work — Planning / Delivery",
        versionLabel: "v2.0",
        kind: "certificate",
      }),
    ).toBe(
      "DeepBridge-Zoe-O-Connor-Statement-of-Work-Planning-Delivery-v2.0-Audit-Certificate.pdf",
    );
  });
});
