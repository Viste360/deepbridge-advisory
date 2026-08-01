import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyPdfArtifact } from "./signing-completion.js";

describe("verifyPdfArtifact", () => {
  it("accepts a PDF whose stored hash matches", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nverified");
    const hash = createHash("sha256").update(bytes).digest("hex");
    expect(verifyPdfArtifact(bytes, hash, "Signed PDF")).toBe(hash);
  });

  it("rejects a changed PDF", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nchanged");
    expect(() => verifyPdfArtifact(bytes, "0".repeat(64), "Signed PDF"))
      .toThrow("does not match the signed record");
  });

  it("rejects a non-PDF payload", () => {
    const bytes = new TextEncoder().encode("plain text");
    const hash = createHash("sha256").update(bytes).digest("hex");
    expect(() => verifyPdfArtifact(bytes, hash, "Signed PDF")).toThrow(
      "is not a valid PDF",
    );
  });
});
