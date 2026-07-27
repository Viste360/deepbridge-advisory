export type PortalRole = "consultant" | "admin";

export type DocumentStatus =
  | "not_reviewed"
  | "ready_to_sign"
  | "awaiting_deepbridge"
  | "completed"
  | "superseded"
  | "read";

export type ComplianceStatus =
  | "missing"
  | "uploaded"
  | "under_review"
  | "accepted"
  | "rejected"
  | "expired";

export interface PortalProfile {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  country: string;
  phone: string;
  role: PortalRole;
}

export interface Assignment {
  id: string;
  title: string;
  programme: string;
  customer: string;
  endCustomer: string;
  location: string;
  startDate: string;
  expectedEnd: string;
  onsiteExpectation: string;
  dailyRate: string;
  trialPeriod: string;
  notice: string;
  accommodation: string;
  travel: string;
  commercialContact: {
    name: string;
    role: string;
    email: string;
  };
}

export interface PortalDocument {
  id: string;
  title: string;
  description: string;
  category: "signature" | "acknowledgement" | "information";
  status: DocumentStatus;
  version: string;
  updatedAt: string;
  completedAt?: string;
  certificateAvailable?: boolean;
  storagePath?: string;
}

export interface ComplianceRequirement {
  id: string;
  consultantId?: string;
  consultantName?: string;
  consultantEmail?: string;
  title: string;
  description: string;
  status: ComplianceStatus;
  required: boolean;
  uploadedAt?: string;
  expiryDate?: string;
  administratorNote?: string;
  rejectionReason?: string;
  submissionId?: string;
  scanStatus?: "pending" | "clean" | "infected" | "failed";
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  internal: boolean;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  object: string;
  createdAt: string;
}

export interface PortalSnapshot {
  profile: PortalProfile;
  assignment: Assignment;
  documents: PortalDocument[];
  compliance: ComplianceRequirement[];
  tasks: OnboardingTask[];
  audit: AuditEvent[];
}
