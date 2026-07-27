import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient, type User } from "@supabase/supabase-js";
import { createPortalAuthClient } from "./authCookies.js";

export interface PortalServerUser {
  user: User;
  profile: {
    id: string;
    email: string;
    full_name: string;
    role: "consultant" | "admin";
    access_status: "invited" | "active" | "revoked";
  };
  accessToken: string;
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

export function getSupabaseAdmin() {
  return createClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function getSupabaseForUser(accessToken: string) {
  if (!accessToken)
    throw new PortalHttpError(401, "The session is invalid or has expired.");
  return createClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    },
  );
}

export function json(
  response: ServerResponse,
  status: number,
  value: Record<string, unknown>,
) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, private");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(value));
}

export async function readJsonBody(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  const parsedRequest = request as IncomingMessage & { body?: unknown };
  if (
    parsedRequest.body &&
    typeof parsedRequest.body === "object" &&
    !Buffer.isBuffer(parsedRequest.body)
  ) {
    return parsedRequest.body as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 100_000) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
    string,
    unknown
  >;
}

export async function readRawBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 2_000_000) throw new Error("Webhook body is too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function bearerToken(request: IncomingMessage) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function requirePortalUser(
  request: IncomingMessage,
  response: ServerResponse,
  requiredRole?: "admin",
): Promise<PortalServerUser> {
  if (!["GET", "HEAD"].includes(request.method ?? "GET")) {
    const origin = request.headers.origin;
    const forwardedHost = request.headers["x-forwarded-host"];
    const host =
      (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
      request.headers.host;
    if (origin && host) {
      let originHost: string;
      try {
        originHost = new URL(origin).host;
      } catch {
        throw new PortalHttpError(403, "Invalid request origin.");
      }
      if (originHost !== host)
        throw new PortalHttpError(403, "Cross-origin request rejected.");
    }
  }
  const bearer = bearerToken(request);
  const authClient = createPortalAuthClient(request, response);
  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error: userError,
  } = bearer
    ? await admin.auth.getUser(bearer)
    : await authClient.auth.getUser();
  if (userError || !user)
    throw new PortalHttpError(401, "The session is invalid or has expired.");

  const { data, error } = await admin
    .from("portal_profiles")
    .select("id, email, full_name, role, access_status")
    .eq("id", user.id)
    .single();
  if (error || !data)
    throw new PortalHttpError(403, "Portal access has not been granted.");
  if (data.access_status !== "active")
    throw new PortalHttpError(403, "Portal access is not active.");
  if (requiredRole && data.role !== requiredRole)
    throw new PortalHttpError(403, "Administrator access is required.");

  const {
    data: { session },
  } = bearer ? { data: { session: null } } : await authClient.auth.getSession();

  return {
    user,
    profile: data as PortalServerUser["profile"],
    accessToken: bearer ?? session?.access_token ?? "",
  };
}

export async function enforceRateLimit(
  request: IncomingMessage,
  userId: string,
  action: string,
  maximum: number,
  windowSeconds: number,
) {
  const forwarded = request.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded?.split(",")[0]?.trim() ?? "unknown");
  const rateKey = createHash("sha256")
    .update(`${userId}:${action}:${ip}`)
    .digest("hex");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("consume_portal_rate_limit", {
    requested_rate_key: rateKey,
    requested_action: action,
    requested_limit: maximum,
    requested_window_seconds: windowSeconds,
  });
  if (error) throw error;
  if (!data)
    throw new PortalHttpError(
      429,
      "Too many requests. Please wait and try again.",
    );
}

export function requestContext(request: IncomingMessage) {
  const forwarded = request.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]?.trim();
  return {
    ip_address: ipAddress || null,
    user_agent: request.headers["user-agent"]?.slice(0, 500) || null,
  };
}

export class PortalHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function handleApiError(response: ServerResponse, error: unknown) {
  if (error instanceof PortalHttpError) {
    json(response, error.status, { error: error.message });
    return;
  }
  console.error("Portal API error", error);
  json(response, 500, {
    error: "The secure service could not complete this request.",
  });
}
