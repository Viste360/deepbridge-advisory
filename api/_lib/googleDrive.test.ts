import { describe, expect, it } from "vitest";
import { googleDriveArchiveErrorMessage } from "./googleDrive.js";

describe("googleDriveArchiveErrorMessage", () => {
  it("explains the service-account Shared Drive requirement", () => {
    expect(
      googleDriveArchiveErrorMessage(
        new Error(
          "Service Accounts do not have storage quota. Leverage shared drives.",
        ),
      ),
    ).toContain("Google Shared Drive");
  });

  it("explains a folder permission failure", () => {
    const previousEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
    try {
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL =
        "portal-drive@example-project.iam.gserviceaccount.com";
      expect(
        googleDriveArchiveErrorMessage(new Error("File not found: folder-id")),
      ).toContain("portal-drive@example-project.iam.gserviceaccount.com");
    } finally {
      if (previousEmail === undefined)
        delete process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
      else process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL = previousEmail;
    }
  });

  it("does not expose an unexpected provider error", () => {
    expect(
      googleDriveArchiveErrorMessage(new Error("sensitive provider detail")),
    ).toBe(
      "Google Drive could not archive this contract. Check the Shared Drive folder access and retry.",
    );
  });
});
