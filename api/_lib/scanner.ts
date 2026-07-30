import { PortalHttpError } from "./server.js";

export type ScanObjectType =
  | "document_version"
  | "compliance_submission"
  | "signature_artifact"
  | "contract_version"
  | "contract_artifact";

export interface ScanRequest {
  objectType: ScanObjectType;
  objectId: string;
  bucket: string;
  storagePath: string;
  artifactKind?: "final" | "certificate";
}

export function scannerConfigured() {
  return Boolean(
    process.env.MALWARE_SCAN_PROVIDER?.trim() &&
      process.env.MALWARE_SCAN_SERVICE_URL?.trim() &&
      process.env.MALWARE_SCAN_TRIGGER_SECRET?.trim() &&
      process.env.MALWARE_SCAN_CALLBACK_SECRET?.trim(),
  );
}

export async function requestMalwareScan(scan: ScanRequest) {
  const serviceUrl = process.env.MALWARE_SCAN_SERVICE_URL?.trim();
  const triggerSecret = process.env.MALWARE_SCAN_TRIGGER_SECRET?.trim();
  if (!scannerConfigured() || !serviceUrl || !triggerSecret) {
    throw new PortalHttpError(
      503,
      "The security scanner is not available. The file remains safely quarantined.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 285_000);
  try {
    const response = await fetch(`${serviceUrl.replace(/\/+$/, "")}/scan`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${triggerSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(scan),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new PortalHttpError(
        502,
        "The security scanner could not complete. The file remains safely quarantined.",
      );
    }
  } catch (error) {
    if (error instanceof PortalHttpError) throw error;
    throw new PortalHttpError(
      502,
      "The security scanner could not complete. The file remains safely quarantined.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
