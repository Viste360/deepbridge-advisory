import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { safePortalNext } from "../../shared/portalRedirect.js";

const COOKIE_NAME = "portal-sign-in-next";

export function setPortalNextCookie(response: ServerResponse, next: unknown) {
  const path = safePortalNext(next);
  const cookie = serializeCookieHeader(COOKIE_NAME, path || "", {
    path: "/",
    maxAge: path ? 3600 : 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  // The auth client may already have written the PKCE verifier/session cookies.
  const existing = response.getHeader("Set-Cookie");
  response.setHeader("Set-Cookie", [
    ...(Array.isArray(existing) ? existing : existing ? [String(existing)] : []),
    cookie,
  ]);
}

export function consumePortalNextCookie(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const next = safePortalNext(
    parseCookieHeader(request.headers.cookie || "").find(
      (cookie) => cookie.name === COOKIE_NAME,
    )?.value,
  );
  setPortalNextCookie(response, undefined);
  return next;
}
