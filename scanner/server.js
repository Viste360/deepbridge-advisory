import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = Number(process.env.PORT || 8080);
const supabaseUrl = required("SUPABASE_URL").replace(/\/+$/, "");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const portalCallbackUrl = required("PORTAL_SCAN_CALLBACK_URL");
const callbackSecret = required("MALWARE_SCAN_CALLBACK_SECRET");
const triggerSecret = required("MALWARE_SCAN_TRIGGER_SECRET");
const maximumBytes = 25 * 1024 * 1024;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function validSecret(value) {
  if (!value) return false;
  const expected = Buffer.from(triggerSecret);
  const provided = Buffer.from(value.replace(/^Bearer\s+/i, ""));
  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  );
}

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let total = 0;
  const chunks = [];
  for await (const chunk of request) {
    total += chunk.length;
    if (total > 16 * 1024) throw new Error("Request too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validScan(body) {
  const objectTypes = new Set([
    "document_version",
    "compliance_submission",
    "signature_artifact",
    "contract_version",
    "contract_artifact",
  ]);
  return (
    body &&
    objectTypes.has(body.objectType) &&
    /^[0-9a-f-]{36}$/i.test(body.objectId) &&
    typeof body.bucket === "string" &&
    /^[a-z0-9-]{3,80}$/.test(body.bucket) &&
    typeof body.storagePath === "string" &&
    body.storagePath.length > 0 &&
    body.storagePath.length <= 500 &&
    !body.storagePath.includes("..") &&
    (!["signature_artifact", "contract_artifact"].includes(body.objectType) ||
      body.artifactKind === "final" ||
      body.artifactKind === "certificate")
  );
}

function encodedPath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function downloadPrivateObject(bucket, storagePath) {
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath(storagePath)}`,
    {
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );
  if (!response.ok) throw new Error(`Object download failed (${response.status}).`);
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > maximumBytes) throw new Error("Object is too large.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maximumBytes)
    throw new Error("Object size is invalid.");
  return bytes;
}

async function clamScan(filePath) {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      "clamscan",
      ["--infected", "--no-summary", "--max-filesize=25M", filePath],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve("clean");
      else if (code === 1) resolve("infected");
      else reject(new Error(`ClamAV failed (${code}): ${stderr.slice(0, 200)}`));
    });
  });
}

async function callback(body, status) {
  const response = await fetch(portalCallbackUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${callbackSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      objectType: body.objectType,
      objectId: body.objectId,
      artifactKind: body.artifactKind,
      status,
    }),
  });
  if (!response.ok)
    throw new Error(`Portal callback failed (${response.status}).`);
}

async function handleScan(request, response) {
  if (!validSecret(request.headers.authorization))
    return json(response, 401, { error: "Unauthorized." });

  let body;
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "Invalid request." });
  }
  if (!validScan(body))
    return json(response, 400, { error: "Invalid scan target." });

  const directory = await mkdtemp(join(tmpdir(), "deepbridge-scan-"));
  const filePath = join(directory, "upload");
  let status = "failed";
  try {
    const bytes = await downloadPrivateObject(body.bucket, body.storagePath);
    await writeFile(filePath, bytes, { mode: 0o600 });
    status = await clamScan(filePath);
    await callback(body, status);
    return json(response, 200, { status });
  } catch (error) {
    try {
      await callback(body, "failed");
    } catch {
      // The scanner keeps the original error for its platform logs.
    }
    console.error(error instanceof Error ? error.message : "Scan failed.");
    return json(response, 502, { status: "failed" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health")
    return json(response, 200, { status: "ok", engine: "clamav" });
  if (request.method === "POST" && request.url === "/scan")
    return await handleScan(request, response);
  return json(response, 404, { error: "Not found." });
});

server.listen(port, "0.0.0.0");
