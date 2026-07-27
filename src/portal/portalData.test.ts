import { describe, expect, it } from "vitest";
import { adminSnapshot, consultantSnapshot } from "./demoData";

describe("consultant portal data contract", () => {
  it("keeps internal checks out of the consultant checklist", () => {
    expect(consultantSnapshot.tasks.some((task) => task.internal)).toBe(false);
    expect(adminSnapshot.tasks.some((task) => task.internal)).toBe(true);
  });

  it("uses Google Workspace workflow states for all legal documents", () => {
    const signatureDocuments = consultantSnapshot.documents.filter(
      (document) => document.category === "signature",
    );

    expect(signatureDocuments.map((document) => document.id)).toEqual([
      "framework",
      "sow",
      "charter",
    ]);
    expect(
      signatureDocuments.every((document) =>
        [
          "ready_to_sign",
          "awaiting_deepbridge",
          "completed",
        ].includes(document.status),
      ),
    ).toBe(true);
  });

  it("marks identity, banking, registration and insurance as required", () => {
    const requiredIds = consultantSnapshot.compliance
      .filter((requirement) => requirement.required)
      .map((requirement) => requirement.id);

    expect(requiredIds).toEqual(
      expect.arrayContaining([
        "business-registration",
        "professional-indemnity",
        "public-liability",
        "identity",
        "bank",
      ]),
    );
  });

  it("gives administrators consultant context for each compliance record", () => {
    expect(
      adminSnapshot.compliance.every(
        (requirement) =>
          requirement.consultantId === "demo-consultant" &&
          requirement.consultantName === "Roland Schneider" &&
          requirement.consultantEmail === "roland.schneider@example.de",
      ),
    ).toBe(true);
  });
});
