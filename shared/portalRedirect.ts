export type PortalNextPath = "/timesheets" | "/admin/timesheets";

// Keep sign-in destinations exact and shared by the browser and auth endpoints.
// URL-like input, query strings and nested paths must never become redirects.
export function safePortalNext(value: unknown): PortalNextPath | undefined {
  return value === "/timesheets" || value === "/admin/timesheets"
    ? value
    : undefined;
}

export function portalLoginPath(next: unknown) {
  const path = safePortalNext(next);
  return path ? `/login?next=${encodeURIComponent(path)}` : "/login";
}

export function portalPostLoginPath(
  next: unknown,
  role: "consultant" | "admin",
) {
  if (safePortalNext(next))
    return role === "admin" ? "/admin/timesheets" : "/timesheets";
  return role === "admin" ? "/admin" : "/dashboard";
}

export function portalAuthCallbackUrl(portalUrl: string) {
  // Keep the existing exact Supabase redirect allowlist entry unchanged.
  return new URL("/auth/callback", portalUrl).toString();
}
