import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it, vi } from "vitest";
import { consumePortalNextCookie, setPortalNextCookie } from "./portalNextCookie.js";

function responseFor(cookie?: string) {
  const request = new IncomingMessage(new Socket());
  if (cookie) request.headers.cookie = cookie;
  return { request, response: new ServerResponse(request) };
}

describe("timesheet sign-in destination cookie", () => {
  it("preserves existing PKCE cookies and protects the destination in production", () => {
    const { response } = responseFor();
    vi.stubEnv("NODE_ENV", "production");
    try {
      response.setHeader("Set-Cookie", ["pkce-verifier=opaque; HttpOnly"]);
      setPortalNextCookie(response, "/timesheets");
      const cookies = response.getHeader("Set-Cookie") as string[];
      expect(cookies[0]).toBe("pkce-verifier=opaque; HttpOnly");
      expect(cookies[1]).toContain("portal-sign-in-next=%2Ftimesheets;");
      expect(cookies[1]).toContain("Max-Age=3600");
      expect(cookies[1]).toContain("Path=/");
      expect(cookies[1]).toContain("HttpOnly");
      expect(cookies[1]).toContain("Secure");
      expect(cookies[1]).toContain("SameSite=Lax");
      expect(cookies[1]).not.toContain("Domain=");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each(["/timesheets", "/admin/timesheets"])(
    "returns %s after sign-in and expires the pending cookie",
    (next) => {
      const { request, response } = responseFor(
        `unrelated=value; portal-sign-in-next=${encodeURIComponent(next)}`,
      );
      response.setHeader("Set-Cookie", "session=opaque; HttpOnly");
      expect(consumePortalNextCookie(request, response)).toBe(next);
      const cookies = response.getHeader("Set-Cookie") as string[];
      expect(cookies[0]).toBe("session=opaque; HttpOnly");
      expect(cookies[1]).toContain("portal-sign-in-next=;");
      expect(cookies[1]).toContain("Max-Age=0");
    },
  );

  it.each([undefined, "https://evil.example", "//evil.example", "/admin"])(
    "rejects an unapproved cookie destination: %j",
    (next) => {
      const { request, response } = responseFor(
        next ? `portal-sign-in-next=${encodeURIComponent(next)}` : undefined,
      );
      expect(consumePortalNextCookie(request, response)).toBeUndefined();
      setPortalNextCookie(response, next);
      const cookies = response.getHeader("Set-Cookie") as string[];
      expect(cookies.at(-1)).toContain("Max-Age=0");
    },
  );
});
