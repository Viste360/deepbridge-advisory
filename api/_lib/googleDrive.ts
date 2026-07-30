import { createSign, randomUUID } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function driveConfiguration() {
  const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
    ?.replace(/\\n/g, "\n")
    .trim();
  const folderId = process.env.GOOGLE_DRIVE_CONTRACTS_FOLDER_ID?.trim();
  const projectNumber = process.env.GCP_PROJECT_NUMBER?.trim();
  const workloadIdentityPoolId =
    process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const workloadIdentityProviderId =
    process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();
  return {
    clientEmail,
    privateKey,
    folderId,
    projectNumber,
    workloadIdentityPoolId,
    workloadIdentityProviderId,
  };
}

export function googleDriveArchiveConfigured() {
  const {
    clientEmail,
    privateKey,
    folderId,
    projectNumber,
    workloadIdentityPoolId,
    workloadIdentityProviderId,
  } = driveConfiguration();
  const keyAuthentication = Boolean(clientEmail && privateKey);
  const workloadIdentityAuthentication = Boolean(
    clientEmail &&
      projectNumber &&
      workloadIdentityPoolId &&
      workloadIdentityProviderId,
  );
  return Boolean(
    folderId && (keyAuthentication || workloadIdentityAuthentication),
  );
}

async function getServiceAccountKeyAccessToken() {
  const { clientEmail, privateKey } = driveConfiguration();
  if (!clientEmail || !privateKey)
    throw new Error("Google Drive archive credentials are not configured.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3_600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(privateKey))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !result.access_token)
    throw new Error(
      result.error_description || "Google Drive authentication failed.",
    );
  return result.access_token;
}

async function getWorkloadIdentityAccessToken() {
  const {
    clientEmail,
    projectNumber,
    workloadIdentityPoolId,
    workloadIdentityProviderId,
  } = driveConfiguration();
  if (
    !clientEmail ||
    !projectNumber ||
    !workloadIdentityPoolId ||
    !workloadIdentityProviderId
  ) {
    throw new Error("Google Drive workload identity is not configured.");
  }
  const audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${workloadIdentityPoolId}/providers/${workloadIdentityProviderId}`;
  const subjectToken = await getVercelOidcToken();
  const exchangeResponse = await fetch(
    "https://sts.googleapis.com/v1/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        audience,
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
        scope: "https://www.googleapis.com/auth/cloud-platform",
        subject_token: subjectToken,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      }),
    },
  );
  const exchangeResult = (await exchangeResponse.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!exchangeResponse.ok || !exchangeResult.access_token) {
    throw new Error(
      exchangeResult.error_description ||
        "Google workload identity exchange failed.",
    );
  }

  const impersonationResponse = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(clientEmail)}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${exchangeResult.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        scope: ["https://www.googleapis.com/auth/drive.file"],
        lifetime: "3600s",
      }),
    },
  );
  const impersonationResult = (await impersonationResponse.json()) as {
    accessToken?: string;
    error?: { message?: string };
  };
  if (!impersonationResponse.ok || !impersonationResult.accessToken) {
    throw new Error(
      impersonationResult.error?.message ||
        "Google service account impersonation failed.",
    );
  }
  return impersonationResult.accessToken;
}

async function getAccessToken() {
  const { privateKey } = driveConfiguration();
  return privateKey
    ? getServiceAccountKeyAccessToken()
    : getWorkloadIdentityAccessToken();
}

export async function archivePdfToGoogleDrive(input: {
  filename: string;
  data: Buffer;
  description: string;
  appProperties: Record<string, string>;
}) {
  const { folderId } = driveConfiguration();
  if (!folderId)
    throw new Error("The Google Drive contracts folder is not configured.");
  const token = await getAccessToken();
  const boundary = `deepbridge-${randomUUID()}`;
  const metadata = JSON.stringify({
    name: input.filename,
    parents: [folderId],
    description: input.description,
    mimeType: "application/pdf",
    appProperties: input.appProperties,
  });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
    ),
    input.data,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/related; boundary=${boundary}`,
        "content-length": String(body.length),
      },
      body,
    },
  );
  const result = (await response.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!response.ok || !result.id)
    throw new Error(
      result.error?.message || "The contract could not be archived in Drive.",
    );
  return result.id;
}
