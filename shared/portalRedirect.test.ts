import { describe, expect, it } from "vitest";
import {
  portalAuthCallbackUrl,
  portalLoginPath,
  portalPostLoginPath,
  safePortalNext,
} from "./portalRedirect";

describe("portal sign-in destinations", () => {
  it.each(["/timesheets", "/admin/timesheets"])(
    "preserves %s on the sign-in page without changing the auth callback",
    (next) => {
      const login = new URL(portalLoginPath(next), "https://portal.example.com");
      const callback = new URL(
        portalAuthCallbackUrl("https://portal.example.com"),
      );
      expect(login.pathname).toBe("/login");
      expect(login.searchParams.get("next")).toBe(next);
      expect(callback.origin).toBe("https://portal.example.com");
      expect(callback.pathname).toBe("/auth/callback");
      expect(callback.search).toBe("");
    },
  );

  it.each([
    undefined,
    null,
    {},
    ["/timesheets"],
    "",
    "https://evil.example/timesheets",
    "//evil.example/timesheets",
    "/\\evil.example",
    "%2Ftimesheets",
    "/timesheets/../admin",
    "/timesheets?next=https://evil.example",
    "/timesheets#https://evil.example",
    "/timesheets/",
    " /timesheets",
    "/admin",
  ])("rejects an unapproved destination: %j", (next) => {
    expect(safePortalNext(next)).toBeUndefined();
    expect(portalLoginPath(next)).toBe("/login");
    expect(portalAuthCallbackUrl("https://portal.example.com")).toBe(
      "https://portal.example.com/auth/callback",
    );
    expect(portalPostLoginPath(next, "consultant")).toBe("/dashboard");
    expect(portalPostLoginPath(next, "admin")).toBe("/admin");
  });

  it.each(["/timesheets", "/admin/timesheets"])(
    "sends each role to its own timesheet view for %s",
    (next) => {
      expect(portalPostLoginPath(next, "consultant")).toBe("/timesheets");
      expect(portalPostLoginPath(next, "admin")).toBe("/admin/timesheets");
    },
  );
});
