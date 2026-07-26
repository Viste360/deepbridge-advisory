import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

export function createPortalAuthClient(
  request: IncomingMessage,
  response: ServerResponse,
) {
  return createServerClient(required("SUPABASE_URL"), required("SUPABASE_ANON_KEY"), {
    auth: {
      flowType: "pkce",
    },
    cookieOptions: {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.cookie ?? "");
      },
      setAll(cookiesToSet, headers) {
        const values = cookiesToSet.map(({ name, value, options }) =>
          serializeCookieHeader(name, value, {
            ...options,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "lax",
          } as CookieOptions),
        );
        response.setHeader("Set-Cookie", values);
        for (const [name, value] of Object.entries(headers)) {
          response.setHeader(name, value);
        }
      },
    },
  });
}
