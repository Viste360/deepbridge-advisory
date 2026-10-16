const portalPathPrefixes = [
  "/login",
  "/auth",
  "/dashboard",
  "/assignment",
  "/documents",
  "/compliance",
  "/onboarding",
  "/support",
  "/profile",
  "/admin",
  "/terms",
] as const;

/** Choose the application for the current URL without reading browser state. */
export function isPortalLocation(
  hostname: string,
  pathname: string,
  search = "",
): boolean {
  if (hostname.toLowerCase().startsWith("portal.")) return true;

  // Privacy belongs to both applications on a local or deployment preview host.
  if (
    pathname === "/privacy" &&
    new URLSearchParams(search).get("context") === "portal"
  ) {
    return true;
  }

  return portalPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
