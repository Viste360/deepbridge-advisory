import { describe, expect, it } from "vitest";
import { isPortalLocation } from "./appRouting";

describe("application routing", () => {
  it.each([
    "/login", "/auth", "/dashboard", "/assignment", "/timesheets",
    "/documents", "/compliance", "/onboarding", "/support", "/profile",
    "/admin", "/terms",
  ])("recognises the portal route %s and its nested routes", (pathname) => {
    expect(isPortalLocation("localhost", pathname)).toBe(true);
    expect(isPortalLocation("preview.vercel.app", `${pathname}/details`)).toBe(true);
    expect(isPortalLocation("localhost", `${pathname}-other`)).toBe(false);
  });

  it("keeps portal hostnames in the portal regardless of the route", () => {
    expect(isPortalLocation("portal.deepbridgeadvisory.com", "/")).toBe(true);
    expect(isPortalLocation("portal.localhost", "/privacy")).toBe(true);
    expect(isPortalLocation("PORTAL.deepbridgeadvisory.com", "/about")).toBe(true);
    expect(isPortalLocation("not-portal.deepbridgeadvisory.com", "/")).toBe(false);
  });

  it("resolves privacy explicitly without moving ordinary public privacy into the portal", () => {
    expect(isPortalLocation("localhost", "/privacy", "?context=portal")).toBe(true);
    expect(isPortalLocation("preview.vercel.app", "/privacy", "?source=login&context=portal")).toBe(true);
    expect(isPortalLocation("localhost", "/privacy")).toBe(false);
    expect(isPortalLocation("localhost", "/privacy", "?context=public")).toBe(false);
    expect(isPortalLocation("localhost", "/about", "?context=portal")).toBe(false);
    expect(isPortalLocation("localhost", "/de/privacy", "?context=portal")).toBe(false);
  });

  it("evaluates each navigation independently, including back and forward transitions", () => {
    const locations = [
      ["/about", ""],
      ["/login", "?next=%2Fdashboard"],
      ["/privacy", "?context=portal"],
      ["/privacy", ""],
      ["/privacy", "?context=portal"],
      ["/de/contact", "?type=consultant"],
    ];
    expect(locations.map(([pathname, search]) => isPortalLocation("localhost", pathname, search)))
      .toEqual([false, true, true, false, true, false]);
  });
});
