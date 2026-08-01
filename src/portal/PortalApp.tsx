import {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { adminSnapshot, consultantSnapshot } from "./demoData";
import {
  acknowledgeDocument,
  completeAuthCallback,
  countersignAdminContract,
  createPortalCountersignature,
  createInvitation,
  discardSigningAttempt,
  getComplianceSubmissionAccess,
  getConsultantSignedUpload,
  getDocumentAccess,
  getAdminContractAccess,
  getPortalSession,
  listAdminContracts,
  listAdminAssignments,
  listAdminConsultants,
  listAdminDocumentCatalogue,
  listAdminOrganisations,
  listAdminSigningItems,
  loadPortalSnapshot,
  onPortalSessionChange,
  portalConfigured,
  portalDemoEnabled,
  prepareCountersignSource,
  recordGoogleSigningStep,
  removeAdminContractVersion,
  removeAdminDocumentVersion,
  retryAdminContractDriveArchive,
  retryAdminContractSecurityScan,
  retrySigningSecurityScan,
  reviewComplianceSubmission,
  saveAdminOrganisation,
  saveAdminAssignment,
  sendConsultantPortalLink,
  sendMagicLink,
  signInWithGoogle,
  signOutPortal,
  updateAdminConsultant,
  updateAdminContractDetails,
  updateAdminContractStatus,
  uploadComplianceFile,
  uploadComplianceFileAsAdmin,
  uploadCompletedSigningPack,
  uploadAdminDocumentVersion,
  uploadAdminContract,
  uploadAdminContractSignedPack,
  uploadManualSignedDocument,
  verifyAdminContractPdf,
  type AdminAssignment,
  type AdminContract,
  type AdminDocumentCatalogueItem,
  type AdminConsultant,
  type AdminOrganisation,
  type AdminSigningItem,
  type PortalBrowserSession,
  type UploadProgress,
  type ManualPdfPlacement,
} from "./portalApi";
import PdfWorker from "pdfjs-dist/build/pdf.worker.mjs?worker";

const googleSignInEnabled =
  import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";
import type {
  ComplianceRequirement,
  DocumentStatus,
  PortalDocument,
  PortalRole,
  PortalSnapshot,
} from "./types";
import "./portal.css";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);

async function openSecureUrl(
  createAccess: () => Promise<{ url?: string }>,
) {
  // Reserve the tab while the click is still a direct user gesture. Opening it
  // after the signed-link request resolves is blocked by several browsers.
  const preview = window.open("about:blank", "_blank");
  if (preview) {
    preview.opener = null;
    preview.document.title = "Preparing secure document";
    preview.document.body.textContent = "Preparing secure document…";
  }
  try {
    const result = await createAccess();
    if (!result.url)
      throw new Error("The secure viewing link could not be created.");
    if (preview && !preview.closed) preview.location.replace(result.url);
    else window.location.assign(result.url);
  } catch (error) {
    if (preview && !preview.closed) preview.close();
    throw error;
  }
}

interface PortalContextValue {
  snapshot: PortalSnapshot;
  demo: boolean;
  refresh: () => Promise<void>;
  setDemoRole: (role: PortalRole) => void;
  updateDocument: (
    documentId: string,
    updates: Partial<PortalDocument>,
  ) => void;
  updateCompliance: (
    requirementId: string,
    updates: Partial<ComplianceRequirement>,
  ) => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

function usePortal() {
  const value = useContext(PortalContext);
  if (!value) throw new Error("Portal context is unavailable.");
  return value;
}

function Brand() {
  return (
    <span className="portal-brand" aria-label="DeepBridge Advisory">
      <span className="portal-brand-mark" aria-hidden="true">
        <span>D</span>
        <span>B</span>
      </span>
      <span className="portal-brand-name">
        <strong>DeepBridge</strong>
        <span>Portal</span>
      </span>
    </span>
  );
}

function LoginPage({
  onDemoSignIn,
}: {
  onDemoSignIn: (role: PortalRole) => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{
    tone: "neutral" | "success" | "error";
    message: string;
  }>({
    tone: "neutral",
    message: "",
  });
  const [busy, setBusy] = useState(false);

  async function handleMagicLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus({ tone: "neutral", message: "" });
    try {
      await sendMagicLink(email.trim().toLowerCase());
      setStatus({
        tone: "success",
        message:
          "Check your inbox. The secure sign-in link expires shortly and can only be used once.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "We could not send the secure link.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Google sign-in is not available.",
      });
      setBusy(false);
    }
  }

  return (
    <main className="portal-login">
      <section className="portal-login-intro">
        <Brand />
        <div className="portal-login-copy">
          <p className="portal-kicker">Private &amp; secure</p>
          <h1>Your contracts, assignments and documents in one secure place.</h1>
          <p>
            Manage DeepBridge relationships and agreements, complete signing
            and keep controlled documents in one protected workspace.
          </p>
        </div>
        <div className="portal-security-points" aria-label="Security features">
          <span>Invitation only</span>
          <span>Password-free access</span>
          <span>Private document storage</span>
        </div>
      </section>

      <section className="portal-login-panel" aria-labelledby="sign-in-heading">
        <div className="portal-login-card">
          <div>
            <p className="portal-kicker">Welcome back</p>
            <h2 id="sign-in-heading">Sign in to your portal</h2>
            <p className="portal-muted">
              Use the email address that received your DeepBridge invitation.
            </p>
          </div>

          <form onSubmit={handleMagicLink} className="portal-form">
            <label htmlFor="portal-email">Email address</label>
            <input
              id="portal-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              disabled={!portalConfigured || busy}
            />
            <button
              className="portal-button portal-button-primary"
              type="submit"
              disabled={!portalConfigured || busy}
            >
              {busy ? "Sending secure link…" : "Email me a secure link"}
            </button>
          </form>

          {googleSignInEnabled ? (
            <>
              <div className="portal-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="portal-button portal-button-secondary"
                onClick={handleGoogle}
                disabled={!portalConfigured || busy}
              >
                Continue with Google
              </button>
            </>
          ) : null}

          {status.message ? (
            <p className={`portal-form-message ${status.tone}`} role="status">
              {status.message}
            </p>
          ) : null}

          {!portalConfigured ? (
            <p className="portal-form-message neutral">
              Secure access will be enabled when the portal environment is
              connected.
            </p>
          ) : null}

          {portalDemoEnabled ? (
            <div className="portal-demo-access">
              <p>
                <strong>Local review mode</strong>
                <br />
                Preview either role without contacting a live service.
              </p>
              <div>
                <button type="button" onClick={() => onDemoSignIn("consultant")}>
                  Preview consultant
                </button>
                <button type="button" onClick={() => onDemoSignIn("admin")}>
                  Preview administrator
                </button>
              </div>
            </div>
          ) : null}

          <p className="portal-login-footnote">
            Access is restricted to invited users. By continuing, you agree to
            the <Link to="/terms">portal terms</Link> and acknowledge the{" "}
            <Link to="/privacy">privacy notice</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code") || undefined;
    const tokenHash = search.get("token_hash") || undefined;
    const type = search.get("type") || undefined;
    const notice = search.get("notice") || undefined;
    const hasVerification = Boolean(code || (tokenHash && type));
    const complete = hasVerification
      ? completeAuthCallback({ code, tokenHash, type }).then(() =>
          getPortalSession(),
        )
      : getPortalSession();
    complete
      .then((session) => {
        if (!active) return;
        if (session)
          window.location.replace(
            session.role === "admin"
              ? "/admin"
              : `/dashboard${notice ? `?notice=${encodeURIComponent(notice)}` : ""}`,
          );
        else setError("The secure link could not create a portal session.");
      })
      .catch((callbackError: unknown) => {
        if (active)
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : "The secure link is invalid or has expired.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="portal-centred-state">
      <Brand />
      {error ? (
        <>
          <h1>Sign-in link could not be completed</h1>
          <p>{error}</p>
          <Link className="portal-button" to="/login">
            Request a new secure link
          </Link>
        </>
      ) : (
        <>
          <span className="portal-loader" aria-hidden="true" />
          <h1>Completing secure sign-in</h1>
          <p>Please keep this window open for a moment.</p>
        </>
      )}
    </main>
  );
}

function PortalLegalPage({ kind }: { kind: "privacy" | "terms" }) {
  return (
    <main className="portal-legal">
      <Link to="/login">
        <Brand />
      </Link>
      <article>
        <p className="portal-kicker">
          {kind === "privacy" ? "Privacy information" : "Portal terms"}
        </p>
        <h1>
          {kind === "privacy"
            ? "How portal information is handled"
            : "Using the DeepBridge Portal"}
        </h1>
        {kind === "privacy" ? (
          <>
            <p>
              DustDeep Ltd, trading as DeepBridge Advisory, uses the information
              in this portal to administer consulting engagements, complete
              proportionate compliance checks, manage assignments and maintain
              contractual records.
            </p>
            <h2>What is collected</h2>
            <p>
              The portal may hold contact and business information, agreements,
              compliance evidence, identity evidence, banking confirmation,
              onboarding progress and a security audit trail. Only information
              required for contracting, compliance and assignment administration
              should be uploaded.
            </p>
            <h2>Access and retention</h2>
            <p>
              Access is limited by role. Files are kept in private storage and
              are not made public. Retention depends on the document category
              and applicable legal, tax, insurance and contractual requirements.
              Contact DeepBridge to request access, correction, restriction or
              other applicable data protection rights.
            </p>
          </>
        ) : (
          <>
            <p>
              This private service is for consultants and authorised DeepBridge
              personnel. Invitations are personal and must not be forwarded.
              Users must keep their email account secure and report suspected
              unauthorised access promptly.
            </p>
            <h2>Documents and signing</h2>
            <p>
              Document statuses shown in the portal are administrative
              indicators. A signature is treated as complete only after the
              Google Workspace completed PDF and audit trail have been verified
              and security-checked by DeepBridge.
            </p>
            <h2>Uploads</h2>
            <p>
              Upload only requested files that are accurate, current and lawful
              to provide. Do not include unrelated sensitive information.
            </p>
          </>
        )}
        <p>
          DustDeep Ltd · Company number 16775578 · Kemp House, 152–160 City
          Road, London, EC1V 2NX, United Kingdom
        </p>
        <Link className="portal-text-link" to="/login">
          Return to sign in
        </Link>
      </article>
    </main>
  );
}

const consultantNavigation = [
  ["Dashboard", "/dashboard"],
  ["Assignment", "/assignment"],
  ["Documents", "/documents"],
  ["Compliance", "/compliance"],
  ["Onboarding", "/onboarding"],
  ["Support", "/support"],
  ["Profile", "/profile"],
] as const;

const adminNavigation = [
  ["Overview", "/admin"],
  ["Organisations", "/admin/organisations"],
  ["Contracts", "/admin/contracts"],
  ["Consultants", "/admin/consultants"],
  ["Projects", "/admin/assignments"],
  ["Documents", "/admin/documents"],
  ["Signing", "/admin/signing"],
  ["Compliance", "/admin/compliance"],
  ["Audit", "/admin/audit"],
] as const;

function PortalShell({
  children,
  onSignOut,
}: {
  children: ReactNode;
  onSignOut: () => void;
}) {
  const { snapshot, demo, setDemoRole } = usePortal();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation =
    snapshot.profile.role === "admin" ? adminNavigation : consultantNavigation;

  useEffect(() => {
    document.title = `DeepBridge Portal`;
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute("content", "noindex, nofollow, noarchive");
  }, [location.pathname]);

  const initials = snapshot.profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="portal-app-shell">
      <a href="#portal-main" className="portal-skip-link">
        Skip to main content
      </a>
      <aside className={`portal-sidebar ${menuOpen ? "open" : ""}`}>
        <Link
          to={snapshot.profile.role === "admin" ? "/admin" : "/dashboard"}
          className="portal-sidebar-brand"
        >
          <Brand />
        </Link>
        <nav aria-label="Portal" onClick={() => setMenuOpen(false)}>
          {navigation.map(([label, href]) => {
            const active =
              href === "/admin"
                ? location.pathname === href
                : location.pathname === href ||
                  location.pathname.startsWith(`${href}/`);
            return (
              <Link key={href} to={href} className={active ? "active" : ""}>
                <span className="portal-nav-dot" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="portal-sidebar-footer">
          <span className="portal-security-label">Secure portal</span>
          <p>Private access · Activity recorded</p>
        </div>
      </aside>

      {menuOpen ? (
        <button
          className="portal-menu-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="portal-main-column">
        <header className="portal-topbar">
          <button
            type="button"
            className="portal-menu-button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <span className="portal-mobile-title">DeepBridge portal</span>
          <div className="portal-account">
            {demo ? (
              <label className="portal-role-switch">
                <span>Preview</span>
                <select
                  value={snapshot.profile.role}
                  onChange={(event) =>
                    setDemoRole(event.target.value as PortalRole)
                  }
                  aria-label="Preview portal role"
                >
                  <option value="consultant">Consultant</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
            ) : null}
            <div className="portal-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="portal-account-copy">
              <strong>{snapshot.profile.fullName}</strong>
              <span>
                {snapshot.profile.role === "admin"
                  ? "Administrator"
                  : "Independent consultant"}
              </span>
            </div>
            <button type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </header>
        <main id="portal-main" className="portal-main" tabIndex={-1}>
          {demo ? (
            <div className="portal-preview-banner" role="status">
              Local review mode — actions are simulated and no information
              leaves this device.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="portal-page-header">
      <div>
        <p className="portal-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="portal-page-action">{action}</div> : null}
    </header>
  );
}

function StatusPill({
  status,
}: {
  status:
    | DocumentStatus
    | ComplianceRequirement["status"]
    | "active"
    | "invited"
    | "revoked";
}) {
  const labels: Record<string, string> = {
    not_reviewed: "Not reviewed",
    ready_to_sign: "Ready to sign",
    awaiting_deepbridge: "Awaiting DeepBridge",
    completed: "Completed",
    superseded: "Superseded",
    read: "Read",
    missing: "Missing",
    uploaded: "Uploaded",
    under_review: "Under review",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
    active: "Active",
    invited: "Invited",
    revoked: "Revoked",
  };
  return (
    <span className={`portal-status status-${status}`}>
      <span aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}

function ProgressRing({ complete, total }: { complete: number; total: number }) {
  const percentage = total ? Math.round((complete / total) * 100) : 0;
  const progressStep = Math.round(percentage / 5) * 5;
  return (
    <div
      className={`portal-progress-ring progress-${progressStep}`}
      role="img"
      aria-label={`${percentage}% complete`}
    >
      <div>
        <strong>{percentage}%</strong>
        <span>complete</span>
      </div>
    </div>
  );
}

function ConsultantDashboard() {
  const { snapshot } = usePortal();
  const notice = new URLSearchParams(window.location.search).get("notice");
  const visibleTasks = snapshot.tasks.filter((task) => !task.internal);
  const completedTasks = visibleTasks.filter((task) => task.complete).length;
  const outstandingDocs = snapshot.documents.filter(
    (document) =>
      document.category === "signature" &&
      ["not_reviewed", "ready_to_sign"].includes(document.status),
  );
  const outstandingCompliance = snapshot.compliance.filter(
    (requirement) =>
      requirement.required &&
      ["missing", "rejected", "expired"].includes(requirement.status),
  );

  return (
    <>
      <PageHeader
        eyebrow="Consultant dashboard"
        title={`Good morning, ${snapshot.profile.fullName.split(" ")[0]}.`}
        description="Here is what needs your attention before the assignment begins."
      />

      {notice === "documents-ready" ? (
        <div className="portal-form-message success portal-dashboard-notice">
          <strong>Your DeepBridge documents are ready.</strong>{" "}
          Open Agreements and guidance to review or download your signed
          contract and consultant pack.{" "}
          <Link to="/documents">View documents</Link>
        </div>
      ) : null}

      <section className="portal-welcome-grid">
        <article className="portal-feature-card">
          <div>
            <p className="portal-card-label">Current assignment</p>
            <StatusPill status="active" />
          </div>
          <h2>{snapshot.assignment.title}</h2>
          <p>{snapshot.assignment.programme}</p>
          <dl className="portal-compact-details">
            <div>
              <dt>End customer</dt>
              <dd>{snapshot.assignment.endCustomer}</dd>
            </div>
            <div>
              <dt>Primary location</dt>
              <dd>{snapshot.assignment.location}</dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>{snapshot.assignment.startDate}</dd>
            </div>
          </dl>
          <Link className="portal-arrow-link" to="/assignment">
            View assignment details <span aria-hidden="true">→</span>
          </Link>
        </article>

        <article className="portal-progress-card">
          <ProgressRing complete={completedTasks} total={visibleTasks.length} />
          <div>
            <p className="portal-card-label">Onboarding progress</p>
            <h2>
              {completedTasks} of {visibleTasks.length} steps complete
            </h2>
            <p>
              Your progress updates automatically as documents are signed and
              compliance evidence is accepted.
            </p>
            <Link className="portal-arrow-link" to="/onboarding">
              Review checklist <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="portal-section">
        <div className="portal-section-heading">
          <div>
            <p className="portal-card-label">Action centre</p>
            <h2>Your next steps</h2>
          </div>
          <span>
            {outstandingDocs.length + outstandingCompliance.length} outstanding
          </span>
        </div>
        <div className="portal-action-list">
          {outstandingDocs.map((document) => (
            <Link
              className="portal-action-row"
              to={`/documents/${document.id}`}
              key={document.id}
            >
              <span className="portal-action-icon signature" aria-hidden="true">
                ↗
              </span>
              <span>
                <strong>{document.title}</strong>
                <small>Review and sign through the secure signing service</small>
              </span>
              <StatusPill status={document.status} />
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {outstandingCompliance.slice(0, 3).map((requirement) => (
            <Link
              className="portal-action-row"
              to="/compliance"
              key={requirement.id}
            >
              <span className="portal-action-icon upload" aria-hidden="true">
                ↑
              </span>
              <span>
                <strong>{requirement.title}</strong>
                <small>Upload the requested compliance evidence</small>
              </span>
              <StatusPill status={requirement.status} />
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {outstandingDocs.length + outstandingCompliance.length === 0 ? (
            <div className="portal-empty-row">
              <span aria-hidden="true">✓</span>
              <p>
                <strong>You are up to date.</strong>
                <br />
                There are no actions waiting for you.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="portal-contact-strip">
        <div>
          <p className="portal-card-label">Your DeepBridge contact</p>
          <h2>{snapshot.assignment.commercialContact.name}</h2>
          <p>{snapshot.assignment.commercialContact.role}</p>
        </div>
        <a
          className="portal-button portal-button-secondary"
          href={`mailto:${snapshot.assignment.commercialContact.email}`}
        >
          Email your contact
        </a>
      </section>
    </>
  );
}

function AssignmentPage() {
  const { snapshot } = usePortal();
  const assignment = snapshot.assignment;
  const details = [
    ["Role", assignment.title],
    ["Programme", assignment.programme],
    ["Customer", assignment.customer],
    ["End customer", assignment.endCustomer],
    ["Primary location", assignment.location],
    ["Start date", assignment.startDate],
    ["Expected continuation", assignment.expectedEnd],
    ["Onsite expectation", assignment.onsiteExpectation],
    ["Daily fee", assignment.dailyRate],
    ["Initial trial period", assignment.trialPeriod],
    ["Standard notice", assignment.notice],
    ["Accommodation", assignment.accommodation],
    ["Vehicle travel", assignment.travel],
  ];
  return (
    <>
      <PageHeader
        eyebrow="Assignment"
        title={assignment.title}
        description="The practical and commercial summary for your current DeepBridge engagement."
        action={<StatusPill status="active" />}
      />
      <div className="portal-two-column">
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <p className="portal-card-label">Assignment summary</p>
            <h2>{assignment.programme}</h2>
          </div>
          <dl className="portal-detail-list">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <aside className="portal-stack">
          <section className="portal-panel portal-dark-panel">
            <p className="portal-card-label">Commercial contact</p>
            <h2>{assignment.commercialContact.name}</h2>
            <p>{assignment.commercialContact.role}</p>
            <a href={`mailto:${assignment.commercialContact.email}`}>
              {assignment.commercialContact.email}
            </a>
          </section>
          <section className="portal-panel portal-note-panel">
            <p className="portal-card-label">Important</p>
            <h2>The signed documents govern</h2>
            <p>
              This page is a convenient administrative summary. If any detail
              differs, the completed Framework Agreement and Statement of Work
              are the authoritative records.
            </p>
            <Link className="portal-arrow-link" to="/documents">
              Open agreements <span aria-hidden="true">→</span>
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}

const categoryCopy = {
  signature: {
    title: "Signature required",
    description: "Securely signed through Google Workspace eSignature.",
  },
  acknowledgement: {
    title: "Read and acknowledge",
    description: "Confirm that you have read the current policy version.",
  },
  information: {
    title: "Information",
    description: "Reference material for your assignment and mobilisation.",
  },
};

function DocumentsPage() {
  const { snapshot } = usePortal();
  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Agreements and guidance"
        description="Review the version, status and required action for each document assigned to you."
      />
      {(["signature", "acknowledgement", "information"] as const).map(
        (category) => {
          const documents = snapshot.documents.filter(
            (document) => document.category === category,
          );
          return (
            <section className="portal-section" key={category}>
              <div className="portal-section-heading">
                <div>
                  <p className="portal-card-label">
                    {categoryCopy[category].title}
                  </p>
                  <h2>{categoryCopy[category].description}</h2>
                </div>
              </div>
              <div className="portal-document-list">
                {documents.map((document) => (
                  <Link
                    className="portal-document-row"
                    to={`/documents/${document.id}`}
                    key={document.id}
                  >
                    <span className="portal-document-glyph" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span>
                      <strong>{document.title}</strong>
                      <small>
                        Version {document.version} · Updated {document.updatedAt}
                      </small>
                    </span>
                    <StatusPill status={document.status} />
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        },
      )}
    </>
  );
}

function DocumentDetailPage() {
  const { documentId } = useParams();
  const { snapshot, demo, refresh, updateDocument } = usePortal();
  const document = snapshot.documents.find((item) => item.id === documentId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [manualSignedPdf, setManualSignedPdf] = useState<File | null>(null);

  if (!document) return <Navigate to="/documents" replace />;
  const selectedDocument = document;

  async function handlePrimaryAction() {
    setBusy(true);
    setMessage("");
    try {
      if (selectedDocument.category === "signature") {
        if (selectedDocument.status === "completed") {
          if (demo) {
            setMessage("Completed PDF download requested securely.");
          } else {
            await openSecureUrl(() =>
              getDocumentAccess(selectedDocument.id, "final"),
            );
          }
        } else if (selectedDocument.status === "ready_to_sign") {
          setMessage(
            "Open the Google Workspace eSignature email sent to your registered address. Review every page, complete the highlighted fields and select Mark complete.",
          );
        } else if (selectedDocument.status === "awaiting_deepbridge") {
          setMessage(
            "Your signature is recorded. DeepBridge is completing the countersignature; the final PDF and audit trail will appear here afterwards.",
          );
        } else {
          setMessage(
            "DeepBridge is preparing the Google Workspace signature request. You will receive an email when it is ready.",
          );
        }
      } else if (selectedDocument.category === "acknowledgement") {
        if (demo) {
          updateDocument(selectedDocument.id, {
            status: "read",
            completedAt: new Date().toLocaleDateString("en-GB"),
          });
        } else {
          await acknowledgeDocument(selectedDocument.id);
          await refresh();
        }
        setMessage("Your acknowledgement has been recorded.");
      } else if (demo) {
        setMessage("Document view recorded.");
      } else {
        await openSecureUrl(() =>
          getDocumentAccess(selectedDocument.id, "source"),
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The action could not complete.",
      );
    } finally {
      setBusy(false);
    }
  }

  const primaryLabel =
    document.category === "signature"
      ? document.status === "completed"
        ? "Download completed PDF"
        : document.status === "awaiting_deepbridge"
          ? "View signing status"
          : document.status === "ready_to_sign"
            ? "How to sign"
            : "Signature request pending"
      : document.category === "acknowledgement"
        ? document.status === "read"
          ? "Acknowledged"
          : "Confirm read"
        : "Open document";

  async function handleDocumentAccess(
    kind: "source" | "final" | "certificate",
  ) {
    setBusy(true);
    setMessage("");
    try {
      if (demo) {
        setMessage(
          kind === "source"
            ? "Approved PDF view requested securely."
            : "Secure download requested.",
        );
        return;
      }
      await openSecureUrl(() =>
        getDocumentAccess(selectedDocument.id, kind),
      );
    } catch (accessError) {
      setMessage(
        accessError instanceof Error
          ? accessError.message
          : "The document is not available.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSignedUpload() {
    if (!manualSignedPdf) return;
    setBusy(true);
    setMessage("");
    try {
      if (manualSignedPdf.type !== "application/pdf") {
        throw new Error("Choose a PDF containing the signed document.");
      }
      if (manualSignedPdf.size > 25 * 1024 * 1024) {
        throw new Error("The maximum signed PDF size is 25 MB.");
      }
      if (demo) {
        updateDocument(selectedDocument.id, {
          status: "awaiting_deepbridge",
        });
      } else {
        await uploadManualSignedDocument({
          assignedDocumentId: selectedDocument.id,
          file: manualSignedPdf,
        });
        await refresh();
      }
      setManualSignedPdf(null);
      setMessage(
        "Your signed PDF passed securely to DeepBridge for review and countersignature.",
      );
    } catch (uploadError) {
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "The signed PDF could not be uploaded.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="portal-breadcrumb" aria-label="Breadcrumb">
        <Link to="/documents">Documents</Link>
        <span aria-hidden="true">/</span>
        <span>{document.title}</span>
      </nav>
      <PageHeader
        eyebrow={categoryCopy[document.category].title}
        title={document.title}
        description={document.description}
        action={<StatusPill status={document.status} />}
      />
      <div className="portal-document-layout">
        <section className="portal-document-viewer" aria-label="Document preview">
          <div className="portal-viewer-toolbar">
            <span>Version {document.version}</span>
            <span>Updated {document.updatedAt}</span>
          </div>
          <div className="portal-paper">
            <Brand />
            <p className="portal-document-overline">DustDeep Ltd</p>
            <h2>{document.title}</h2>
            <p className="portal-document-lede">{document.description}</p>
            <div className="portal-document-rule" />
            <h3>Document preview</h3>
            <p>
              The approved PDF will appear here from private storage. Access is
              granted through a short-lived signed link after the authenticated
              user and document assignment have been verified.
            </p>
            <p>
              Google Workspace sends the signing request to your verified email
              address. The portal never generates, captures or infers a
              signature; it releases the completed PDF and audit trail only
              after DeepBridge has verified and security-checked both files.
            </p>
          </div>
        </section>
        <aside className="portal-document-actions">
          <section className="portal-panel">
            <p className="portal-card-label">Required action</p>
            <h2>
              {document.category === "signature"
                ? document.status === "completed"
                  ? "Completed signing pack"
                  : "Sign with Google Workspace"
                : document.category === "acknowledgement"
                  ? "Read this version"
                  : "For your information"}
            </h2>
            <p>
              {document.category === "signature"
                ? document.status === "completed"
                  ? "Download the locked completed agreement and its Google audit trail."
                  : document.status === "awaiting_deepbridge"
                    ? "No further action is needed from you while DeepBridge countersigns."
                    : document.status === "ready_to_sign"
                      ? "Use the secure link in the Google eSignature email sent to your registered address."
                      : "DeepBridge will email you when the approved request is ready."
                : document.category === "acknowledgement"
                  ? "Your confirmation records the exact document version and time."
                  : "No signature or legal acknowledgement is requested for this item."}
            </p>
            <button
              type="button"
              className="portal-button portal-button-primary"
              onClick={handlePrimaryAction}
              disabled={
                busy ||
                (document.category === "signature" &&
                  document.status === "not_reviewed") ||
                (document.category === "acknowledgement" &&
                  document.status === "read")
              }
            >
              {busy ? "Please wait…" : primaryLabel}
            </button>
            {document.category !== "information" ? (
              <button
                type="button"
                className="portal-button portal-button-secondary"
                onClick={() => handleDocumentAccess("source")}
                disabled={busy}
              >
                Open / download approved PDF
              </button>
            ) : null}
            {document.status === "completed" &&
            document.certificateAvailable ? (
              <button
                type="button"
                className="portal-button portal-button-secondary"
                onClick={() => handleDocumentAccess("certificate")}
                disabled={busy}
              >
                Download audit certificate
              </button>
            ) : null}
            {message ? (
              <p className="portal-inline-message" role="status">
                {message}
              </p>
            ) : null}
          </section>
          {document.category === "signature" &&
          document.status !== "completed" ? (
            <section className="portal-panel portal-signing-steps">
              <p className="portal-card-label">What happens next</p>
              <ol>
                <li>
                  <span>1</span>
                  <p>
                    <strong>Check your email</strong>
                    <small>
                      Google sends the request to {snapshot.profile.email}.
                    </small>
                  </p>
                </li>
                <li>
                  <span>2</span>
                  <p>
                    <strong>Review and sign</strong>
                    <small>
                      Complete only the fields assigned to you and mark the
                      request complete.
                    </small>
                  </p>
                </li>
                <li>
                  <span>3</span>
                  <p>
                    <strong>Return here</strong>
                    <small>
                      The final agreement and audit trail appear after
                      DeepBridge countersigns and verifies the files.
                    </small>
                  </p>
                </li>
              </ol>
            </section>
          ) : null}
          {document.category === "signature" &&
          ["not_reviewed", "ready_to_sign"].includes(document.status) ? (
            <section className="portal-panel portal-signing-steps">
              <p className="portal-card-label">Signing fallback</p>
              <h2>Upload an externally signed PDF</h2>
              <p>
                If Google signing is unavailable, download the approved PDF,
                sign it with your usual PDF signing tool or by hand, and upload
                the complete signed PDF here. DeepBridge must still review and
                countersign it before the agreement becomes complete.
              </p>
              <label htmlFor="manual-signed-pdf">Signed PDF</label>
              <input
                id="manual-signed-pdf"
                type="file"
                accept=".pdf,application/pdf"
                disabled={busy}
                onChange={(event) =>
                  setManualSignedPdf(event.target.files?.[0] ?? null)
                }
              />
              <small>
                PDF only · maximum 25 MB · private and malware-scanned
              </small>
              <button
                type="button"
                className="portal-button portal-button-secondary"
                disabled={!manualSignedPdf || busy}
                onClick={() => void handleManualSignedUpload()}
              >
                {busy ? "Uploading and scanning…" : "Upload signed PDF"}
              </button>
            </section>
          ) : null}
          <section className="portal-panel portal-note-panel">
            <p className="portal-card-label">Document record</p>
            <dl className="portal-mini-list">
              <div>
                <dt>Version</dt>
                <dd>{document.version}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{document.updatedAt}</dd>
              </div>
              {document.completedAt ? (
                <div>
                  <dt>Completed</dt>
                  <dd>{document.completedAt}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function CompliancePage() {
  const { snapshot, demo, refresh, updateCompliance } = usePortal();
  const [selected, setSelected] = useState<ComplianceRequirement | null>(null);
  const [message, setMessage] = useState("");

  const accepted = snapshot.compliance.filter(
    (item) => item.status === "accepted",
  ).length;

  async function handleUpload(
    requirement: ComplianceRequirement,
    file: File,
    expiryDate: string,
  ) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (
      !ALLOWED_UPLOAD_TYPES.has(file.type) ||
      !ALLOWED_UPLOAD_EXTENSIONS.has(extension)
    ) {
      throw new Error("Upload a PDF, JPG or PNG file.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("The maximum file size is 10 MB.");
    }
    if (demo) {
      updateCompliance(requirement.id, {
        status: "uploaded",
        uploadedAt: new Date().toLocaleDateString("en-GB"),
        expiryDate: expiryDate || undefined,
        submissionId: `demo-${requirement.id}`,
      });
    } else {
      await uploadComplianceFile(requirement.id, file, expiryDate);
      await refresh();
    }
    setMessage(`${requirement.title} uploaded and queued for security checks.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Secure document upload"
        description="Only upload the information requested for contracting, compliance and assignment administration."
        action={
          <div className="portal-stat-chip">
            <strong>{accepted}</strong>
            <span>accepted</span>
          </div>
        }
      />
      <div className="portal-privacy-callout">
        <span aria-hidden="true">i</span>
        <p>
          Files are stored privately and checked before review. PDF, JPG and PNG
          files are accepted, up to 10 MB each. Redact unrelated personal
          information where appropriate.{" "}
          <Link to="/privacy">Read the privacy information</Link>.
        </p>
      </div>
      {message ? (
        <p className="portal-form-message success" role="status">
          {message}
        </p>
      ) : null}
      <section className="portal-compliance-grid">
        {snapshot.compliance.map((requirement) => (
          <article className="portal-compliance-card" key={requirement.id}>
            <div>
              <span className="portal-file-icon" aria-hidden="true">
                ↑
              </span>
              <StatusPill status={requirement.status} />
            </div>
            <p className="portal-card-label">
              {requirement.required ? "Required" : "Where applicable"}
            </p>
            <h2>{requirement.title}</h2>
            <p>{requirement.description}</p>
            <dl className="portal-mini-list">
              {requirement.uploadedAt ? (
                <div>
                  <dt>Uploaded</dt>
                  <dd>{requirement.uploadedAt}</dd>
                </div>
              ) : null}
              {requirement.expiryDate ? (
                <div>
                  <dt>Expiry date</dt>
                  <dd>{requirement.expiryDate}</dd>
                </div>
              ) : null}
              {requirement.administratorNote ? (
                <div>
                  <dt>Administrator note</dt>
                  <dd>{requirement.administratorNote}</dd>
                </div>
              ) : null}
              {requirement.rejectionReason ? (
                <div>
                  <dt>Reason</dt>
                  <dd>{requirement.rejectionReason}</dd>
                </div>
              ) : null}
            </dl>
            <button
              type="button"
              className="portal-button portal-button-secondary"
              onClick={() => setSelected(requirement)}
            >
              {["missing", "rejected", "expired"].includes(requirement.status)
                ? "Upload document"
                : "Upload replacement"}
            </button>
          </article>
        ))}
      </section>
      {selected ? (
        <UploadDialog
          requirement={selected}
          onClose={() => setSelected(null)}
          onUpload={handleUpload}
        />
      ) : null}
    </>
  );
}

function UploadDialog({
  requirement,
  onClose,
  onUpload,
  contextLabel = "Secure upload",
  introduction = "The selected file is uploaded to private quarantine storage and is not available to reviewers until the security check passes.",
}: {
  requirement: ComplianceRequirement;
  onClose: () => void;
  onUpload: (
    requirement: ComplianceRequirement,
    file: File,
    expiryDate: string,
  ) => Promise<void>;
  contextLabel?: string;
  introduction?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dialogRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await onUpload(requirement, file, expiryDate);
      onClose();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The file could not be uploaded.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button
          type="button"
          className="portal-modal-close"
          aria-label="Close upload"
          onClick={onClose}
        >
          ×
        </button>
        <p className="portal-kicker">{contextLabel}</p>
        <h2 id="upload-title">{requirement.title}</h2>
        <p>{introduction}</p>
        <form className="portal-form" onSubmit={submit}>
          <label htmlFor="compliance-file">Choose file</label>
          <input
            id="compliance-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <small>PDF, JPG or PNG · maximum 10 MB</small>
          <label htmlFor="expiry-date">Expiry date (if applicable)</label>
          <input
            id="expiry-date"
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
          />
          {error ? (
            <p className="portal-form-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              className="portal-button portal-button-secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              type="submit"
              disabled={!file || busy}
            >
              {busy ? "Uploading securely…" : "Upload securely"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OnboardingPage() {
  const { snapshot } = usePortal();
  const tasks = snapshot.tasks.filter((task) => !task.internal);
  const completed = tasks.filter((task) => task.complete).length;
  return (
    <>
      <PageHeader
        eyebrow="Onboarding"
        title="Your mobilisation checklist"
        description="Only actions relevant to you are shown here. DeepBridge manages internal approvals separately."
        action={<ProgressRing complete={completed} total={tasks.length} />}
      />
      <section className="portal-panel">
        <ol className="portal-checklist">
          {tasks.map((task, index) => (
            <li className={task.complete ? "complete" : ""} key={task.id}>
              <span className="portal-check-marker" aria-hidden="true">
                {task.complete ? "✓" : index + 1}
              </span>
              <div>
                <strong>{task.title}</strong>
                <p>{task.description}</p>
              </div>
              <span>{task.complete ? "Complete" : "Outstanding"}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function SupportPage() {
  const { snapshot } = usePortal();
  const contact = snapshot.assignment.commercialContact;
  return (
    <>
      <PageHeader
        eyebrow="Messages & support"
        title="How can we help?"
        description="Contact your assigned DeepBridge representative or report a portal problem."
      />
      <div className="portal-support-grid">
        <article className="portal-panel portal-dark-panel">
          <p className="portal-card-label">Assigned contact</p>
          <h2>{contact.name}</h2>
          <p>{contact.role}</p>
          <a
            className="portal-button portal-button-light"
            href={`mailto:${contact.email}`}
          >
            Email {contact.name.split(" ")[0]}
          </a>
        </article>
        <article className="portal-panel">
          <p className="portal-card-label">Portal support</p>
          <h2>Report a problem</h2>
          <p>
            Tell us what you were trying to do and the page where the problem
            occurred. Do not email identity documents or banking details.
          </p>
          <a
            className="portal-button portal-button-secondary"
            href="mailto:support@deepbridgeadvisory.co.uk?subject=Consultant%20portal%20support"
          >
            Email portal support
          </a>
        </article>
        <article className="portal-panel">
          <p className="portal-card-label">Requested document</p>
          <h2>Upload compliance evidence</h2>
          <p>
            Use the protected compliance area whenever DeepBridge asks for a new
            or replacement file.
          </p>
          <Link className="portal-button portal-button-secondary" to="/compliance">
            Go to secure uploads
          </Link>
        </article>
      </div>
    </>
  );
}

function ProfilePage() {
  const { snapshot } = usePortal();
  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Your portal profile"
        description="Contact DeepBridge if your legal name, business identity or country changes."
      />
      <section className="portal-panel portal-profile-panel">
        <div className="portal-profile-heading">
          <div className="portal-profile-avatar" aria-hidden="true">
            {snapshot.profile.fullName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <h2>{snapshot.profile.fullName}</h2>
            <p>{snapshot.profile.businessName}</p>
          </div>
          <StatusPill status="active" />
        </div>
        <dl className="portal-detail-list">
          <div>
            <dt>Verified email</dt>
            <dd>{snapshot.profile.email}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{snapshot.profile.country}</dd>
          </div>
          <div>
            <dt>Telephone</dt>
            <dd>{snapshot.profile.phone || "Not supplied"}</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Invitation accepted · Email verified</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

const adminPortalGuide = [
  {
    number: "1",
    title: "Create organisations",
    description:
      "Add each legal entity once, then identify it as a client, consultant company, partner, end customer or DeepBridge entity.",
    to: "/admin/organisations",
    action: "Open organisations",
  },
  {
    number: "2",
    title: "Prepare the consultant",
    description:
      "Check the consultant's legal name, company and email. Keep the test email until the pack is ready, then change it before inviting them.",
    to: "/admin/consultants",
    action: "Open consultants",
  },
  {
    number: "3",
    title: "Create the assignment",
    description:
      "Link the consultant to the project and record the commercial summary, including the agreed day rate and start details.",
    to: "/admin/assignments",
    action: "Open assignments",
  },
  {
    number: "4",
    title: "Publish controlled documents",
    description:
      "Upload approved PDFs and use Add version for replacements. Published or signed records remain preserved for the audit trail.",
    to: "/admin/documents",
    action: "Open documents",
  },
  {
    number: "5",
    title: "Complete signing",
    description:
      "Review every consultant-signed PDF before countersigning. Download the completed PDF and certificate when the status is Completed.",
    to: "/admin/signing",
    action: "Open signing",
  },
  {
    number: "6",
    title: "Register company contracts",
    description:
      "Store client, consultant, partner and intercompany agreements here. Clean completed contracts are copied to the restricted Drive archive.",
    to: "/admin/contracts",
    action: "Open contracts",
  },
  {
    number: "7",
    title: "Close compliance and audit",
    description:
      "Approve or reject evidence in Compliance, then use Audit to confirm the recorded history of uploads, reviews, signatures and downloads.",
    to: "/admin/compliance",
    action: "Open compliance",
  },
] as const;

function AdminDashboard() {
  const { snapshot, demo } = usePortal();
  const [consultants, setConsultants] = useState<AdminConsultant[]>(
    demo
      ? [
          {
            id: snapshot.profile.id,
            fullName: "Roland Schneider",
            email: "roland.schneider@example.de",
            businessName: "HS Consulting",
            accessStatus: "active",
            onboardingComplete: 1,
            onboardingTotal: 14,
            documents: [],
          },
        ]
      : [],
  );
  const [consultantsLoading, setConsultantsLoading] = useState(!demo);
  useEffect(() => {
    if (demo) return;
    let active = true;
    void listAdminConsultants()
      .then((items) => {
        if (active) setConsultants(items);
      })
      .finally(() => {
        if (active) setConsultantsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo]);
  const activeConsultants = consultants.filter(
    (consultant) => consultant.accessStatus === "active",
  );
  const primaryConsultant = activeConsultants[0];
  const outstanding = snapshot.compliance.filter((item) =>
    ["uploaded", "under_review"].includes(item.status),
  ).length;
  const signed = snapshot.documents.filter(
    (item) => item.status === "completed",
  ).length;
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="DeepBridge operations"
        description="Manage organisations, contracts, consultants, documents, signing, compliance and the audit history."
        action={
          <Link
            className="portal-button portal-button-primary"
            to="/admin/contracts"
          >
            Open contract register
          </Link>
        }
      />
      <section className="portal-admin-stats">
        <article>
          <p>Active consultants</p>
          <strong>{consultantsLoading ? "—" : activeConsultants.length}</strong>
          <span>
            {consultantsLoading
              ? "Loading secure records"
              : primaryConsultant?.fullName ?? "No active consultants"}
          </span>
        </article>
        <article>
          <p>Compliance review</p>
          <strong>{outstanding}</strong>
          <span>files awaiting action</span>
        </article>
        <article>
          <p>Signed documents</p>
          <strong>{signed}</strong>
          <span>of 3 signature items</span>
        </article>
        <article>
          <p>Start date</p>
          <strong className="portal-stat-date">3 Aug</strong>
          <span>2026 · Kleintettau</span>
        </article>
      </section>
      <section
        className="portal-section portal-admin-guide"
        aria-labelledby="portal-operating-guide"
      >
        <div className="portal-section-heading">
          <div>
            <p className="portal-card-label">Operating guide</p>
            <h2 id="portal-operating-guide">How to use the portal</h2>
          </div>
          <span>Follow this order for a new relationship or assignment.</span>
        </div>
        <div className="portal-admin-guide-grid">
          {adminPortalGuide.map((step) => (
            <article key={step.number}>
              <span aria-hidden="true">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <Link to={step.to}>
                  {step.action} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
        <div className="portal-admin-guide-rules">
          <strong>Safe record handling</strong>
          <p>
            Test with your own email first. Change the consultant email only
            when the final invitation is ready. Supersede or add a new version
            instead of deleting completed records, and never share restricted
            identity, banking or tax folders through a public Drive link.
          </p>
        </div>
      </section>
      <section className="portal-section">
        <div className="portal-section-heading">
          <div>
            <p className="portal-card-label">Priority queue</p>
            <h2>Actions requiring review</h2>
          </div>
        </div>
        <div className="portal-action-list">
          {snapshot.compliance
            .filter((item) => ["uploaded", "under_review"].includes(item.status))
            .map((item) => (
              <Link
                className="portal-action-row"
                to="/admin/compliance"
                key={item.id}
              >
                <span className="portal-action-icon upload" aria-hidden="true">
                  ↑
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {primaryConsultant?.fullName ?? "Consultant"} · Uploaded{" "}
                    {item.uploadedAt}
                  </small>
                </span>
                <StatusPill status={item.status} />
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          <Link className="portal-action-row" to="/admin/documents">
            <span className="portal-action-icon signature" aria-hidden="true">
              ↗
            </span>
            <span>
              <strong>Statement of Work</strong>
              <small>
                {primaryConsultant
                  ? `${primaryConsultant.fullName} · Review signing status`
                  : "Review signing status"}
              </small>
            </span>
            <StatusPill status="awaiting_deepbridge" />
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="portal-action-row" to="/admin/signing">
            <span className="portal-action-icon signature" aria-hidden="true">
              G
            </span>
            <span>
              <strong>Google Workspace signing</strong>
              <small>Send requests and import completed signing packs</small>
            </span>
            <StatusPill status="active" />
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}

const organisationRelationshipLabels: Record<string, string> = {
  deepbridge_entity: "DeepBridge entity",
  client: "Client",
  end_customer: "End customer",
  consultant_supplier: "Consultant company",
  partner: "Partner",
  affiliate: "Intercompany / affiliate",
};

const contractTypeLabels: Record<AdminContract["contractType"], string> = {
  client_services: "Client services",
  consultant_supply: "Consultant supply",
  partnership: "Partnership",
  intercompany: "Intercompany",
  nda: "NDA",
  other: "Other",
};

const contractStatusLabels: Record<string, string> = {
  draft: "Draft",
  security_review: "Security scan",
  ready_to_sign: "Ready to sign",
  out_for_signature: "Out for signature",
  partially_signed: "Signed pack scanning",
  completed: "Completed",
  blocked: "Blocked",
  superseded: "Superseded",
  archived: "Archived",
};

function demoOrganisations(): AdminOrganisation[] {
  return [
    {
      id: "demo-deepbridge-uk",
      legalName: "DUSTDEEP LTD",
      tradingName: "DeepBridge Advisory",
      companyNumber: "16775578",
      countryCode: "GB",
      relationshipTypes: ["deepbridge_entity"],
      registeredAddress: "London, United Kingdom",
      website: "https://deepbridgeadvisory.com",
      taxNumber: "",
      notes: "",
      active: true,
    },
    {
      id: "demo-hs-consulting",
      legalName: "Roland Schneider trading as HS Consulting",
      tradingName: "HS Consulting",
      companyNumber: "",
      countryCode: "DE",
      relationshipTypes: ["consultant_supplier"],
      registeredAddress: "Germany",
      website: "",
      taxNumber: "",
      notes: "Independent consultant supplier.",
      active: true,
    },
    {
      id: "demo-sneci",
      legalName: "SNECI",
      tradingName: "SNECI",
      companyNumber: "",
      countryCode: "FR",
      relationshipTypes: ["client"],
      registeredAddress: "France",
      website: "",
      taxNumber: "",
      notes: "Contracting client.",
      active: true,
    },
  ];
}

function AdminOrganisationsPage() {
  const { demo } = usePortal();
  const [organisations, setOrganisations] = useState<AdminOrganisation[]>(
    demo ? demoOrganisations() : [],
  );
  const [selected, setSelected] = useState<AdminOrganisation | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(!demo);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (demo) {
      setLoading(false);
      return;
    }
    try {
      setOrganisations(await listAdminOrganisations());
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "Organisations could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function save(input: Omit<AdminOrganisation, "id"> & { id?: string }) {
    if (demo) {
      setOrganisations((current) => {
        const item = { ...input, id: input.id || `demo-${crypto.randomUUID()}` };
        return input.id
          ? current.map((existing) =>
              existing.id === input.id ? item : existing,
            )
          : [...current, item];
      });
    } else {
      await saveAdminOrganisation({
        organisationId: input.id,
        legalName: input.legalName,
        tradingName: input.tradingName,
        companyNumber: input.companyNumber,
        countryCode: input.countryCode,
        relationshipTypes: input.relationshipTypes,
        registeredAddress: input.registeredAddress,
        website: input.website,
        taxNumber: input.taxNumber,
        notes: input.notes,
        active: input.active,
      });
      await refresh();
    }
    setSelected(undefined);
    setMessage(`${input.tradingName || input.legalName} is saved.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Relationship register"
        title="Organisations"
        description="Keep every DeepBridge entity, client, consultant company, partner and intercompany relationship in one controlled register."
        action={
          <button
            className="portal-button portal-button-primary"
            type="button"
            onClick={() => setSelected(null)}
          >
            Add organisation
          </button>
        }
      />
      <div className="portal-privacy-callout">
        <span aria-hidden="true">i</span>
        <p>
          Organisation records are internal. Adding a client or partner here
          does not grant them portal access; access remains invitation-only and
          role-controlled.
        </p>
      </div>
      {message ? (
        <p className="portal-form-message success" role="status">
          {message}
        </p>
      ) : null}
      <section className="portal-organisation-grid">
        {organisations.map((organisation) => (
          <article className="portal-organisation-card" key={organisation.id}>
            <div>
              <span className="portal-card-label">
                {organisation.countryCode || "International"}
              </span>
              <span
                className={`portal-status ${
                  organisation.active ? "status-active" : "status-revoked"
                }`}
              >
                <span aria-hidden="true" />
                {organisation.active ? "Active" : "Inactive"}
              </span>
            </div>
            <h2>{organisation.tradingName || organisation.legalName}</h2>
            {organisation.tradingName &&
            organisation.tradingName !== organisation.legalName ? (
              <p>{organisation.legalName}</p>
            ) : null}
            <div className="portal-relationship-tags">
              {organisation.relationshipTypes.map((type) => (
                <span key={type}>
                  {organisationRelationshipLabels[type] || type}
                </span>
              ))}
            </div>
            <dl className="portal-mini-details">
              <div>
                <dt>Company number</dt>
                <dd>{organisation.companyNumber || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Registered address</dt>
                <dd>{organisation.registeredAddress || "Not recorded"}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="portal-text-button"
              onClick={() => setSelected(organisation)}
            >
              Edit organisation
            </button>
          </article>
        ))}
        {!loading && !organisations.length ? (
          <article className="portal-panel">
            <h2>No organisations yet</h2>
            <p>Add the contracting entities before uploading a contract.</p>
          </article>
        ) : null}
      </section>
      {selected !== undefined ? (
        <AdminOrganisationDialog
          organisation={selected}
          onClose={() => setSelected(undefined)}
          onSave={save}
        />
      ) : null}
    </>
  );
}

function AdminOrganisationDialog({
  organisation,
  onClose,
  onSave,
}: {
  organisation: AdminOrganisation | null;
  onClose: () => void;
  onSave: (
    input: Omit<AdminOrganisation, "id"> & { id?: string },
  ) => Promise<void>;
}) {
  const [legalName, setLegalName] = useState(organisation?.legalName || "");
  const [tradingName, setTradingName] = useState(
    organisation?.tradingName || "",
  );
  const [companyNumber, setCompanyNumber] = useState(
    organisation?.companyNumber || "",
  );
  const [countryCode, setCountryCode] = useState(
    organisation?.countryCode || "",
  );
  const [registeredAddress, setRegisteredAddress] = useState(
    organisation?.registeredAddress || "",
  );
  const [website, setWebsite] = useState(organisation?.website || "");
  const [taxNumber, setTaxNumber] = useState(organisation?.taxNumber || "");
  const [notes, setNotes] = useState(organisation?.notes || "");
  const [active, setActive] = useState(organisation?.active !== false);
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>(
    organisation?.relationshipTypes || [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleRelationship(type: string) {
    setRelationshipTypes((current) =>
      current.includes(type)
        ? current.filter((value) => value !== type)
        : [...current, type],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!relationshipTypes.length) {
      setError("Select at least one relationship type.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        id: organisation?.id,
        legalName,
        tradingName,
        companyNumber,
        countryCode: countryCode.toUpperCase(),
        relationshipTypes,
        registeredAddress,
        website,
        taxNumber,
        notes,
        active,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The organisation could not be saved.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal portal-consultant-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="organisation-dialog-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close organisation form"
        >
          ×
        </button>
        <p className="portal-kicker">Relationship register</p>
        <h2 id="organisation-dialog-title">
          {organisation ? "Edit organisation" : "Add organisation"}
        </h2>
        <form className="portal-form" onSubmit={submit}>
          <div className="portal-consultant-fields">
            <label>
              Legal name
              <input
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                required
                maxLength={240}
              />
            </label>
            <label>
              Trading name
              <input
                value={tradingName}
                onChange={(event) => setTradingName(event.target.value)}
                maxLength={240}
              />
            </label>
            <label>
              Company / registration number
              <input
                value={companyNumber}
                onChange={(event) => setCompanyNumber(event.target.value)}
                maxLength={80}
              />
            </label>
            <label>
              Country code
              <input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                maxLength={2}
                placeholder="GB"
              />
            </label>
            <label>
              Tax / VAT number
              <input
                value={taxNumber}
                onChange={(event) => setTaxNumber(event.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              Website
              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                type="url"
                maxLength={300}
                placeholder="https://"
              />
            </label>
          </div>
          <label>
            Registered address
            <textarea
              value={registeredAddress}
              onChange={(event) => setRegisteredAddress(event.target.value)}
              rows={3}
              maxLength={800}
            />
          </label>
          <fieldset className="portal-package-picker">
            <legend>Relationship with DeepBridge</legend>
            <div className="portal-choice-grid">
              {Object.entries(organisationRelationshipLabels).map(
                ([type, label]) => (
                  <label key={type}>
                    <input
                      type="checkbox"
                      checked={relationshipTypes.includes(type)}
                      onChange={() => toggleRelationship(type)}
                    />
                    <span>{label}</span>
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <label>
            Internal notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={2_000}
            />
          </label>
          <label className="portal-inline-choice">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            <span>Active organisation</span>
          </label>
          {error ? (
            <p className="portal-form-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              type="button"
              className="portal-button portal-button-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="portal-button portal-button-primary"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save organisation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function contractPipeline(
  contract: AdminContract,
  driveConfigured: boolean,
): Array<{ label: string; state: "complete" | "current" | "waiting" | "blocked" }> {
  const version = contract.versions[0];
  const sourceClean = version?.scanStatus === "clean";
  const signed = Boolean(version?.finalAvailable && version?.certificateAvailable);
  const isBlocked =
    contract.status === "blocked" ||
    version?.scanStatus === "failed" ||
    version?.scanStatus === "infected";
  const signatureCurrent = [
    "ready_to_sign",
    "out_for_signature",
    "partially_signed",
  ].includes(contract.status);
  return [
    {
      label: "Uploaded",
      state: version ? "complete" : "waiting",
    },
    {
      label: "File safety",
      state: isBlocked
        ? "blocked"
        : sourceClean
          ? "complete"
          : version
            ? "current"
            : "waiting",
    },
    {
      label: driveConfigured ? "Drive archive" : "Drive setup",
      state: !sourceClean
        ? "waiting"
        : !driveConfigured
          ? "current"
          : version.driveSyncStatus === "synced"
            ? "complete"
            : version.driveSyncStatus === "failed"
              ? "blocked"
              : "current",
    },
    {
      label: contract.requiresSignature ? "Signature" : "Approval",
      state: contract.status === "completed"
        ? "complete"
        : signatureCurrent
          ? "current"
          : sourceClean && !contract.requiresSignature
            ? "complete"
            : "waiting",
    },
    {
      label: "Completed",
      state: contract.status === "completed" && (!contract.requiresSignature || signed)
        ? "complete"
        : "waiting",
    },
  ];
}

function AdminContractsPage() {
  const { snapshot, demo } = usePortal();
  const location = useLocation();
  const initialParameters = new URLSearchParams(location.search);
  const initialProjectId = initialParameters.get("assignment") || "";
  const openProjectUpload = initialParameters.get("upload") === "1";
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [organisations, setOrganisations] = useState<AdminOrganisation[]>(
    demo ? demoOrganisations() : [],
  );
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<
    AdminContract | null | undefined
  >(openProjectUpload ? null : undefined);
  const [signedTarget, setSignedTarget] = useState<AdminContract | null>(null);
  const [countersignTarget, setCountersignTarget] =
    useState<AdminContract | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<AdminContract | null>(null);
  const [uploadProjectId, setUploadProjectId] = useState(initialProjectId);
  const [loading, setLoading] = useState(!demo);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (demo) {
      setLoading(false);
      return;
    }
    try {
      const [contractResult, organisationResult, assignmentResult] = await Promise.all([
        listAdminContracts(),
        listAdminOrganisations(),
        listAdminAssignments(),
      ]);
      setContracts(contractResult.contracts);
      setDriveConfigured(contractResult.driveConfigured);
      setOrganisations(organisationResult);
      setAssignments(assignmentResult);
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "The contract register could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (
      demo ||
      !contracts.some((contract) => {
        const version = contract.versions[0];
        return (
          contract.status === "security_review" ||
          contract.status === "partially_signed" ||
          version?.driveSyncStatus === "pending"
        );
      })
    )
      return;
    const timer = window.setInterval(() => void refresh(), 8_000);
    return () => window.clearInterval(timer);
  }, [contracts, demo, refresh]);

  async function openContract(
    contract: AdminContract,
    kind: "source" | "final" | "certificate",
  ) {
    const version = contract.versions[0];
    if (!version) return;
    setBusyId(`${version.id}-${kind}`);
    try {
      if (demo) {
        setMessage("File access is simulated in local review mode.");
      } else {
        await openSecureUrl(() => getAdminContractAccess(version.id, kind));
      }
    } catch (accessError) {
      setMessage(
        accessError instanceof Error
          ? accessError.message
          : "The contract could not be opened.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function changeStatus(contract: AdminContract, status: string) {
    setBusyId(contract.id);
    try {
      if (!demo) await updateAdminContractStatus(contract.id, status);
      setMessage(
        status === "out_for_signature"
          ? `${contract.reference} is marked as sent for signature.`
          : `${contract.reference} was updated.`,
      );
      if (!demo) await refresh();
      else
        setContracts((current) =>
          current.map((item) =>
            item.id === contract.id ? { ...item, status } : item,
          ),
        );
    } catch (statusError) {
      setMessage(
        statusError instanceof Error
          ? statusError.message
          : "The contract status could not be updated.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function removeVersion(contract: AdminContract) {
    const version = contract.versions[0];
    if (!version) return;
    setBusyId(version.id);
    try {
      if (!demo) await removeAdminContractVersion(version.id);
      setMessage(
        `${contract.reference} was removed from private quarantine. You can upload the corrected PDF now.`,
      );
      if (!demo) await refresh();
      else
        setContracts((current) =>
          current.filter((item) => item.id !== contract.id),
        );
    } catch (removeError) {
      setMessage(
        removeError instanceof Error
          ? removeError.message
          : "The quarantined upload could not be removed.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function retryDrive(contract: AdminContract) {
    const version = contract.versions[0];
    if (!version) return;
    setBusyId(version.id);
    try {
      if (!demo) await retryAdminContractDriveArchive(version.id);
      setMessage(`${contract.reference} was queued for Google Drive archival.`);
      if (!demo) await refresh();
    } catch (driveError) {
      setMessage(
        driveError instanceof Error
          ? driveError.message
          : "Google Drive archival could not be retried.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function retryScan(contract: AdminContract) {
    const version = contract.versions[0];
    if (!version) return;
    setBusyId(version.id);
    try {
      if (!demo) await retryAdminContractSecurityScan(version.id);
      setMessage(`${contract.reference} security scan restarted. This page will refresh automatically.`);
      if (!demo) await refresh();
    } catch (scanError) {
      setMessage(
        scanError instanceof Error
          ? scanError.message
          : "The security scan could not be restarted.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function verifyPdf(contract: AdminContract) {
    const version = contract.versions[0];
    if (!version) return;
    setBusyId(`${version.id}-verify`);
    try {
      if (!demo) await verifyAdminContractPdf(version.id);
      setMessage(`${contract.reference} passed the controlled PDF verification and is ready for the next step.`);
      if (!demo) await refresh();
    } catch (verifyError) {
      setMessage(
        verifyError instanceof Error
          ? verifyError.message
          : "The PDF could not be verified.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Contract register"
        title="Contracts"
        description="Upload any signed or unsigned PDF, file it to a project, verify it, countersign it and archive the completed record."
        action={
          <button
            className="portal-button portal-button-primary"
            type="button"
            onClick={() => {
              setUploadProjectId("");
              setUploadTarget(null);
            }}
            disabled={organisations.length < 2}
          >
            Upload contract
          </button>
        }
      />
      <div className="portal-contract-assurance">
        <div>
          <strong>Private storage</strong>
          <span>PDFs stay private until antivirus or controlled PDF verification passes.</span>
        </div>
        <div>
          <strong>Audit trail</strong>
          <span>Views, downloads, status changes and signing packs are recorded.</span>
        </div>
        <div className={driveConfigured ? "ready" : "attention"}>
          <strong>{driveConfigured ? "Google Drive connected" : "Google Drive setup required"}</strong>
          <span>
            {driveConfigured
              ? "Clean contract files are copied automatically."
              : "Portal storage remains protected; automatic Drive copying is paused."}
          </span>
        </div>
      </div>
      {message ? (
        <p className="portal-form-message neutral" role="status">
          {message}
        </p>
      ) : null}
      <section className="portal-contract-list">
        {contracts.map((contract) => {
          const version = contract.versions[0];
          const removable =
            version &&
            !version.locked &&
            version.scanStatus !== "clean" &&
            !version.finalAvailable;
          return (
            <article className="portal-contract-card" key={contract.id}>
              <header>
                <div>
                  <span className="portal-card-label">{contract.reference}</span>
                  <h2>{contract.title}</h2>
                  <p>
                    {contract.owner.name} <span aria-hidden="true">↔</span>{" "}
                    {contract.counterparty.name}
                  </p>
                </div>
                <span
                  className={`portal-status ${
                    contract.status === "completed"
                      ? "status-completed"
                      : contract.status === "blocked"
                        ? "status-rejected"
                        : "status-under_review"
                  }`}
                >
                  <span aria-hidden="true" />
                  {contractStatusLabels[contract.status] || contract.status}
                </span>
              </header>
              <div className="portal-contract-meta">
                <span>{contractTypeLabels[contract.contractType]}</span>
                <span>Version {version?.versionLabel || "—"}</span>
                <span>
                  {contract.requiresSignature
                    ? "Signature required"
                    : "No signature required"}
                </span>
                {contract.effectiveDate ? (
                  <span>Effective {contract.effectiveDate}</span>
                ) : null}
                {contract.assignmentId ? (
                  <span>
                    Project {assignments.find((item) => item.id === contract.assignmentId)?.programme || "linked"}
                  </span>
                ) : (
                  <span>Contract library · no project</span>
                )}
                {version ? <span>File check: {version.scanStatus}</span> : null}
              </div>
              <ol className="portal-contract-pipeline" aria-label="Contract progress">
                {contractPipeline(contract, driveConfigured).map((step) => (
                  <li className={step.state} key={step.label}>
                    <span aria-hidden="true">
                      {step.state === "complete"
                        ? "✓"
                        : step.state === "blocked"
                          ? "!"
                          : ""}
                    </span>
                    <small>{step.label}</small>
                  </li>
                ))}
              </ol>
              <div className="portal-contract-actions">
                {version?.scanStatus === "clean" ? (
                  <button
                    type="button"
                    onClick={() => void openContract(contract, "source")}
                    disabled={Boolean(busyId)}
                  >
                    View source
                  </button>
                ) : null}
                {version &&
                !version.locked &&
                ["pending", "failed"].includes(version.scanStatus) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void retryScan(contract)}
                      disabled={Boolean(busyId)}
                    >
                      {busyId === version.id ? "Restarting scan…" : "Retry antivirus scan"}
                    </button>
                    <button
                      type="button"
                      className="portal-table-primary-action"
                      onClick={() => void verifyPdf(contract)}
                      disabled={Boolean(busyId)}
                    >
                      {busyId === `${version.id}-verify` ? "Verifying PDF…" : "Verify PDF & continue"}
                    </button>
                  </>
                ) : null}
                {version?.scanStatus === "infected" ? (
                  <strong className="portal-danger-link">Unsafe file detected · replace upload</strong>
                ) : null}
                {contract.status === "ready_to_sign" ? (
                  <button
                    type="button"
                    className="portal-table-primary-action"
                    onClick={() => void changeStatus(contract, "out_for_signature")}
                    disabled={Boolean(busyId)}
                  >
                    Mark sent for signature
                  </button>
                ) : null}
                {version?.scanStatus === "clean" &&
                contract.requiresSignature &&
                ["ready_to_sign", "out_for_signature", "partially_signed"].includes(
                  contract.status,
                ) ? (
                  <button
                    type="button"
                    className="portal-table-primary-action"
                    onClick={() => setCountersignTarget(contract)}
                    disabled={Boolean(busyId)}
                  >
                    Review &amp; countersign
                  </button>
                ) : null}
                {version?.scanStatus === "clean" &&
                contract.requiresSignature &&
                ["ready_to_sign", "out_for_signature", "partially_signed"].includes(
                  contract.status,
                ) ? (
                  <button
                    type="button"
                    className="portal-table-primary-action"
                    onClick={() => setSignedTarget(contract)}
                    disabled={Boolean(busyId)}
                  >
                    Upload signed pack
                  </button>
                ) : null}
                {version?.finalAvailable ? (
                  <button
                    type="button"
                    onClick={() => void openContract(contract, "final")}
                    disabled={Boolean(busyId)}
                  >
                    Download signed PDF
                  </button>
                ) : null}
                {version?.certificateAvailable ? (
                  <button
                    type="button"
                    onClick={() => void openContract(contract, "certificate")}
                    disabled={Boolean(busyId)}
                  >
                    Download audit certificate
                  </button>
                ) : null}
                {driveConfigured && version?.driveSyncStatus === "failed" ? (
                  <button
                    type="button"
                    onClick={() => void retryDrive(contract)}
                    disabled={Boolean(busyId)}
                  >
                    Retry Drive archive
                  </button>
                ) : null}
                {removable ? (
                  <button
                    type="button"
                    className="portal-danger-link"
                    onClick={() => void removeVersion(contract)}
                    disabled={Boolean(busyId)}
                  >
                    Remove quarantined upload
                  </button>
                ) : null}
                {contract.status !== "completed" ? (
                  <button
                    type="button"
                    onClick={() => setDetailsTarget(contract)}
                    disabled={Boolean(busyId)}
                  >
                    Correct project &amp; counterparty
                  </button>
                ) : null}
                {version?.locked ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadProjectId(contract.assignmentId);
                      setUploadTarget(contract);
                    }}
                    disabled={Boolean(busyId)}
                  >
                    Add version
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {!loading && !contracts.length ? (
          <section className="portal-panel portal-empty-contracts">
            <span aria-hidden="true">↗</span>
            <div>
              <h2>Start the contract register</h2>
              <p>
                Add at least two organisations, then upload a client,
                consultant, partner or intercompany agreement.
              </p>
            </div>
          </section>
        ) : null}
      </section>
      {uploadTarget !== undefined ? (
        <AdminContractUploadDialog
          contract={uploadTarget}
          organisations={organisations}
          assignments={assignments}
          initialAssignmentId={uploadProjectId}
          demo={demo}
          onClose={() => setUploadTarget(undefined)}
          onUploaded={async (notice) => {
            setUploadTarget(undefined);
            setMessage(notice);
            await refresh();
          }}
        />
      ) : null}
      {signedTarget ? (
        <AdminContractSignedPackDialog
          contract={signedTarget}
          demo={demo}
          onClose={() => setSignedTarget(null)}
          onUploaded={async () => {
            setSignedTarget(null);
            setMessage(
              `${signedTarget.reference} signed pack uploaded. Both PDFs are being scanned before completion.`,
            );
            await refresh();
          }}
        />
      ) : null}
      {countersignTarget ? (
        <AdminContractCountersignDialog
          contract={countersignTarget}
          defaultSignerName={snapshot.profile.fullName}
          demo={demo}
          onClose={() => setCountersignTarget(null)}
          onCompleted={async () => {
            setCountersignTarget(null);
            setMessage(`${countersignTarget.reference} was countersigned for DeepBridge. The signed PDF and audit certificate are ready to download.`);
            await refresh();
          }}
        />
      ) : null}
      {detailsTarget ? (
        <AdminContractDetailsDialog
          contract={detailsTarget}
          organisations={organisations}
          assignments={assignments}
          onClose={() => setDetailsTarget(null)}
          onSaved={async () => {
            setDetailsTarget(null);
            setMessage("Contract relationship corrected. The source PDF and checksum were not changed.");
            await refresh();
          }}
        />
      ) : null}
    </>
  );
}

function AdminContractUploadDialog({
  contract,
  organisations,
  assignments,
  initialAssignmentId,
  demo,
  onClose,
  onUploaded,
}: {
  contract: AdminContract | null;
  organisations: AdminOrganisation[];
  assignments: AdminAssignment[];
  initialAssignmentId: string;
  demo: boolean;
  onClose: () => void;
  onUploaded: (notice: string) => Promise<void>;
}) {
  const deepBridge =
    organisations.find((item) =>
      item.relationshipTypes.includes("deepbridge_entity"),
    ) || organisations[0];
  const currentVersion = contract?.versions[0]?.versionLabel;
  const versionMatch = currentVersion?.match(/^(\d+)\.(\d+)$/);
  const [reference, setReference] = useState(contract?.reference || "");
  const [title, setTitle] = useState(contract?.title || "");
  const [contractType, setContractType] = useState<AdminContract["contractType"]>(
    contract?.contractType || "client_services",
  );
  const [ownerOrganisationId, setOwnerOrganisationId] = useState(
    contract?.owner.id || deepBridge?.id || "",
  );
  const [counterpartyOrganisationId, setCounterpartyOrganisationId] = useState(
    contract?.counterparty.id || "",
  );
  const [versionLabel, setVersionLabel] = useState(
    versionMatch
      ? `${versionMatch[1]}.${Number(versionMatch[2]) + 1}`
      : currentVersion
        ? `${currentVersion}.1`
        : "1.0",
  );
  const [description, setDescription] = useState(contract?.description || "");
  const [requiresSignature, setRequiresSignature] = useState(
    contract?.requiresSignature !== false,
  );
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(
    contract?.assignmentId || initialAssignmentId || "",
  );
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [currency, setCurrency] = useState(contract?.currency || "EUR");
  const [contractValue, setContractValue] = useState("");
  const ownerParty = contract?.parties.find(
    (party) => party.organisationId === contract.owner.id,
  );
  const counterpartyParty = contract?.parties.find(
    (party) => party.organisationId === contract.counterparty.id,
  );
  const [ownerSignatoryName, setOwnerSignatoryName] = useState(
    ownerParty?.signatoryName || "Yon Wallace",
  );
  const [ownerSignatoryEmail, setOwnerSignatoryEmail] = useState(
    ownerParty?.signatoryEmail || "yon.wallace@deepbridgeadvisory.co.uk",
  );
  const [counterpartySignatoryName, setCounterpartySignatoryName] = useState(
    counterpartyParty?.signatoryName || "",
  );
  const [counterpartySignatoryEmail, setCounterpartySignatoryEmail] =
    useState(counterpartyParty?.signatoryEmail || "");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (ownerOrganisationId === counterpartyOrganisationId) {
      setError("Select two different contracting organisations.");
      return;
    }
    if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
      setError("The expiry date cannot be earlier than the effective date.");
      return;
    }
    if (
      requiresSignature &&
      (!ownerSignatoryName.trim() ||
        !ownerSignatoryEmail.trim() ||
        !counterpartySignatoryName.trim() ||
        !counterpartySignatoryEmail.trim())
    ) {
      setError("Enter both signatories and their email addresses before uploading.");
      return;
    }
    setBusy(true);
    setError("");
    setProgress({ phase: "preparing", percent: 0 });
    try {
      const result = !demo
        ? await uploadAdminContract({
          contractId: contract?.id,
          reference,
          title,
          contractType,
          ownerOrganisationId,
          counterpartyOrganisationId,
          assignmentId: selectedAssignmentId || undefined,
          description,
          versionLabel,
          requiresSignature,
          effectiveDate,
          expiryDate,
          currency,
          contractValue: contractValue ? Number(contractValue) : undefined,
          ownerSignatoryName,
          ownerSignatoryEmail,
          counterpartySignatoryName,
          counterpartySignatoryEmail,
          file,
          onProgress: setProgress,
          })
        : { status: "pending_scan" };
      await onUploaded(
        result.status === "scan_retry_needed"
          ? `${reference.toUpperCase()} v${versionLabel} is stored safely. The scanner did not start; use Retry security scan on the contract card.`
          : `${reference.toUpperCase()} v${versionLabel} uploaded. Security scanning has started and the register will refresh automatically.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The contract could not be uploaded.",
      );
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal portal-consultant-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-upload-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close contract upload"
        >
          ×
        </button>
        <p className="portal-kicker">Controlled contract upload</p>
        <h2 id="contract-upload-title">
          {contract ? `Add version · ${contract.reference}` : "Upload contract"}
        </h2>
        <p>
          The PDF is checksummed, quarantined and scanned. Only a clean version
          can be opened, signed, archived to Drive or downloaded.
        </p>
        <form className="portal-form" onSubmit={submit}>
          <div className="portal-consultant-fields">
            <label>
              Contract reference
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                required
                maxLength={80}
                disabled={Boolean(contract)}
                placeholder="DBA-CLIENT-2026-001"
              />
            </label>
            <label>
              Contract type
              <select
                value={contractType}
                onChange={(event) =>
                  setContractType(
                    event.target.value as AdminContract["contractType"],
                  )
                }
              >
                {Object.entries(contractTypeLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Contract title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={240}
            />
          </label>
          <div className="portal-consultant-fields">
            <label>
              DeepBridge / owning entity
              <select
                value={ownerOrganisationId}
                onChange={(event) => setOwnerOrganisationId(event.target.value)}
                required
              >
                {organisations.map((organisation) => (
                  <option value={organisation.id} key={organisation.id}>
                    {organisation.tradingName || organisation.legalName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Counterparty
              <select
                value={counterpartyOrganisationId}
                onChange={(event) =>
                  setCounterpartyOrganisationId(event.target.value)
                }
                required
              >
                <option value="">Select the contracting counterparty</option>
                {organisations
                  .filter((organisation) => organisation.id !== ownerOrganisationId)
                  .map((organisation) => (
                  <option value={organisation.id} key={organisation.id}>
                    {organisation.tradingName || organisation.legalName}
                  </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="portal-consultant-fields">
            <label>
              Version
              <input
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
                required
                maxLength={40}
              />
            </label>
            <label>
              Currency
              <input
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                maxLength={3}
                placeholder="EUR"
              />
            </label>
            <label>
              Effective date
              <input
                type="date"
                value={effectiveDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
              />
            </label>
            <label>
              Expiry date
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
              />
            </label>
            <label>
              Contract value (optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractValue}
                onChange={(event) => setContractValue(event.target.value)}
              />
            </label>
          </div>
          <label>
            Internal description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={1_000}
            />
          </label>
          <div className="portal-consultant-fields">
            <label>
              DeepBridge signatory
              <input
                value={ownerSignatoryName}
                onChange={(event) => setOwnerSignatoryName(event.target.value)}
                maxLength={160}
                required={requiresSignature}
              />
            </label>
            <label>
              DeepBridge signatory email
              <input
                type="email"
                value={ownerSignatoryEmail}
                onChange={(event) => setOwnerSignatoryEmail(event.target.value)}
                maxLength={254}
                required={requiresSignature}
                placeholder="yon.wallace@deepbridgeadvisory.co.uk"
              />
            </label>
            <label>
              Counterparty signatory
              <input
                value={counterpartySignatoryName}
                onChange={(event) =>
                  setCounterpartySignatoryName(event.target.value)
                }
                maxLength={160}
                required={requiresSignature}
              />
            </label>
            <label>
              Counterparty signatory email
              <input
                type="email"
                value={counterpartySignatoryEmail}
                onChange={(event) =>
                  setCounterpartySignatoryEmail(event.target.value)
                }
                maxLength={254}
                required={requiresSignature}
              />
            </label>
          </div>
          <label className="portal-inline-choice">
            <input
              type="checkbox"
              checked={requiresSignature}
              onChange={(event) => setRequiresSignature(event.target.checked)}
            />
            <span>This contract requires signatures</span>
          </label>
          <label className="portal-inline-choice">
            <span>Project / assignment</span>
            <select
              value={selectedAssignmentId}
              onChange={(event) => setSelectedAssignmentId(event.target.value)}
            >
              <option value="">Contract library only</option>
              {assignments.map((assignment) => (
                <option value={assignment.id} key={assignment.id}>
                  {assignment.programme} · {assignment.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Approved contract PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              required
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <small>PDF only · maximum 25 MB · version history is retained</small>
          {progress ? <UploadProgressIndicator progress={progress} /> : null}
          {error ? (
            <p className="portal-form-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              type="button"
              className="portal-button portal-button-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="portal-button portal-button-primary"
              disabled={busy || !file}
            >
              {busy ? "Uploading securely…" : "Upload and begin security scan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminContractSignedPackDialog({
  contract,
  demo,
  onClose,
  onUploaded,
}: {
  contract: AdminContract;
  demo: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void>;
}) {
  const version = contract.versions[0];
  const [finalPdf, setFinalPdf] = useState<File | null>(null);
  const [certificatePdf, setCertificatePdf] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!version || !finalPdf || !certificatePdf) return;
    setBusy(true);
    setError("");
    setProgress({ phase: "preparing", percent: 0 });
    try {
      if (!demo)
        await uploadAdminContractSignedPack({
          contractId: contract.id,
          versionId: version.id,
          finalPdf,
          certificatePdf,
          onProgress: setProgress,
        });
      await onUploaded();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The signed pack could not be uploaded.",
      );
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signed-pack-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close signed pack upload"
        >
          ×
        </button>
        <p className="portal-kicker">Final signing evidence</p>
        <h2 id="signed-pack-title">{contract.reference}</h2>
        <p>
          Upload the final fully signed contract and its signing certificate or
          audit trail. Both files are scanned before the contract is marked
          complete.
        </p>
        <form className="portal-form" onSubmit={submit}>
          <label>
            Final signed PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              required
              onChange={(event) => setFinalPdf(event.target.files?.[0] || null)}
            />
          </label>
          <label>
            Signing certificate / audit trail PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              required
              onChange={(event) =>
                setCertificatePdf(event.target.files?.[0] || null)
              }
            />
          </label>
          {progress ? <UploadProgressIndicator progress={progress} /> : null}
          {error ? (
            <p className="portal-form-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              type="button"
              className="portal-button portal-button-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="portal-button portal-button-primary"
              disabled={busy || !finalPdf || !certificatePdf}
            >
              {busy ? "Uploading signed pack…" : "Upload and verify signed pack"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminContractDetailsDialog({
  contract,
  organisations,
  assignments,
  onClose,
  onSaved,
}: {
  contract: AdminContract;
  organisations: AdminOrganisation[];
  assignments: AdminAssignment[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const counterpartyParty = contract.parties.find(
    (party) => party.organisationId === contract.counterparty.id,
  );
  const [counterpartyOrganisationId, setCounterpartyOrganisationId] = useState(
    contract.counterparty.id,
  );
  const [assignmentId, setAssignmentId] = useState(contract.assignmentId || "");
  const [signatoryName, setSignatoryName] = useState(
    counterpartyParty?.signatoryName || "",
  );
  const [signatoryEmail, setSignatoryEmail] = useState(
    counterpartyParty?.signatoryEmail || "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateAdminContractDetails({
        contractId: contract.id,
        counterpartyOrganisationId,
        assignmentId,
        counterpartySignatoryName: signatoryName,
        counterpartySignatoryEmail: signatoryEmail,
      });
      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The contract relationship could not be corrected.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="contract-details-title">
        <button type="button" className="portal-modal-close" onClick={onClose} disabled={busy} aria-label="Close contract details">×</button>
        <p className="portal-kicker">Correct filing details</p>
        <h2 id="contract-details-title">{contract.reference}</h2>
        <p>Move this unchanged PDF record to the correct project and counterparty. The source file and SHA-256 checksum remain unchanged.</p>
        <form className="portal-form" onSubmit={submit}>
          <label>
            Project / assignment
            <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}>
              <option value="">Contract library only</option>
              {assignments.map((assignment) => <option value={assignment.id} key={assignment.id}>{assignment.programme} · {assignment.title}</option>)}
            </select>
          </label>
          <label>
            Counterparty
            <select value={counterpartyOrganisationId} onChange={(event) => setCounterpartyOrganisationId(event.target.value)} required>
              <option value="">Select counterparty</option>
              {organisations.filter((item) => item.id !== contract.owner.id).map((item) => <option value={item.id} key={item.id}>{item.tradingName || item.legalName}</option>)}
            </select>
          </label>
          <label>Counterparty signatory<input value={signatoryName} onChange={(event) => setSignatoryName(event.target.value)} maxLength={160} /></label>
          <label>Counterparty signatory email<input type="email" value={signatoryEmail} onChange={(event) => setSignatoryEmail(event.target.value)} maxLength={254} /></label>
          {error ? <p className="portal-form-message error" role="alert">{error}</p> : null}
          <div className="portal-modal-actions">
            <button type="button" className="portal-button portal-button-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="portal-button portal-button-primary" disabled={busy}>{busy ? "Saving…" : "Save corrected filing"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminContractCountersignDialog({
  contract,
  defaultSignerName,
  demo,
  onClose,
  onCompleted,
}: {
  contract: AdminContract;
  defaultSignerName: string;
  demo: boolean;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const version = contract.versions[0];
  const ownerParty = contract.parties.find(
    (party) => party.organisationId === contract.owner.id,
  );
  const counterpartyParty = contract.parties.find(
    (party) => party.organisationId === contract.counterparty.id,
  );
  const [signerName, setSignerName] = useState(
    ownerParty?.signatoryName || defaultSignerName || "Yon Wallace",
  );
  const [signerTitle, setSignerTitle] = useState("Director");
  const [counterpartySignatoryName, setCounterpartySignatoryName] = useState(
    counterpartyParty?.signatoryName || "",
  );
  const [counterpartySignatoryEmail, setCounterpartySignatoryEmail] = useState(
    counterpartyParty?.signatoryEmail || "",
  );
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placementBytes, setPlacementBytes] = useState<Uint8Array | null>(null);
  const [manualPlacement, setManualPlacement] =
    useState<ManualPdfPlacement | null>(null);
  const [placementLoading, setPlacementLoading] = useState(false);
  const setPlacementPageIndex = useCallback((pageIndex: number) => {
    setManualPlacement((current) =>
      current ? { ...current, pageIndex } : current,
    );
  }, []);

  async function reviewSource() {
    if (!version) return;
    setError("");
    try {
      if (demo) setReviewed(true);
      else {
        await openSecureUrl(() => getAdminContractAccess(version.id, "source"));
        setReviewed(true);
      }
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "The source contract could not be opened.",
      );
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!version || !reviewed || !confirmed) return;
    setBusy(true);
    setError("");
    try {
      if (!demo) {
        const signatureImageDataUrl = await typedSignatureImage(signerName.trim());
        await countersignAdminContract({
          contractId: contract.id,
          versionId: version.id,
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim(),
          signatureImageDataUrl,
          counterpartySignatoryName: counterpartySignatoryName.trim(),
          counterpartySignatoryEmail: counterpartySignatoryEmail.trim(),
          placement: manualPlacement ?? undefined,
        });
      }
      await onCompleted();
    } catch (signError) {
      setError(
        signError instanceof Error
          ? signError.message
          : "The contract could not be countersigned.",
      );
      setBusy(false);
    }
  }

  async function openPlacementEditor() {
    if (!version) return;
    setPlacementLoading(true);
    setError("");
    try {
      if (demo)
        throw new Error("PDF placement is available for stored production contracts.");
      const access = await getAdminContractAccess(version.id, "source");
      if (!access.url)
        throw new Error("The secure PDF preview link could not be created.");
      const previewResponse = await fetch(access.url);
      if (!previewResponse.ok)
        throw new Error("The counterparty-signed PDF could not be loaded.");
      const bytes = new Uint8Array(await previewResponse.arrayBuffer());
      if (
        bytes.length < 5 ||
        new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-"
      )
        throw new Error("The selected file is not a readable PDF.");
      setPlacementBytes(bytes);
      setManualPlacement(initialManualPdfPlacement(contract.title));
      setReviewed(true);
    } catch (placementError) {
      setError(
        placementError instanceof Error
          ? placementError.message
          : "The PDF placement preview could not be opened.",
      );
    } finally {
      setPlacementLoading(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className={`portal-modal portal-signature-modal${manualPlacement ? " portal-signature-modal-placement" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-countersign-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close contract countersignature"
        >
          ×
        </button>
        <p className="portal-kicker">DeepBridge contract countersignature</p>
        <h2 id="contract-countersign-title">{contract.title}</h2>
        <p>
          Review the clean counterparty-signed PDF, place the DeepBridge
          signature and date in its existing execution block, then countersign
          it. The portal changes no contract wording and appends one corporate
          countersignature record page.
        </p>
        <form className="portal-form" onSubmit={submit}>
          <div className="portal-signing-step">
            <span>1</span>
            <div>
              <strong>Review source contract</strong>
              <p>
                Confirm the person who signed for {contract.counterparty.name}.
              </p>
              <label htmlFor="contract-counterparty-signer">Counterparty signatory</label>
              <input
                id="contract-counterparty-signer"
                value={counterpartySignatoryName}
                onChange={(event) => setCounterpartySignatoryName(event.target.value)}
                required
                minLength={2}
                maxLength={160}
                disabled={busy}
              />
              <label htmlFor="contract-counterparty-email">Counterparty signatory email</label>
              <input
                id="contract-counterparty-email"
                type="email"
                value={counterpartySignatoryEmail}
                onChange={(event) => setCounterpartySignatoryEmail(event.target.value)}
                required
                maxLength={254}
                disabled={busy}
              />
              <button
                type="button"
                className="portal-button portal-button-secondary"
                onClick={() => void reviewSource()}
                disabled={busy}
              >
                {reviewed ? "Review source again" : "Review source PDF"}
              </button>
            </div>
          </div>
          <div className="portal-signing-step">
            <span>2</span>
            <div>
              <strong>Place signature &amp; date</strong>
              <p>
                Open the execution page and drag the two transparent items onto
                the existing DeepBridge lines. No corporate stamp is placed on
                the contract page; it remains only on the appended record page.
              </p>
              {manualPlacement && placementBytes ? (
                <>
                  <PdfPlacementEditor
                    bytes={placementBytes}
                    signerName={signerName}
                    placement={manualPlacement}
                    onChange={setManualPlacement}
                    onPageChange={setPlacementPageIndex}
                  />
                  <button
                    className="portal-button portal-button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPlacementBytes(null);
                      setManualPlacement(null);
                    }}
                  >
                    Keep signature on record page only
                  </button>
                </>
              ) : (
                <button
                  className="portal-button portal-button-secondary"
                  type="button"
                  disabled={busy || placementLoading || !version}
                  onClick={() => void openPlacementEditor()}
                >
                  {placementLoading ? "Opening PDF…" : "Place signature & date"}
                </button>
              )}
            </div>
          </div>
          <div className="portal-signing-step">
            <span>3</span>
            <div>
              <strong>DeepBridge signatory</strong>
              <label htmlFor="contract-signer-name">Full name</label>
              <input
                id="contract-signer-name"
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                required
                minLength={2}
                maxLength={100}
                disabled={busy}
              />
              <label htmlFor="contract-signer-title">Title / authority</label>
              <input
                id="contract-signer-title"
                value={signerTitle}
                onChange={(event) => setSignerTitle(event.target.value)}
                required
                minLength={2}
                maxLength={120}
                disabled={busy}
              />
              <p>
                {ownerParty?.signatoryEmail || "yon.wallace@deepbridgeadvisory.co.uk"}
              </p>
              <div className="portal-signature-preview" aria-label="Signature preview">
                <div className="portal-signature-person">
                  <small>Authenticated signatory</small>
                  <span>{signerName || "Your name"}</span>
                  <p>{signerTitle || "Signing authority"}</p>
                </div>
              </div>
            </div>
          </div>
          <label className="portal-inline-choice">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={busy}
            />
            <span>
              I reviewed the complete counterparty-signed contract, I am
              authorised to sign for DUSTDEEP LTD trading as DeepBridge
              Advisory, and intend this electronic countersignature to bind
              DeepBridge.
            </span>
          </label>
          {error ? (
            <p className="portal-form-message error" role="alert">{error}</p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              type="button"
              className="portal-button portal-button-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="portal-button portal-button-primary"
              disabled={busy || !reviewed || !confirmed}
            >
              {busy ? "Creating countersigned PDF…" : "Countersign for DeepBridge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminConsultantsPage() {
  const { snapshot, demo } = usePortal();
  const [showInvite, setShowInvite] = useState(false);
  const [selectedConsultant, setSelectedConsultant] =
    useState<AdminConsultant | null>(null);
  const [documentCatalogue, setDocumentCatalogue] = useState<
    AdminDocumentCatalogueItem[]
  >([]);
  const [consultants, setConsultants] = useState<AdminConsultant[]>(
    demo
      ? [
          {
            id: snapshot.profile.id,
            fullName: "Roland Schneider",
            email: "roland.schneider@example.de",
            businessName: "HS Consulting",
            accessStatus: "active",
            assignment: {
              id: snapshot.assignment.id,
              title: snapshot.assignment.title,
              location: snapshot.assignment.location,
              startDate: snapshot.assignment.startDate,
              status: "active",
            },
            onboardingComplete: snapshot.tasks.filter((task) => task.complete)
              .length,
            onboardingTotal: snapshot.tasks.length,
            documents: snapshot.documents.map((document) => ({
              assignedDocumentId: document.id,
              documentId: document.id,
              slug: document.id,
              title: document.title,
              category: document.category,
              status: document.status,
              versionLabel: document.version,
              selected: true,
            })),
          },
        ]
      : [],
  );
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState("");
  const refreshConsultants = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    setError("");
    try {
      setConsultants(await listAdminConsultants());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Consultants could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [demo]);
  useEffect(() => {
    if (demo) return;
    let active = true;
    void Promise.all([listAdminConsultants(), listAdminDocumentCatalogue()])
      .then(([items, catalogue]) => {
        if (active) {
          setConsultants(items);
          setDocumentCatalogue(catalogue.documents);
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Consultants could not be loaded.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo]);
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Consultants"
        description="Create invitation-only access and revoke it without deleting the engagement record."
        action={
          <button
            className="portal-button portal-button-primary"
            type="button"
            onClick={() => setShowInvite(true)}
          >
            Invite consultant
          </button>
        }
      />
      <section className="portal-panel portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Consultant</th>
              <th>Assignment</th>
              <th>Access</th>
              <th>Onboarding</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {consultants.map((consultant) => (
              <tr key={consultant.id}>
                <td>
                  <strong>{consultant.fullName}</strong>
                  <span>{consultant.email}</span>
                </td>
                <td>
                  <strong>
                    {consultant.assignment?.title ?? "No active assignment"}
                  </strong>
                  <span>
                    {consultant.assignment
                      ? `${consultant.assignment.location} · ${consultant.assignment.startDate}`
                      : consultant.businessName}
                  </span>
                </td>
                <td>
                  <StatusPill status={consultant.accessStatus} />
                </td>
                <td>
                  {consultant.onboardingComplete} of{" "}
                  {consultant.onboardingTotal}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => setSelectedConsultant(consultant)}
                  >
                    Manage consultant
                  </button>
                  <span>
                    {consultant.lastLoginAt
                      ? `Last login ${consultant.lastLoginAt}`
                      : "Awaiting first sign-in"}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && !consultants.length ? (
              <tr>
                <td colSpan={5}>No consultants have been invited yet.</td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td colSpan={5}>Loading secure consultant records…</td>
              </tr>
            ) : null}
            {error ? (
              <tr>
                <td colSpan={5}>{error}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
      {showInvite ? (
        <InviteDialog
          demo={demo}
          onClose={() => setShowInvite(false)}
          onInvited={refreshConsultants}
        />
      ) : null}
      {selectedConsultant ? (
        <ManageConsultantDialog
          consultant={selectedConsultant}
          catalogue={
            demo
              ? createDemoDocumentCatalogue(snapshot.documents)
              : documentCatalogue
          }
          demo={demo}
          onClose={() => setSelectedConsultant(null)}
          onUpdated={async () => {
            await refreshConsultants();
          }}
        />
      ) : null}
    </>
  );
}

function ManageConsultantDialog({
  consultant,
  catalogue,
  demo,
  onClose,
  onUpdated,
}: {
  consultant: AdminConsultant;
  catalogue: AdminDocumentCatalogueItem[];
  demo: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(consultant.fullName);
  const [businessName, setBusinessName] = useState(consultant.businessName);
  const [email, setEmail] = useState(consultant.email);
  const [selectedIds, setSelectedIds] = useState(
    () =>
      new Set(
        consultant.documents
          .filter((document) => document.selected)
          .map((document) => document.documentId),
      ),
  );
  const [savedDetails, setSavedDetails] = useState(() => ({
    fullName: consultant.fullName,
    businessName: consultant.businessName,
    email: consultant.email.toLowerCase(),
    documentIds: new Set(
      consultant.documents
        .filter((document) => document.selected)
        .map((document) => document.documentId),
    ),
  }));
  const [message, setMessage] = useState(
    `Hello ${consultant.fullName.split(" ")[0]}, your signed DeepBridge contract and consultant documents are ready in the secure portal. Use the secure link in this email to sign in and download them.`,
  );
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const completedByDocumentId = new Map(
    consultant.documents
      .filter(
        (document) => document.selected && document.status === "completed",
      )
      .map((document) => [document.documentId, document]),
  );
  const dirty =
    fullName.trim() !== savedDetails.fullName ||
    businessName.trim() !== savedDetails.businessName ||
    email.trim().toLowerCase() !== savedDetails.email ||
    [...savedDetails.documentIds].some(
      (documentId) => !selectedIds.has(documentId),
    ) ||
    [...selectedIds].some(
      (documentId) => !savedDetails.documentIds.has(documentId),
    );

  function toggleDocument(documentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
    setFeedback(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (!demo) {
        const result = await updateAdminConsultant({
          consultantId: consultant.id,
          fullName,
          businessName,
          email,
          includedDocumentIds: [...selectedIds],
        });
        setFeedback({
          tone: result.retainedCompletedDocuments.length
            ? "warning"
            : "success",
          message: result.retainedCompletedDocuments.length
            ? `Saved. Completed documents were retained for the audit record: ${result.retainedCompletedDocuments.join(", ")}.`
            : "Consultant details and document access have been saved.",
        });
      } else {
        setFeedback({
          tone: "success",
          message: "Preview saved. No live records were changed.",
        });
      }
      setSavedDetails({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim().toLowerCase(),
        documentIds: new Set(selectedIds),
      });
      await onUpdated();
    } catch (saveError) {
      setFeedback({
        tone: "error",
        message:
          saveError instanceof Error
            ? saveError.message
            : "The consultant could not be updated.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function sendPortalEmail() {
    setSending(true);
    setFeedback(null);
    try {
      if (dirty)
        throw new Error(
          "Save the consultant details and document selection before sending the email.",
        );
      const result = demo
        ? { message: "Preview complete. No email was sent." }
        : await sendConsultantPortalLink({
            consultantId: consultant.id,
            message,
          });
      setFeedback({ tone: "success", message: result.message });
    } catch (sendError) {
      setFeedback({
        tone: "error",
        message:
          sendError instanceof Error
            ? sendError.message
            : "The secure portal email could not be sent.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal portal-consultant-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-consultant-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          aria-label="Close consultant manager"
        >
          ×
        </button>
        <p className="portal-kicker">Consultant access</p>
        <h2 id="manage-consultant-title">Manage {consultant.fullName}</h2>
        <p>
          Update the sign-in email, choose what appears in this consultant’s
          portal, and send a secure documents-ready message.
        </p>

        <form className="portal-form" onSubmit={save}>
          <div className="portal-consultant-fields">
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
            <label>
              Business name
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required
              />
            </label>
          </div>
          <label>
            Consultant sign-in email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>
          <small>
            Changing this replaces the existing test login. Save it before
            sending the secure portal link.
          </small>

          <fieldset className="portal-package-picker">
            <legend>Documents included in this consultant’s portal</legend>
            <p>
              Unchecking an unfinished document removes it from the active
              package. Completed records remain locked for audit. Upload or
              replace master PDFs in <Link to="/admin/documents">Documents</Link>.
            </p>
            {catalogue.map((document) => {
              const completed = completedByDocumentId.get(document.id);
              const available = document.versions.some(
                (version) =>
                  version.locked &&
                  version.scanStatus === "clean" &&
                  (!version.assignmentId ||
                    version.assignmentId === consultant.assignment?.id),
              );
              const disabled = Boolean(completed) || !available;
              return (
                <label
                  className={`portal-package-option${disabled ? " disabled" : ""}`}
                  key={document.id}
                >
                  <input
                    type="checkbox"
                    checked={
                      Boolean(completed) || selectedIds.has(document.id)
                    }
                    disabled={disabled}
                    onChange={() => toggleDocument(document.id)}
                  />
                  <span>
                    <strong>{document.title}</strong>
                    <small>
                      {completed
                        ? `Signed ${completed.versionLabel} — retained for audit`
                        : available
                          ? `${document.category} · ready to publish`
                          : "Upload and complete the security scan first"}
                    </small>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="portal-modal-actions">
            <button
              className="portal-button portal-button-secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save consultant"}
            </button>
          </div>
        </form>

        <div className="portal-consultant-email">
          <p className="portal-card-label">Secure portal email</p>
          <label htmlFor="consultant-email-message">Consultant message</label>
          <textarea
            id="consultant-email-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={600}
          />
          <small>
            The secure link is sent to {email.trim()} through the portal’s
            configured email service and expires automatically.
          </small>
          <button
            className="portal-button portal-button-primary"
            type="button"
            onClick={() => void sendPortalEmail()}
            disabled={sending || dirty}
          >
            {sending ? "Sending…" : "Send documents-ready link"}
          </button>
        </div>
        {feedback ? (
          <p
            className={`portal-form-message ${feedback.tone}`}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InviteDialog({
  demo,
  onClose,
  onInvited,
}: {
  demo: boolean;
  onClose: () => void;
  onInvited?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const input = {
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        businessName: String(formData.get("businessName") ?? ""),
      };
      if (!demo) await createInvitation(input);
      await onInvited?.();
      setMessage(
        demo
          ? "Preview complete. No email was sent."
          : "The secure invitation has been sent.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Invitation could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          aria-label="Close invitation form"
        >
          ×
        </button>
        <p className="portal-kicker">Invitation only</p>
        <h2 id="invite-title">Invite a consultant</h2>
        <form className="portal-form" onSubmit={submit}>
          <label htmlFor="invite-name">Full name</label>
          <input id="invite-name" name="fullName" required />
          <label htmlFor="invite-email">Email address</label>
          <input id="invite-email" name="email" type="email" required />
          <label htmlFor="invite-business">Business name</label>
          <input id="invite-business" name="businessName" required />
          {message ? (
            <p className="portal-form-message success" role="status">
              {message}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              className="portal-button portal-button-secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              type="submit"
              disabled={busy}
            >
              {busy ? "Sending…" : "Create and send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminAssignmentsPage() {
  const { demo } = usePortal();
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [organisations, setOrganisations] = useState<AdminOrganisation[]>([]);
  const [consultants, setConsultants] = useState<AdminConsultant[]>([]);
  const [selected, setSelected] = useState<AdminAssignment | null | undefined>(
    undefined,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!demo);

  const refresh = useCallback(async () => {
    if (demo) {
      setLoading(false);
      return;
    }
    try {
      const [assignmentResult, organisationResult, consultantResult] =
        await Promise.all([
          listAdminAssignments(),
          listAdminOrganisations(),
          listAdminConsultants(),
        ]);
      setAssignments(assignmentResult);
      setOrganisations(organisationResult);
      setConsultants(consultantResult);
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "Projects could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function saveProject(input: Parameters<typeof saveAdminAssignment>[0]) {
    if (!demo) await saveAdminAssignment(input);
    setSelected(undefined);
    setMessage(`${input.programme} is saved. Add contracts as separate branches from the project card.`);
    await refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Delivery workspace"
        title="Projects & assignments"
        description="Create a project, add consultants and delivery partners, then keep every contract or amendment as a separate controlled branch."
        action={
          <button
            className="portal-button portal-button-primary"
            type="button"
            onClick={() => setSelected(null)}
          >
            Create project
          </button>
        }
      />
      <div className="portal-privacy-callout">
        <span aria-hidden="true">i</span>
        <p>
          A project is the folder. Consultants and partner organisations sit
          inside it; each uploaded PDF is a contract branch with its own
          versions, signatures, audit record and Drive archive.
        </p>
      </div>
      {message ? (
        <p className="portal-form-message neutral" role="status">{message}</p>
      ) : null}
      <section className="portal-organisation-grid">
        {assignments.map((assignment) => {
          const partnerNames = [
            ...new Set(
              assignment.contracts
                .map((contract) => contract.counterpartyName)
                .filter(Boolean),
            ),
          ];
          return (
            <article className="portal-organisation-card" key={assignment.id}>
              <div>
                <span className="portal-card-label">{assignment.programme}</span>
                <StatusPill status={assignment.status === "active" ? "active" : "revoked"} />
              </div>
              <h2>{assignment.title}</h2>
              <p>
                {assignment.location} · Starts {assignment.startDate}
              </p>
              <div className="portal-relationship-tags">
                {assignment.consultants.map((consultant) => (
                  <span key={consultant.id}>
                    {consultant.fullName}
                    {consultant.businessName ? ` · ${consultant.businessName}` : ""}
                  </span>
                ))}
                {partnerNames.map((name) => <span key={name}>{name}</span>)}
                {!assignment.consultants.length && !partnerNames.length ? (
                  <span>No delivery participants yet</span>
                ) : null}
              </div>
              <dl className="portal-mini-details">
                <div>
                  <dt>Customer / programme</dt>
                  <dd>{assignment.customerOrganisation || assignment.endCustomerOrganisation || "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Contract branches</dt>
                  <dd>{assignment.contracts.length}</dd>
                </div>
              </dl>
              {assignment.contracts.length ? (
                <ul className="portal-document-list">
                  {assignment.contracts.map((contract) => (
                    <li key={contract.id}>
                      <span>
                        <strong>{contract.reference}</strong>
                        <small>{contract.counterpartyName} · {contract.status}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="portal-contract-actions">
                <Link
                  className="portal-button portal-button-primary"
                  to={`/admin/contracts?assignment=${assignment.id}&upload=1`}
                >
                  Add &amp; quick-sign PDF
                </Link>
                <button
                  type="button"
                  onClick={() => setSelected(assignment)}
                >
                  Edit project
                </button>
              </div>
            </article>
          );
        })}
        {!loading && !assignments.length ? (
          <article className="portal-panel">
            <h2>Create the first delivery project</h2>
            <p>Add Roland, Sneci or another delivery partner, then upload the applicable PDFs from that project.</p>
          </article>
        ) : null}
      </section>
      {selected !== undefined ? (
        <AdminAssignmentDialog
          assignment={selected}
          organisations={organisations}
          consultants={consultants}
          onClose={() => setSelected(undefined)}
          onSave={saveProject}
        />
      ) : null}
    </>
  );
}

function AdminAssignmentDialog({
  assignment,
  organisations,
  consultants,
  onClose,
  onSave,
}: {
  assignment: AdminAssignment | null;
  organisations: AdminOrganisation[];
  consultants: AdminConsultant[];
  onClose: () => void;
  onSave: (input: Parameters<typeof saveAdminAssignment>[0]) => Promise<void>;
}) {
  const deepBridge = organisations.find((item) =>
    item.relationshipTypes.includes("deepbridge_entity"),
  );
  const [title, setTitle] = useState(assignment?.title || "");
  const [programme, setProgramme] = useState(assignment?.programme || "");
  const [location, setLocation] = useState(assignment?.location || "Remote / as agreed");
  const [startDate, setStartDate] = useState(
    assignment?.startDateValue || new Date().toISOString().slice(0, 10),
  );
  const [expectedEnd, setExpectedEnd] = useState(assignment?.expectedEnd || "To be confirmed");
  const [currency, setCurrency] = useState(assignment?.currency || "EUR");
  const [contractingOrganisationId, setContractingOrganisationId] = useState(
    assignment?.contractingOrganisationId || deepBridge?.id || "",
  );
  const [customerOrganisationId, setCustomerOrganisationId] = useState(
    assignment?.customerOrganisationId || "",
  );
  const [endCustomerOrganisationId, setEndCustomerOrganisationId] = useState(
    assignment?.endCustomerOrganisationId || "",
  );
  const [consultantProfileIds, setConsultantProfileIds] = useState<string[]>(
    assignment?.consultants.map((consultant) => consultant.id) || [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleConsultant(consultantId: string) {
    setConsultantProfileIds((current) =>
      current.includes(consultantId)
        ? current.filter((id) => id !== consultantId)
        : [...current, consultantId],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        assignmentId: assignment?.id,
        title,
        programme,
        location,
        startDate,
        expectedEnd,
        currency,
        contractingOrganisationId,
        customerOrganisationId,
        endCustomerOrganisationId,
        consultantProfileIds,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The project could not be saved.");
      setBusy(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div className="portal-modal portal-consultant-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title">
        <button type="button" className="portal-modal-close" onClick={onClose} disabled={busy} aria-label="Close project form">×</button>
        <p className="portal-kicker">Project folder</p>
        <h2 id="assignment-dialog-title">{assignment ? "Edit project" : "Create project"}</h2>
        <form className="portal-form" onSubmit={submit}>
          <div className="portal-consultant-fields">
            <label>Project code<input value={programme} onChange={(event) => setProgramme(event.target.value.toUpperCase())} required maxLength={160} placeholder="DBA-SNECI-2026" /></label>
            <label>Project / assignment name<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={240} placeholder="Sneci delivery programme" /></label>
            <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} required maxLength={160} /></label>
            <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
            <label>Expected end<input value={expectedEnd} onChange={(event) => setExpectedEnd(event.target.value)} required maxLength={120} /></label>
            <label>Currency<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required maxLength={3} /></label>
            <label>DeepBridge entity<select value={contractingOrganisationId} onChange={(event) => setContractingOrganisationId(event.target.value)} required>{organisations.filter((item) => item.relationshipTypes.includes("deepbridge_entity")).map((item) => <option value={item.id} key={item.id}>{item.tradingName || item.legalName}</option>)}</select></label>
            <label>Customer / partner organisation<select value={customerOrganisationId} onChange={(event) => setCustomerOrganisationId(event.target.value)}><option value="">Not selected</option>{organisations.filter((item) => item.id !== contractingOrganisationId).map((item) => <option value={item.id} key={item.id}>{item.tradingName || item.legalName}</option>)}</select></label>
            <label>End customer<select value={endCustomerOrganisationId} onChange={(event) => setEndCustomerOrganisationId(event.target.value)}><option value="">Not selected</option>{organisations.filter((item) => item.id !== contractingOrganisationId).map((item) => <option value={item.id} key={item.id}>{item.tradingName || item.legalName}</option>)}</select></label>
          </div>
          <fieldset className="portal-package-picker">
            <legend>Consultants working on this project</legend>
            <div className="portal-choice-grid">
              {consultants.map((consultant) => (
                <label key={consultant.id}>
                  <input type="checkbox" checked={consultantProfileIds.includes(consultant.id)} onChange={() => toggleConsultant(consultant.id)} />
                  <span>{consultant.fullName}<small>{consultant.businessName}</small></span>
                </label>
              ))}
              {!consultants.length ? <p>Add consultants from the Consultants page first.</p> : null}
            </div>
          </fieldset>
          {error ? <p className="portal-form-message error" role="alert">{error}</p> : null}
          <div className="portal-modal-actions">
            <button type="button" className="portal-button portal-button-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="portal-button portal-button-primary" disabled={busy}>{busy ? "Saving project…" : "Save project"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function createDemoDocumentCatalogue(
  documents: PortalDocument[],
): AdminDocumentCatalogueItem[] {
  return documents.map((document) => ({
    id: `demo-${document.id}`,
    slug: document.id,
    title: document.title,
    description: document.description,
    category: document.category,
    versions: [
      {
        id: `demo-version-${document.id}`,
        versionLabel: document.version,
        scanStatus: "clean",
        locked: true,
        effectiveAt: document.updatedAt,
        createdAt: new Date().toISOString(),
        originalFilename: `${document.id}.pdf`,
        sizeBytes: 480_000,
      },
    ],
  }));
}

function AdminDocumentsPage() {
  const { snapshot, demo } = usePortal();
  const [catalogue, setCatalogue] = useState<AdminDocumentCatalogueItem[]>([]);
  const [selected, setSelected] =
    useState<AdminDocumentCatalogueItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    document: AdminDocumentCatalogueItem;
    version: AdminDocumentCatalogueItem["versions"][number];
  } | null>(null);
  const [message, setMessage] = useState("");
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [scannerConfigured, setScannerConfigured] = useState(demo);

  const refreshCatalogue = useCallback(async () => {
    if (demo) {
      setCatalogue(createDemoDocumentCatalogue(snapshot.documents));
      setScannerConfigured(true);
      setLoadingCatalogue(false);
      return;
    }
    try {
      const result = await listAdminDocumentCatalogue();
      setCatalogue(result.documents);
      setScannerConfigured(result.scannerConfigured);
    } catch (catalogueError) {
      setMessage(
        catalogueError instanceof Error
          ? catalogueError.message
          : "Document catalogue could not be loaded.",
      );
    } finally {
      setLoadingCatalogue(false);
    }
  }, [demo, snapshot.documents]);

  useEffect(() => {
    let active = true;
    const request = demo
      ? Promise.resolve({
          documents: createDemoDocumentCatalogue(snapshot.documents),
          scannerConfigured: true,
        })
      : listAdminDocumentCatalogue();
    request
      .then((result) => {
        if (active) {
          setCatalogue(result.documents);
          setScannerConfigured(result.scannerConfigured);
        }
      })
      .catch((catalogueError) => {
        if (active)
          setMessage(
            catalogueError instanceof Error
              ? catalogueError.message
              : "Document catalogue could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoadingCatalogue(false);
      });
    return () => {
      active = false;
    };
  }, [demo, snapshot.documents]);

  useEffect(() => {
    if (
      demo ||
      !scannerConfigured ||
      !catalogue.some(
        (document) => document.versions[0]?.scanStatus === "pending",
      )
    )
      return;
    const timer = window.setInterval(() => {
      void refreshCatalogue();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [catalogue, demo, refreshCatalogue, scannerConfigured]);

  async function handleVersionUpload(input: {
    document: AdminDocumentCatalogueItem;
    versionLabel: string;
    file: File;
    onProgress?: (progress: UploadProgress) => void;
  }) {
    if (demo) {
      setCatalogue((current) =>
        current.map((document) =>
          document.id === input.document.id
            ? {
                ...document,
                versions: [
                  {
                    id: `demo-${crypto.randomUUID()}`,
                    versionLabel: input.versionLabel,
                    scanStatus: "pending",
                    locked: false,
                    effectiveAt: new Date().toLocaleDateString("en-GB"),
                    createdAt: new Date().toISOString(),
                    originalFilename: input.file.name,
                    sizeBytes: input.file.size,
                  },
                  ...document.versions,
                ],
              }
            : document,
        ),
      );
    } else {
      await uploadAdminDocumentVersion({
        documentId: input.document.id,
        assignmentId: snapshot.assignment.id,
        versionLabel: input.versionLabel,
        file: input.file,
        onProgress: input.onProgress,
      });
      await refreshCatalogue();
    }
    setMessage(
      scannerConfigured
        ? `${input.document.title} v${input.versionLabel} uploaded. It will publish automatically after the security scan passes.`
        : `${input.document.title} v${input.versionLabel} is stored privately. Publication is paused until the security scanner is connected.`,
    );
  }

  async function handleVersionRemoval() {
    if (!removeTarget) return;
    const { document, version } = removeTarget;
    if (demo) {
      setCatalogue((current) =>
        current.map((item) =>
          item.id === document.id
            ? {
                ...item,
                versions: item.versions.filter(
                  (candidate) => candidate.id !== version.id,
                ),
              }
            : item,
        ),
      );
    } else {
      await removeAdminDocumentVersion(version.id);
      await refreshCatalogue();
    }
    setRemoveTarget(null);
    setMessage(
      `${document.title} v${version.versionLabel} was removed from private quarantine. You can upload the corrected PDF now.`,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Document control"
        description="Upload approved PDFs, preserve version history and publish each clean version to the assigned consultant."
        action={
          <button
            className="portal-button portal-button-primary"
            type="button"
            onClick={() => setSelected(catalogue[0] ?? null)}
            disabled={!catalogue.length}
          >
            Add approved PDF
          </button>
        }
      />
      <div className="portal-privacy-callout">
        <span aria-hidden="true">i</span>
        <p>
          Upload the final approved PDF only and keep its matching master copy
          in the restricted DeepBridge Google Drive folder. Files remain
          quarantined until their security scan passes; the previous version is
          preserved.
        </p>
      </div>
      {!scannerConfigured ? (
        <div className="portal-form-message warning" role="status">
          <strong>Security scanner setup required.</strong> Uploaded PDFs remain
          private and unavailable to consultants. You can remove a pending
          upload and replace it while the scanner connection is completed.
        </div>
      ) : null}
      {message ? (
        <p className="portal-form-message success" role="status">
          {message}
        </p>
      ) : null}
      <section className="portal-panel portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Current version</th>
              <th>Publication status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {catalogue.map((document) => {
              const latest = document.versions[0];
              const statusLabel = latest?.locked
                ? "Published"
                : latest?.scanStatus === "infected"
                  ? "Blocked"
                  : latest?.scanStatus === "failed"
                    ? "Scan failed"
                    : latest
                      ? scannerConfigured
                        ? "Security scan"
                        : "Scanner setup required"
                      : "Needs upload";
              const statusDetail =
                latest?.scanStatus === "pending" && scannerConfigured
                  ? "Usually under 2 minutes · refreshes automatically"
                  : latest?.scanStatus === "pending"
                    ? "Held safely in private quarantine"
                    : latest?.scanStatus === "failed"
                      ? "Remove the upload and try again"
                      : latest?.scanStatus === "infected"
                        ? "File is quarantined and cannot be published"
                        : "";
              return (
              <tr key={document.id}>
                <td>
                  <strong>{document.title}</strong>
                  <span>{document.description}</span>
                </td>
                <td>{categoryCopy[document.category].title}</td>
                <td>{latest ? `v${latest.versionLabel}` : "Not uploaded"}</td>
                <td>
                  <span
                    className={`portal-status ${
                      latest?.locked
                        ? "status-completed"
                        : latest?.scanStatus === "infected" ||
                            latest?.scanStatus === "failed"
                          ? "status-rejected"
                          : latest
                          ? "status-under_review"
                          : "status-missing"
                    }`}
                  >
                    <span aria-hidden="true" />
                    {statusLabel}
                  </span>
                  {statusDetail ? (
                    <small className="portal-status-detail">
                      {statusDetail}
                    </small>
                  ) : null}
                </td>
                <td>
                  <div className="portal-table-actions">
                    {latest && !latest.locked ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRemoveTarget({ document, version: latest })
                        }
                      >
                        Remove upload
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelected(document)}
                      >
                        {latest ? "Add version" : "Upload"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {!loadingCatalogue && !catalogue.length ? (
              <tr>
                <td colSpan={5}>No document types are configured.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
      {selected ? (
        <AdminDocumentUploadDialog
          document={selected}
          onClose={() => setSelected(null)}
          onUpload={handleVersionUpload}
        />
      ) : null}
      {removeTarget ? (
        <AdminDocumentRemovalDialog
          document={removeTarget.document}
          version={removeTarget.version}
          onClose={() => setRemoveTarget(null)}
          onConfirm={handleVersionRemoval}
        />
      ) : null}
    </>
  );
}

function AdminDocumentUploadDialog({
  document,
  onClose,
  onUpload,
}: {
  document: AdminDocumentCatalogueItem;
  onClose: () => void;
  onUpload: (input: {
    document: AdminDocumentCatalogueItem;
    versionLabel: string;
    file: File;
    onProgress?: (progress: UploadProgress) => void;
  }) => Promise<void>;
}) {
  const latestLabel = document.versions[0]?.versionLabel;
  const numericVersion = latestLabel?.match(/^(\d+)\.(\d+)$/);
  const suggestedVersion = numericVersion
    ? `${numericVersion[1]}.${Number(numericVersion[2]) + 1}`
    : latestLabel
      ? `${latestLabel}.1`
      : "1.0";
  const [versionLabel, setVersionLabel] = useState(suggestedVersion);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Choose a PDF file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("The maximum document size is 25 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setProgress({ phase: "preparing", percent: 0 });
    try {
      await onUpload({
        document,
        versionLabel,
        file,
        onProgress: setProgress,
      });
      onClose();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The document could not be uploaded.",
      );
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-upload-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          aria-label="Close document upload"
          disabled={busy}
        >
          ×
        </button>
        <p className="portal-kicker">Approved document version</p>
        <h2 id="document-upload-title">{document.title}</h2>
        <p>
          The PDF is stored privately, checksummed and scanned before it becomes
          available to the consultant.
        </p>
        <form className="portal-form" onSubmit={submit}>
          <label htmlFor="document-version">Version label</label>
          <input
            id="document-version"
            value={versionLabel}
            onChange={(event) => setVersionLabel(event.target.value)}
            required
            maxLength={40}
            placeholder="1.0"
          />
          <label htmlFor="approved-document-file">Approved PDF</label>
          <input
            id="approved-document-file"
            type="file"
            accept=".pdf,application/pdf"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <small>PDF only · maximum 25 MB · previous versions are retained</small>
          {progress ? <UploadProgressIndicator progress={progress} /> : null}
          {error ? (
            <p className="portal-form-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              className="portal-button portal-button-secondary"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              type="submit"
              disabled={!file || busy}
            >
              {busy ? "Uploading securely…" : "Upload and queue publication"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadProgressIndicator({ progress }: { progress: UploadProgress }) {
  const phaseLabel =
    progress.phase === "preparing"
      ? "Preparing secure upload"
      : progress.phase === "finalising"
        ? "Finalising private storage"
        : "Uploading encrypted PDF";
  const timeLabel =
    progress.phase === "uploading" &&
    progress.estimatedSecondsRemaining !== undefined
      ? progress.estimatedSecondsRemaining < 2
        ? "Almost complete"
        : `About ${progress.estimatedSecondsRemaining} seconds remaining`
      : progress.phase === "finalising"
        ? "A few seconds remaining"
        : "Calculating upload time";

  return (
    <div
      className="portal-upload-progress"
      role="progressbar"
      aria-label={phaseLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress.percent}
    >
      <div
        className="portal-upload-ring"
        style={
          {
            "--portal-upload-percent": `${progress.percent * 3.6}deg`,
          } as CSSProperties
        }
        aria-hidden="true"
      >
        <span>{progress.percent}%</span>
      </div>
      <div>
        <strong>{phaseLabel}</strong>
        <span>{timeLabel}</span>
      </div>
    </div>
  );
}

function AdminDocumentRemovalDialog({
  document,
  version,
  onClose,
  onConfirm,
}: {
  document: AdminDocumentCatalogueItem;
  version: AdminDocumentCatalogueItem["versions"][number];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmRemoval() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (removalError) {
      setError(
        removalError instanceof Error
          ? removalError.message
          : "The upload could not be removed.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-removal-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          aria-label="Close document removal"
          disabled={busy}
        >
          ×
        </button>
        <p className="portal-kicker">Remove private upload</p>
        <h2 id="document-removal-title">{document.title}</h2>
        <p>
          Version {version.versionLabel}
          {version.originalFilename
            ? ` (${version.originalFilename})`
            : ""}{" "}
          has not been published. Removing it deletes the quarantined copy and
          lets you reuse the same version label for a corrected PDF.
        </p>
        <p>
          Published versions cannot be removed because they are retained in the
          audit history.
        </p>
        {error ? (
          <p className="portal-form-message error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="portal-modal-actions">
          <button
            className="portal-button portal-button-secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Keep upload
          </button>
          <button
            className="portal-button portal-button-danger"
            type="button"
            onClick={() => void confirmRemoval()}
            disabled={busy}
          >
            {busy ? "Removing…" : "Remove upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

function createDemoSigningItems(
  documents: PortalDocument[],
): AdminSigningItem[] {
  return documents
    .filter((document) => document.category === "signature")
    .map((document) => ({
      id: `demo-${document.id}`,
      consultantId: "demo-consultant",
      consultantName: "Roland Schneider",
      consultantEmail: "roland.schneider@example.de",
      assignmentId: "assignment-planning-cluster-lead",
      documentSlug: document.id,
      title: document.title,
      versionLabel: document.version,
      status: document.status,
      publicationReady: true,
      provider: "google_workspace",
      providerStatus:
        document.status === "completed"
          ? "completed"
          : document.status === "awaiting_deepbridge"
            ? "consultant_signed"
            : document.status === "ready_to_sign"
              ? "sent"
              : undefined,
      sentAt:
        document.status === "not_reviewed" ? undefined : "26 Jul 2026, 10:30",
      consultantSignedAt:
        document.status === "awaiting_deepbridge" ||
        document.status === "completed"
          ? "26 Jul 2026, 14:45"
          : undefined,
      completedAt: document.completedAt,
      finalScanStatus: document.status === "completed" ? "clean" : undefined,
      certificateScanStatus:
        document.status === "completed" ? "clean" : undefined,
    }));
}

const SIGNING_SCAN_STALE_MS = 5 * 60 * 1_000;

function isFinalSecurityCheck(item: AdminSigningItem) {
  if (item.status === "completed" || item.providerStatus === "completed")
    return false;
  if (
    item.providerStatus?.includes("source_security_review") ||
    item.providerStatus === "consultant_upload_security_review"
  )
    return false;
  return (
    item.providerStatus === "security_review" ||
    item.providerStatus === "security_review_retry_needed" ||
    item.providerStatus === "security_review_failed" ||
    item.certificateScanStatus === "pending" ||
    item.certificateScanStatus === "failed" ||
    item.certificateScanStatus === "infected"
  );
}

function isSecurityCheckStale(item: AdminSigningItem) {
  if (item.providerStatus !== "security_review" || !item.scanUpdatedAt)
    return false;
  const updatedAt = Date.parse(item.scanUpdatedAt);
  return Number.isFinite(updatedAt) && Date.now() - updatedAt > SIGNING_SCAN_STALE_MS;
}

function isSecurityCheckInfected(item: AdminSigningItem) {
  return (
    item.finalScanStatus === "infected" ||
    item.certificateScanStatus === "infected"
  );
}

function isSecurityCheckRetryable(item: AdminSigningItem) {
  if (!isFinalSecurityCheck(item) || isSecurityCheckInfected(item)) return false;
  return (
    item.providerStatus === "security_review_retry_needed" ||
    item.providerStatus === "security_review_failed" ||
    item.finalScanStatus === "failed" ||
    item.certificateScanStatus === "failed" ||
    isSecurityCheckStale(item)
  );
}

function SecurityScanProgress({
  item,
  busy,
  onRetry,
  onDiscard,
}: {
  item: AdminSigningItem;
  busy: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const infected = isSecurityCheckInfected(item);
  const retryable = isSecurityCheckRetryable(item);
  const cleared = [item.finalScanStatus, item.certificateScanStatus].filter(
    (status) => status === "clean",
  ).length;
  return (
    <div className="portal-scan-progress">
      <strong>
        {infected
          ? "Security check failed"
          : item.portalGenerated && retryable
            ? "Signed copy ready"
          : retryable
            ? "Security check paused"
            : "Security check in progress"}
      </strong>
      {!infected && !retryable ? (
        <div
          className="portal-scan-bar"
          role="progressbar"
          aria-label="Final document security check"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={cleared}
        >
          <span />
        </div>
      ) : null}
      <small>
        {infected
          ? "Replace the signed file before continuing."
          : item.portalGenerated && retryable
            ? "The portal-created PDFs can be verified and released now."
          : retryable
            ? "Your signature is saved. Restart the file check once."
            : cleared
              ? `${cleared} of 2 files checked`
              : "Checking both signed files…"}
      </small>
      {retryable ? (
        <button type="button" disabled={busy} onClick={onRetry}>
          {busy
            ? item.portalGenerated
              ? "Finishing…"
              : "Restarting…"
            : item.portalGenerated
              ? "Finish & download"
              : "Retry security check"}
        </button>
      ) : null}
      {(item.status === "superseded" || item.hasPreviousCompleted) &&
      (retryable || infected) ? (
        <button type="button" disabled={busy} onClick={onDiscard}>
          {item.hasPreviousCompleted
            ? "Cancel correction & restore previous"
            : "Discard quarantined copy"}
        </button>
      ) : null}
    </div>
  );
}

function AdminSigningPage() {
  const { snapshot, demo } = usePortal();
  const [items, setItems] = useState<AdminSigningItem[]>([]);
  const [contracts, setContracts] = useState<AdminContract[]>([]);
  const [selected, setSelected] = useState<AdminSigningItem | null>(null);
  const [countersignSelected, setCountersignSelected] =
    useState<AdminSigningItem | null>(null);
  const [contractCountersignSelected, setContractCountersignSelected] =
    useState<AdminContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshItems() {
    if (demo) {
      setItems(createDemoSigningItems(snapshot.documents));
      setContracts([]);
      return;
    }
    const [nextItems, contractResult] = await Promise.all([
      listAdminSigningItems(),
      listAdminContracts(),
    ]);
    setItems(nextItems);
    setContracts(contractResult.contracts);
  }

  useEffect(() => {
    let active = true;
    const request = demo
      ? Promise.resolve({
          items: createDemoSigningItems(snapshot.documents),
          contracts: [] as AdminContract[],
        })
      : Promise.all([listAdminSigningItems(), listAdminContracts()]).then(
          ([nextItems, contractResult]) => ({
            items: nextItems,
            contracts: contractResult.contracts,
          }),
        );
    request
      .then((next) => {
        if (active) {
          setItems(next.items);
          setContracts(next.contracts);
        }
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Signing records could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, snapshot.documents]);

  const visibleContracts = contracts.filter(
    (contract) =>
      contract.requiresSignature &&
      !["archived", "superseded"].includes(contract.status),
  );

  const signingScanPending = items.some(
    (item) =>
      (item.providerStatus === "security_review" &&
        !isSecurityCheckStale(item)) ||
      item.providerStatus === "countersign_source_security_review" ||
      item.providerStatus ===
        "countersign_reissue_source_security_review" ||
      item.providerStatus === "consultant_upload_security_review" ||
      (!isSecurityCheckRetryable(item) &&
        (item.finalScanStatus === "pending" ||
          item.certificateScanStatus === "pending")),
  );
  const contractScanPending = visibleContracts.some((contract) => {
    const version = contract.versions[0];
    return (
      contract.status === "security_review" ||
      contract.status === "partially_signed" ||
      version?.scanStatus === "pending" ||
      version?.finalScanStatus === "pending" ||
      version?.certificateScanStatus === "pending"
    );
  });

  useEffect(() => {
    if (demo || (!signingScanPending && !contractScanPending)) return;
    const timer = window.setInterval(() => {
      void Promise.all([listAdminSigningItems(), listAdminContracts()])
        .then(([nextItems, contractResult]) => {
          setItems(nextItems);
          setContracts(contractResult.contracts);
        })
        .catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [contractScanPending, demo, signingScanPending]);

  async function recordStep(
    item: AdminSigningItem,
    action: "request_sent" | "consultant_signed",
  ) {
    setBusyId(item.id);
    setMessage("");
    setError("");
    try {
      if (demo) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id
              ? {
                  ...candidate,
                  status:
                    action === "request_sent"
                      ? "ready_to_sign"
                      : "awaiting_deepbridge",
                  providerStatus:
                    action === "request_sent" ? "sent" : "consultant_signed",
                  sentAt:
                    action === "request_sent"
                      ? new Date().toLocaleString("en-GB")
                      : candidate.sentAt,
                  consultantSignedAt:
                    action === "consultant_signed"
                      ? new Date().toLocaleString("en-GB")
                      : candidate.consultantSignedAt,
                }
              : candidate,
          ),
        );
      } else {
        await recordGoogleSigningStep(item.id, action);
        await refreshItems();
      }
      setMessage(
        action === "request_sent"
          ? "The Google Workspace request is now recorded and visible to the consultant."
          : "The consultant signature is recorded. DeepBridge countersignature is now due.",
      );
    } catch (stepError) {
      setError(
        stepError instanceof Error
          ? stepError.message
          : "The signing record could not be updated.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function downloadConsultantUpload(item: AdminSigningItem) {
    setBusyId(item.id);
    setMessage("");
    setError("");
    try {
      if (demo) {
        setMessage("Consultant-signed PDF download requested securely.");
      } else {
        await openSecureUrl(() => getConsultantSignedUpload(item.id));
      }
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "The consultant-signed PDF is not available.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function uploadPack(input: {
    item: AdminSigningItem;
    completedPdf: File;
    auditTrailPdf: File;
  }) {
    if (demo) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === input.item.id
            ? {
                ...candidate,
                providerStatus: "security_review",
                finalScanStatus: "pending",
                certificateScanStatus: "pending",
              }
            : candidate,
        ),
      );
    } else {
      await uploadCompletedSigningPack({
        assignedDocumentId: input.item.id,
        completedPdf: input.completedPdf,
        auditTrailPdf: input.auditTrailPdf,
      });
      await refreshItems();
    }
    setMessage(
      "The completed PDF and audit trail are quarantined for security scanning. They will publish automatically only after both pass.",
    );
  }

  async function countersign(input: {
    item: AdminSigningItem;
    consultantSignedPdf: File | null;
    signerName: string;
    signerTitle: string;
    signatureImageDataUrl: string;
    placement?: ManualPdfPlacement;
  }) {
    let countersignatureWasAlreadySubmitted = false;
    let countersignatureNeedsScanRetry = false;
    let completedImmediately = false;
    if (demo) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === input.item.id
            ? {
                ...candidate,
                status: "completed",
                providerStatus: "completed",
                finalScanStatus: "clean",
                certificateScanStatus: "clean",
              }
            : candidate,
        ),
      );
      completedImmediately = true;
    } else {
      if (input.consultantSignedPdf) {
        await prepareCountersignSource({
          assignedDocumentId: input.item.id,
          consultantSignedPdf: input.consultantSignedPdf,
          reissue: input.item.status === "completed",
        });

        let sourceReady = false;
        for (let attempt = 0; attempt < 80; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_500));
          const nextItems = await listAdminSigningItems();
          const current = nextItems.find(
            (candidate) => candidate.id === input.item.id,
          );
          if (
            current?.finalScanStatus === "infected" ||
            current?.finalScanStatus === "failed"
          ) {
            throw new Error(
              "The consultant-signed PDF did not pass security review.",
            );
          }
          if (
            current?.finalScanStatus === "clean" &&
            current.providerStatus === "consultant_signed"
          ) {
            sourceReady = true;
            break;
          }
        }
        if (!sourceReady) {
          throw new Error(
            "The source PDF is still being scanned. Close this message and try Review & sign again shortly.",
          );
        }
      }

      try {
        const result = await createPortalCountersignature({
          assignedDocumentId: input.item.id,
          signerName: input.signerName,
          signerTitle: input.signerTitle,
          signatureImageDataUrl: input.signatureImageDataUrl,
          confirmed: true,
          placement: input.placement,
        });
        completedImmediately = result.status === "completed";
      } catch (signError) {
        // The server may have committed the signature even if the browser lost
        // the success response. Reconcile before presenting a retryable error so
        // a second click does not misleadingly ask for the source PDF again.
        try {
          const latestItems = await listAdminSigningItems();
          setItems(latestItems);
          const latest = latestItems.find(
            (candidate) => candidate.id === input.item.id,
          );
          countersignatureWasAlreadySubmitted = Boolean(
            latest &&
              (((latest.providerStatus === "security_review" ||
                latest.providerStatus === "security_review_retry_needed") &&
                (latest.finalScanStatus === "pending" ||
                  latest.finalScanStatus === "clean")) ||
                (latest.status === "completed" &&
                  latest.providerStatus === "completed")),
          );
          countersignatureNeedsScanRetry =
            latest?.providerStatus === "security_review_retry_needed";
        } catch {
          // Preserve the original signing error when reconciliation is
          // temporarily unavailable.
        }
        if (!countersignatureWasAlreadySubmitted) throw signError;
      }
      await refreshItems();
    }
    setMessage(
      countersignatureWasAlreadySubmitted
        ? countersignatureNeedsScanRetry
          ? "The countersignature is saved. Use Retry security check once; do not sign the agreement again."
          : "The countersignature was already accepted. Final security checks are in progress; do not sign the agreement again."
        : completedImmediately
          ? "DeepBridge signed the agreement. The signed PDF and audit certificate are ready to download now."
          : "DeepBridge signed the agreement. The final PDF and its audit certificate are undergoing the final security scan and will become downloadable automatically.",
    );
  }

  async function downloadCompleted(
    item: AdminSigningItem,
    kind: "final" | "certificate",
  ) {
    setBusyId(item.id);
    setMessage("");
    setError("");
    try {
      if (demo) {
        setMessage(
          kind === "final"
            ? "Final signed PDF download requested."
            : "Audit certificate download requested.",
        );
      } else {
        await openSecureUrl(() => getDocumentAccess(item.id, kind));
      }
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "The completed document is not available.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function openSigningContract(
    contract: AdminContract,
    kind: "source" | "final" | "certificate",
  ) {
    const version = contract.versions[0];
    if (!version) return;
    setBusyId(`${version.id}-${kind}`);
    setMessage("");
    setError("");
    try {
      if (demo) {
        setMessage("Contract file access is simulated in local review mode.");
      } else {
        await openSecureUrl(() => getAdminContractAccess(version.id, kind));
      }
    } catch (accessError) {
      setError(
        accessError instanceof Error
          ? accessError.message
          : "The contract file could not be opened.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function retrySecurityCheck(item: AdminSigningItem) {
    setBusyId(item.id);
    setMessage("");
    setError("");
    try {
      if (demo) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id
              ? {
                  ...candidate,
                  providerStatus: "security_review",
                  finalScanStatus: "pending",
                  certificateScanStatus: "pending",
                  scanUpdatedAt: new Date().toISOString(),
                }
              : candidate,
          ),
        );
      } else {
        const result = await retrySigningSecurityScan(item.id);
        await refreshItems();
        if (result.downloadAvailable) {
          await openSecureUrl(() => getDocumentAccess(item.id, "final"));
          setMessage(
            "The signed PDF is complete and its download has started. The audit certificate is also available.",
          );
          return;
        }
      }
      setMessage(
        "Security check restarted. Your signature is already saved; no further signing is needed.",
      );
    } catch (retryError) {
      try {
        if (!demo) await refreshItems();
      } catch {
        // Keep the original scanner error visible.
      }
      setError(
        retryError instanceof Error
          ? retryError.message
          : "The security check could not be restarted.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function discardIncompleteAttempt(item: AdminSigningItem) {
    const confirmed = window.confirm(
      item.hasPreviousCompleted
        ? "Cancel this correction and restore the previous completed signed copy? The incomplete replacement files will be permanently removed; the audit event will remain."
        : "Permanently remove this incomplete quarantined copy? The audit event will remain.",
    );
    if (!confirmed) return;
    setBusyId(item.id);
    setMessage("");
    setError("");
    try {
      if (demo) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id
              ? {
                  ...candidate,
                  providerStatus: "discarded",
                  finalScanStatus: undefined,
                  certificateScanStatus: undefined,
                  status: item.hasPreviousCompleted
                    ? "completed"
                    : candidate.status,
                }
              : candidate,
          ),
        );
      } else {
        const result = await discardSigningAttempt(item.id);
        await refreshItems();
        setMessage(
          result.previousCopyRestored
            ? "The incomplete correction was removed and the previous completed signed copy is available again."
            : result.resetForRetry
              ? "The failed upload was removed. You can open Review & sign and upload the corrected PDF again."
              : "The incomplete quarantined copy was permanently removed. Its audit event was retained.",
        );
        return;
      }
      setMessage("The incomplete signing attempt was removed.");
    } catch (discardError) {
      setError(
        discardError instanceof Error
          ? discardError.message
          : "The incomplete signing attempt could not be removed.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Document signing"
        description="Use Google Workspace when available, or securely review a consultant-uploaded signed PDF before countersigning."
        action={
          <a
            className="portal-button portal-button-primary"
            href="https://drive.google.com/drive/folders/1KoFJH59qiKLCeXTyLr1jvgu_Mb9SPZDR"
            target="_blank"
            rel="noreferrer"
          >
            Open Google Drive
          </a>
        }
      />
      <section className="portal-signing-workflow" aria-label="Signing workflow">
        <article>
          <span>1</span>
          <p>
            <strong>Receive consultant signature</strong>
            <small>
              Use Google Workspace or let the consultant return the complete
              signed PDF through the protected portal.
            </small>
          </p>
        </article>
        <article>
          <span>2</span>
          <p>
            <strong>Review &amp; sign</strong>
            <small>
              Review every page, confirm your signing authority and add the
              DeepBridge electronic countersignature.
            </small>
          </p>
        </article>
        <article>
          <span>3</span>
          <p>
            <strong>Download completion</strong>
            <small>
              Portal-created signed PDFs are available immediately. Externally
              uploaded packs appear after their security check.
            </small>
          </p>
        </article>
      </section>
      <details className="portal-signing-help">
        <summary>How to use document signing</summary>
        <ol>
          <li>
            When a record says <strong>Awaiting DeepBridge</strong>, select{" "}
            <strong>Review &amp; sign</strong>, review every page, then sign.
          </li>
          <li>
            When it says <strong>Completed</strong>, download the signed PDF and
            audit certificate. They are the permanent completion record.
          </li>
          <li>
            Use <strong>Correct or reissue signed copy</strong> only when the
            wrong consultant-signed source was used. The previous record remains
            in the audit history.
          </li>
          <li>
            Use <strong>Upload externally signed pack</strong> when signing was
            completed in Google Workspace or another approved provider.
          </li>
        </ol>
      </details>
      <div className="portal-privacy-callout">
        <span aria-hidden="true">i</span>
        <p>
          Keep the Drive folder restricted to named DeepBridge administrators.
          Never publish a Drive link or share identity, banking or tax folders
          with consultants.
        </p>
      </div>
      {message ? (
        <p className="portal-form-message success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="portal-form-message error" role="alert">
          {error}
        </p>
      ) : null}
      <section className="portal-panel portal-table-wrap">
        <div className="portal-section-heading">
          <div>
            <p className="portal-kicker">Contract register</p>
            <h2>Project &amp; partner contracts</h2>
            <p>
              Contracts uploaded from the contract register appear here for
              review, signature placement, countersignature and download.
            </p>
          </div>
          <Link to="/admin/contracts">Open contract register</Link>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Counterparty</th>
              <th>Contract</th>
              <th>Portal status</th>
              <th>File record</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleContracts.map((contract) => {
              const version = contract.versions[0];
              const readyToCountersign =
                version?.scanStatus === "clean" &&
                ["ready_to_sign", "out_for_signature", "partially_signed"].includes(
                  contract.status,
                );
              return (
                <tr key={`contract-signing-${contract.id}`}>
                  <td>
                    <strong>{contract.counterparty.name}</strong>
                    <span>{contract.assignmentId ? "Project contract" : "Contract library"}</span>
                  </td>
                  <td>
                    <strong>{contract.title}</strong>
                    <span>{contract.reference} · Version {version?.versionLabel || "—"}</span>
                  </td>
                  <td>
                    <strong>{contractStatusLabels[contract.status] || contract.status.replaceAll("_", " ")}</strong>
                    <span>{contract.requiresSignature ? "DeepBridge signature required" : "No signature required"}</span>
                  </td>
                  <td>
                    <strong>
                      {version?.scanStatus === "clean"
                        ? "Source PDF verified"
                        : version?.scanStatus === "infected"
                          ? "Unsafe file blocked"
                          : "File safety review"}
                    </strong>
                    <span>
                      {version?.finalAvailable
                        ? "Countersigned PDF ready"
                        : version?.scanStatus || "No version uploaded"}
                    </span>
                  </td>
                  <td>
                    <div className="portal-table-actions">
                      {version?.scanStatus === "clean" ? (
                        <button
                          type="button"
                          disabled={busyId === `${version.id}-source`}
                          onClick={() => void openSigningContract(contract, "source")}
                        >
                          Review source
                        </button>
                      ) : null}
                      {readyToCountersign ? (
                        <button
                          type="button"
                          className="portal-table-primary-action"
                          disabled={Boolean(busyId)}
                          onClick={() => setContractCountersignSelected(contract)}
                        >
                          Review, place &amp; sign
                        </button>
                      ) : null}
                      {version?.finalAvailable ? (
                        <button
                          type="button"
                          className="portal-table-primary-action"
                          disabled={busyId === `${version.id}-final`}
                          onClick={() => void openSigningContract(contract, "final")}
                        >
                          Download signed PDF
                        </button>
                      ) : null}
                      {version?.certificateAvailable ? (
                        <button
                          type="button"
                          disabled={busyId === `${version.id}-certificate`}
                          onClick={() => void openSigningContract(contract, "certificate")}
                        >
                          Download audit certificate
                        </button>
                      ) : null}
                      {!readyToCountersign && !version?.finalAvailable ? (
                        <Link to="/admin/contracts">Resolve in Contracts</Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !visibleContracts.length ? (
              <tr>
                <td colSpan={5}>No project or partner contracts require signature.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
      <section className="portal-panel portal-table-wrap">
        <div className="portal-section-heading">
          <div>
            <p className="portal-kicker">Consultant onboarding</p>
            <h2>Consultant agreements</h2>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Consultant</th>
              <th>Agreement</th>
              <th>Portal status</th>
              <th>Signing record</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const finalSecurityCheck = isFinalSecurityCheck(item);
              const sourceScanning =
                item.providerStatus ===
                  "consultant_upload_security_review" ||
                item.providerStatus === "countersign_source_security_review" ||
                item.providerStatus ===
                  "countersign_reissue_source_security_review";
              const sourceFailed =
                item.providerStatus ===
                  "countersign_source_security_review_failed" ||
                item.providerStatus ===
                  "countersign_reissue_source_security_review_failed";
              const scanning = finalSecurityCheck || sourceScanning;
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.consultantName}</strong>
                    <span>{item.consultantEmail}</span>
                  </td>
                  <td>
                    <strong>{item.title}</strong>
                    <span>Version {item.versionLabel}</span>
                  </td>
                  <td>
                    <StatusPill status={item.status} />
                  </td>
                  <td>
                    <strong>
                      {scanning
                        ? "Security review"
                        : item.providerStatus
                          ? item.providerStatus.replaceAll("_", " ")
                          : "Not sent"}
                    </strong>
                    <span>
                      {item.provider === "manual_upload"
                        ? "Manual signed-PDF fallback"
                        : item.sentAt ?? "No Google request recorded"}
                    </span>
                  </td>
                  <td>
                    {finalSecurityCheck ? (
                      <SecurityScanProgress
                        item={item}
                        busy={busyId === item.id}
                        onRetry={() => void retrySecurityCheck(item)}
                        onDiscard={() => void discardIncompleteAttempt(item)}
                      />
                    ) : sourceScanning ? (
                      <div className="portal-scan-progress">
                        <strong>Checking uploaded PDF</strong>
                        <div
                          className="portal-scan-bar"
                          role="progressbar"
                          aria-label="Uploaded document security check"
                        >
                          <span />
                        </div>
                        <small>This page updates automatically.</small>
                      </div>
                    ) : sourceFailed ? (
                      <div className="portal-scan-progress">
                        <strong>Uploaded PDF was not cleared</strong>
                        <small>
                          Remove this incomplete attempt, then upload the
                          corrected consultant-signed PDF again.
                        </small>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void discardIncompleteAttempt(item)}
                        >
                          {item.hasPreviousCompleted
                            ? "Cancel correction & restore previous"
                            : "Discard quarantined copy"}
                        </button>
                      </div>
                    ) : item.status === "not_reviewed" ? (
                      <button
                        type="button"
                        disabled={!item.publicationReady || busyId === item.id}
                        onClick={() => recordStep(item, "request_sent")}
                      >
                        Record request sent
                      </button>
                    ) : item.status === "ready_to_sign" ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => recordStep(item, "consultant_signed")}
                      >
                        Record consultant signed
                      </button>
                    ) : item.status === "awaiting_deepbridge" ? (
                      <div className="portal-table-actions">
                        <button
                          className="portal-table-primary-action"
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => setCountersignSelected(item)}
                        >
                          Review &amp; sign
                        </button>
                        {item.provider === "manual_upload" ? (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() =>
                              void downloadConsultantUpload(item)
                            }
                          >
                            Download consultant PDF
                          </button>
                        ) : null}
                        <button type="button" onClick={() => setSelected(item)}>
                          Upload externally signed pack
                        </button>
                      </div>
                    ) : item.status === "completed" ? (
                      <div className="portal-table-actions">
                        <button
                          className="portal-table-primary-action"
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void downloadCompleted(item, "final")}
                        >
                          Download signed PDF
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() =>
                            void downloadCompleted(item, "certificate")
                          }
                        >
                          Download audit certificate
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() =>
                            item.hasPreviousCompleted &&
                            item.providerStatus === "consultant_signed"
                              ? void discardIncompleteAttempt(item)
                              : setCountersignSelected(item)
                          }
                        >
                          {item.hasPreviousCompleted &&
                          item.providerStatus === "consultant_signed"
                            ? "Cancel correction & keep previous"
                            : "Correct or reissue signed copy"}
                        </button>
                        {item.hasPreviousCompleted &&
                        item.providerStatus === "consultant_signed" ? (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => setCountersignSelected(item)}
                          >
                            Continue corrected copy
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!loading && !items.length ? (
              <tr>
                <td colSpan={5}>No signature documents are assigned.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
      {selected ? (
        <AdminSigningPackDialog
          item={selected}
          onClose={() => setSelected(null)}
          onUpload={uploadPack}
        />
      ) : null}
      {countersignSelected ? (
        <AdminCountersignDialog
          item={countersignSelected}
          defaultSignerName={snapshot.profile.fullName}
          onClose={() => setCountersignSelected(null)}
          onReviewConsultantPdf={downloadConsultantUpload}
          onSign={countersign}
        />
      ) : null}
      {contractCountersignSelected ? (
        <AdminContractCountersignDialog
          contract={contractCountersignSelected}
          defaultSignerName={snapshot.profile.fullName}
          demo={demo}
          onClose={() => setContractCountersignSelected(null)}
          onCompleted={async () => {
            const reference = contractCountersignSelected.reference;
            setContractCountersignSelected(null);
            setMessage(
              `${reference} was countersigned. Its signed PDF and audit certificate are ready to download from this page.`,
            );
            await refreshItems();
          }}
        />
      ) : null}
    </>
  );
}

async function typedSignatureImage(name: string) {
  if ("fonts" in document)
    await document.fonts.load("116px AlluraSignature");
  const canvas = document.createElement("canvas");
  canvas.width = 1_200;
  canvas.height = 300;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The signature preview is not available.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0b3c43";
  context.textAlign = "center";
  context.textBaseline = "middle";
  let size = 152;
  do {
    context.font = `${size}px AlluraSignature, "Brush Script MT", cursive`;
    if (context.measureText(name).width <= 1_070) break;
    size -= 6;
  } while (size > 66);
  context.fillText(name, canvas.width / 2, canvas.height / 2 + 8);
  return canvas.toDataURL("image/png");
}

let sharedPdfPreviewWorker: Worker | null = null;

function initialManualPdfPlacement(title: string): ManualPdfPlacement {
  if (title.toLowerCase().includes("professional consultant charter")) {
    return {
      pageIndex: 0,
      signature: { x: 0.18, y: 0.315, size: 0.8 },
      date: { x: 0.15, y: 0.36, size: 0.75 },
    };
  }
  return {
    pageIndex: 0,
    signature: { x: 0.14, y: 0.66, size: 0.8 },
    date: { x: 0.14, y: 0.74, size: 0.75 },
  };
}

type PdfPlacementTarget = "signature" | "date";

function PdfPlacementEditor({
  bytes,
  signerName,
  placement,
  onChange,
  onPageChange,
}: {
  bytes: Uint8Array;
  signerName: string;
  placement: ManualPdfPlacement;
  onChange: (placement: ManualPdfPlacement) => void;
  onPageChange: (pageIndex: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRatio, setPageRatio] = useState(595.28 / 841.89);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState("");
  const [fineTarget, setFineTarget] =
    useState<PdfPlacementTarget>("signature");
  const [drag, setDrag] = useState<{
    target: PdfPlacementTarget;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const initialPageChosen = useRef(false);

  useEffect(() => {
    let active = true;
    let pdfDocument: { destroy: () => Promise<void> } | undefined;
    void import("pdfjs-dist")
      .then(async (pdfjs) => {
        if (!sharedPdfPreviewWorker)
          sharedPdfPreviewWorker = new PdfWorker();
        pdfjs.GlobalWorkerOptions.workerPort = sharedPdfPreviewWorker;
        const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
        const loaded = await loadingTask.promise;
        pdfDocument = loaded;
        if (!active) return;
        setPageCount(loaded.numPages);
        if (!initialPageChosen.current) {
          initialPageChosen.current = true;
          const lastPageIndex = loaded.numPages - 1;
          if (lastPageIndex !== placement.pageIndex) {
            onPageChange(lastPageIndex);
            return;
          }
        }
        const requestedPage = Math.min(
          Math.max(placement.pageIndex, 0),
          loaded.numPages - 1,
        );
        if (requestedPage !== placement.pageIndex) {
          onPageChange(requestedPage);
          return;
        }
        const page = await loaded.getPage(requestedPage + 1);
        if (!active || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 1.55 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The PDF preview canvas is unavailable.");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        setPageRatio(viewport.width / viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
      })
      .catch((error) => {
        if (active)
          setRenderError(
            error instanceof Error
              ? error.message
              : "The PDF page could not be previewed.",
          );
      })
      .finally(() => {
        if (active) setRendering(false);
      });
    return () => {
      active = false;
      if (pdfDocument) void pdfDocument.destroy();
    };
  }, [bytes, onPageChange, placement.pageIndex]);

  function changePage(pageIndex: number) {
    setRendering(true);
    setRenderError("");
    onPageChange(pageIndex);
  }

  function pointFor(target: PdfPlacementTarget) {
    return placement[target];
  }

  function beginDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    target: PdfPlacementTarget,
  ) {
    if (!pageRef.current) return;
    const bounds = pageRef.current.getBoundingClientRect();
    const point = pointFor(target);
    setFineTarget(target);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      target,
      offsetX: event.clientX - bounds.left - point.x * bounds.width,
      offsetY: event.clientY - bounds.top - point.y * bounds.height,
    });
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag || !pageRef.current) return;
    const bounds = pageRef.current.getBoundingClientRect();
    const x = Math.max(
      0.015,
      Math.min(
        0.94,
        (event.clientX - bounds.left - drag.offsetX) / bounds.width,
      ),
    );
    const y = Math.max(
      0.015,
      Math.min(
        0.94,
        (event.clientY - bounds.top - drag.offsetY) / bounds.height,
      ),
    );
    onChange({
      ...placement,
      [drag.target]: { ...placement[drag.target], x, y },
    });
  }

  function nudgeTarget(target: PdfPlacementTarget, deltaX: number, deltaY: number) {
    const point = pointFor(target);
    const x = Math.max(0.005, Math.min(0.96, point.x + deltaX));
    const y = Math.max(0.005, Math.min(0.96, point.y + deltaY));
    onChange({
      ...placement,
      [target]: { ...placement[target], x, y },
    });
  }

  function handlePlacementKeys(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    target: PdfPlacementTarget,
  ) {
    const step = event.shiftKey ? 0.01 : 0.0025;
    const movement = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    setFineTarget(target);
    nudgeTarget(target, movement[0], movement[1]);
  }

  const signatureStyle = {
    left: `${placement.signature.x * 100}%`,
    top: `${placement.signature.y * 100}%`,
    "--placement-scale": placement.signature.size,
  } as CSSProperties;
  const dateStyle = {
    left: `${placement.date.x * 100}%`,
    top: `${placement.date.y * 100}%`,
    "--placement-scale": placement.date.size,
  } as CSSProperties;

  return (
    <div className="portal-pdf-placement-editor">
      <div className="portal-pdf-placement-toolbar">
        <div>
          <strong>Page {placement.pageIndex + 1}</strong>
          <span> of {pageCount || "…"}</span>
        </div>
        <div>
          <button
            type="button"
            className="portal-button portal-button-secondary"
            disabled={placement.pageIndex <= 0 || rendering}
            onClick={() => changePage(placement.pageIndex - 1)}
          >
            Previous page
          </button>
          <button
            type="button"
            className="portal-button portal-button-secondary"
            disabled={
              !pageCount || placement.pageIndex >= pageCount - 1 || rendering
            }
            onClick={() => changePage(placement.pageIndex + 1)}
          >
            Next page
          </button>
        </div>
      </div>
      <p>
        Drag each item to its exact position. The dashed box is the final PDF
        footprint; the small label above it is only an editor guide.
      </p>
      <div
        ref={pageRef}
        className="portal-pdf-placement-page"
        style={{ aspectRatio: String(pageRatio) }}
        onPointerMove={moveDrag}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <canvas ref={canvasRef} aria-label="PDF page placement preview" />
        {rendering ? <span className="portal-pdf-rendering">Rendering page…</span> : null}
        {renderError ? (
          <span className="portal-pdf-render-error">{renderError}</span>
        ) : null}
        <button
          type="button"
          className="portal-pdf-placement-item signature"
          style={signatureStyle}
          onPointerDown={(event) => beginDrag(event, "signature")}
          onKeyDown={(event) => handlePlacementKeys(event, "signature")}
        >
          <small>Signature</small>
          <span>{signerName || "Your name"}</span>
        </button>
        <button
          type="button"
          className="portal-pdf-placement-item date"
          style={dateStyle}
          onPointerDown={(event) => beginDrag(event, "date")}
          onKeyDown={(event) => handlePlacementKeys(event, "date")}
        >
          <small>Date</small>
          <span>
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date())}
          </span>
        </button>
      </div>
      <div className="portal-placement-tuning">
        <label>
          <span>Signature size</span>
          <input
            type="range"
            min="35"
            max="175"
            step="5"
            value={Math.round(placement.signature.size * 100)}
            onChange={(event) =>
              onChange({
                ...placement,
                signature: {
                  ...placement.signature,
                  size: Number(event.target.value) / 100,
                },
              })
            }
          />
          <strong>{Math.round(placement.signature.size * 100)}%</strong>
        </label>
        <label>
          <span>Date size</span>
          <input
            type="range"
            min="35"
            max="175"
            step="5"
            value={Math.round(placement.date.size * 100)}
            onChange={(event) =>
              onChange({
                ...placement,
                date: {
                  ...placement.date,
                  size: Number(event.target.value) / 100,
                },
              })
            }
          />
          <strong>{Math.round(placement.date.size * 100)}%</strong>
        </label>
      </div>
      <div className="portal-placement-nudge">
        <label htmlFor="placement-fine-target">Fine position</label>
        <select
          id="placement-fine-target"
          value={fineTarget}
          onChange={(event) =>
            setFineTarget(event.target.value as PdfPlacementTarget)
          }
        >
          <option value="signature">Signature</option>
          <option value="date">Date</option>
        </select>
        <div>
          <button
            type="button"
            aria-label={`Move ${fineTarget} left`}
            onClick={() => nudgeTarget(fineTarget, -0.0025, 0)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label={`Move ${fineTarget} up`}
            onClick={() => nudgeTarget(fineTarget, 0, -0.0025)}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move ${fineTarget} down`}
            onClick={() => nudgeTarget(fineTarget, 0, 0.0025)}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`Move ${fineTarget} right`}
            onClick={() => nudgeTarget(fineTarget, 0.0025, 0)}
          >
            →
          </button>
        </div>
        <small>Each tap moves less than 1 mm. Arrow keys also work.</small>
      </div>
    </div>
  );
}

function AdminCountersignDialog({
  item,
  defaultSignerName,
  onClose,
  onReviewConsultantPdf,
  onSign,
}: {
  item: AdminSigningItem;
  defaultSignerName: string;
  onClose: () => void;
  onReviewConsultantPdf: (item: AdminSigningItem) => Promise<void>;
  onSign: (input: {
    item: AdminSigningItem;
    consultantSignedPdf: File | null;
    signerName: string;
    signerTitle: string;
    signatureImageDataUrl: string;
    placement?: ManualPdfPlacement;
  }) => Promise<void>;
}) {
  const [consultantSignedPdf, setConsultantSignedPdf] = useState<File | null>(
    null,
  );
  const [signerName, setSignerName] = useState(
    defaultSignerName || "Yon Wallace",
  );
  const [signerTitle, setSignerTitle] = useState(
    "Director, DeepBridge Advisory",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [placementBytes, setPlacementBytes] = useState<Uint8Array | null>(null);
  const [manualPlacement, setManualPlacement] =
    useState<ManualPdfPlacement | null>(null);
  const [placementLoading, setPlacementLoading] = useState(false);
  const isReissue = item.status === "completed";
  const usesStoredConsultantPdf =
    item.providerStatus === "consultant_signed" &&
    item.finalScanStatus === "clean";
  const setPlacementPageIndex = useCallback((pageIndex: number) => {
    setManualPlacement((current) =>
      current ? { ...current, pageIndex } : current,
    );
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!usesStoredConsultantPdf && !consultantSignedPdf) {
      setError("Choose the PDF that already contains the consultant signature.");
      return;
    }
    if (consultantSignedPdf) {
      if (consultantSignedPdf.type !== "application/pdf") {
        setError("Choose a PDF document.");
        return;
      }
      if (consultantSignedPdf.size > 25 * 1024 * 1024) {
        setError("The PDF must be 25 MB or smaller.");
        return;
      }
    }
    if (!confirmed) return;
    setBusy(true);
    setError("");
    setProgress(
      consultantSignedPdf
        ? "Scanning the consultant-signed PDF before signing…"
        : "Creating the DeepBridge countersignature…",
    );
    try {
      const signatureImageDataUrl = await typedSignatureImage(signerName.trim());
      await onSign({
        item,
        consultantSignedPdf,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim(),
        signatureImageDataUrl,
        placement: manualPlacement ?? undefined,
      });
      onClose();
    } catch (signError) {
      setError(
        signError instanceof Error
          ? signError.message
          : "The agreement could not be countersigned.",
      );
      setProgress("");
      setBusy(false);
    }
  }

  function reviewSelectedPdf() {
    if (!consultantSignedPdf) return;
    const previewUrl = URL.createObjectURL(consultantSignedPdf);
    window.open(previewUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
  }

  async function openPlacementEditor() {
    setPlacementLoading(true);
    setError("");
    try {
      let bytes: Uint8Array;
      if (consultantSignedPdf) {
        bytes = new Uint8Array(await consultantSignedPdf.arrayBuffer());
      } else {
        const access = await getConsultantSignedUpload(item.id);
        if (!access.url)
          throw new Error("The secure PDF preview link could not be created.");
        const previewResponse = await fetch(access.url);
        if (!previewResponse.ok)
          throw new Error("The consultant-signed PDF could not be loaded.");
        bytes = new Uint8Array(await previewResponse.arrayBuffer());
      }
      if (
        bytes.length < 5 ||
        new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-"
      )
        throw new Error("The selected file is not a readable PDF.");
      setPlacementBytes(bytes);
      setManualPlacement(initialManualPdfPlacement(item.title));
    } catch (placementError) {
      setError(
        placementError instanceof Error
          ? placementError.message
          : "The PDF placement preview could not be opened.",
      );
    } finally {
      setPlacementLoading(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className={`portal-modal portal-signature-modal${manualPlacement ? " portal-signature-modal-placement" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="countersign-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          aria-label="Close countersignature"
          disabled={busy}
        >
          ×
        </button>
        <p className="portal-kicker">DeepBridge countersignature</p>
        <h2 id="countersign-title">{item.title}</h2>
        <p>
          {isReissue
            ? "Create a corrected final copy without interrupting access to the current completed copy. The current copy remains downloadable until the replacement succeeds; it is then retired from active use while its audit record remains."
            : "Review the consultant-signed agreement, then sign it electronically for DeepBridge."}{" "}
          The portal will place your signature and today&apos;s date in the
          agreement&apos;s DeepBridge execution block when it can identify that
          field safely. It always appends a tamper-evident countersignature page
          and creates a separate audit certificate.
        </p>
        <form className="portal-form" onSubmit={submit}>
          <div className="portal-signing-step">
            <span>1</span>
            <div>
              <strong>Consultant-signed PDF</strong>
              {usesStoredConsultantPdf ? (
                <>
                  <p>
                    The consultant upload is stored privately and has passed
                    security review.
                  </p>
                  <button
                    className="portal-button portal-button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => void onReviewConsultantPdf(item)}
                  >
                    Review consultant PDF
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Choose the PDF downloaded from Google or returned by the
                    consultant.{" "}
                    {isReissue
                      ? "Upload the corrected consultant-signed source. "
                      : ""}
                    It will be scanned before DeepBridge signs it.
                  </p>
                  <label htmlFor="consultant-signed-source">
                    Consultant-signed PDF
                  </label>
                  <input
                    id="consultant-signed-source"
                    type="file"
                    accept=".pdf,application/pdf"
                    required
                    disabled={busy}
                    onChange={(event) => {
                      setConsultantSignedPdf(event.target.files?.[0] ?? null);
                      setPlacementBytes(null);
                      setManualPlacement(null);
                    }}
                  />
                  {consultantSignedPdf ? (
                    <button
                      className="portal-button portal-button-secondary"
                      type="button"
                      disabled={busy}
                      onClick={reviewSelectedPdf}
                    >
                      Review selected PDF
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="portal-signing-step">
            <span>2</span>
            <div>
              <strong>Place in the PDF</strong>
              <p>
                Automatic placement remains available. To choose the exact
                positions, open the last page and drag the signature and
                countersignature date where they should appear. The corporate
                execution stamp appears only on the appended record page.
              </p>
              {manualPlacement && placementBytes ? (
                <>
                  <PdfPlacementEditor
                    bytes={placementBytes}
                    signerName={signerName}
                    placement={manualPlacement}
                    onChange={setManualPlacement}
                    onPageChange={setPlacementPageIndex}
                  />
                  <button
                    className="portal-button portal-button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPlacementBytes(null);
                      setManualPlacement(null);
                    }}
                  >
                    Use automatic placement
                  </button>
                </>
              ) : (
                <button
                  className="portal-button portal-button-secondary"
                  type="button"
                  disabled={
                    busy ||
                    placementLoading ||
                    (!usesStoredConsultantPdf && !consultantSignedPdf)
                  }
                  onClick={() => void openPlacementEditor()}
                >
                  {placementLoading
                    ? "Opening PDF…"
                    : "Place signature & date"}
                </button>
              )}
            </div>
          </div>

          <div className="portal-signing-step">
            <span>3</span>
            <div>
              <strong>DeepBridge signatory</strong>
              <label htmlFor="deepbridge-signer-name">Full name</label>
              <input
                id="deepbridge-signer-name"
                value={signerName}
                required
                minLength={2}
                maxLength={100}
                disabled={busy}
                onChange={(event) => setSignerName(event.target.value)}
              />
              <label htmlFor="deepbridge-signer-title">Title / authority</label>
              <input
                id="deepbridge-signer-title"
                value={signerTitle}
                required
                minLength={2}
                maxLength={120}
                disabled={busy}
                onChange={(event) => setSignerTitle(event.target.value)}
              />
              <div className="portal-signature-preview" aria-label="Signature preview">
                <div className="portal-signature-person">
                  <small>Authenticated signatory</small>
                  <span>{signerName || "Your name"}</span>
                  <p>{signerTitle || "Signing authority"}</p>
                </div>
                <div className="portal-corporate-stamp">
                  <small>Corporate execution stamp</small>
                  <div>
                    <span className="portal-stamp-mark" aria-hidden="true">
                      <span>D</span>
                      <span>B</span>
                    </span>
                    <p>
                      <strong>DeepBridge</strong>
                      <span>Advisory</span>
                    </p>
                  </div>
                  <b>DUSTDEEP LTD</b>
                  <p>Registered in England and Wales · Company no. 16775578</p>
                  <p>Kemp House, 152–160 City Road</p>
                  <p>London, United Kingdom, EC1V 2NX</p>
                </div>
                <p className="portal-signature-date">
                  Signing date:{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date())}
                  {" (UTC)"}
                </p>
              </div>
            </div>
          </div>

          <label className="portal-signature-consent">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I have reviewed the complete consultant-signed agreement, I am
              authorised to sign for DeepBridge Advisory, and I intend this
              electronic signature to bind DeepBridge to this document.
            </span>
          </label>

          <p className="portal-form-message neutral">
            This is a standard electronic signature with an audit record. Use
            Google Workspace or a qualified trust provider if a qualified
            electronic signature is contractually required.
          </p>
          {progress ? (
            <p className="portal-form-message success" role="status">
              {progress}
            </p>
          ) : null}
          {error ? (
            <p className="portal-form-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              className="portal-button portal-button-secondary"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              type="submit"
              disabled={
                busy ||
                !confirmed ||
                !signerName.trim() ||
                !signerTitle.trim() ||
                (!usesStoredConsultantPdf && !consultantSignedPdf)
              }
            >
              {busy
                ? "Signing securely…"
                : isReissue
                  ? "Sign & create corrected copy"
                  : "Sign for DeepBridge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminSigningPackDialog({
  item,
  onClose,
  onUpload,
}: {
  item: AdminSigningItem;
  onClose: () => void;
  onUpload: (input: {
    item: AdminSigningItem;
    completedPdf: File;
    auditTrailPdf: File;
  }) => Promise<void>;
}) {
  const [completedPdf, setCompletedPdf] = useState<File | null>(null);
  const [auditTrailPdf, setAuditTrailPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!completedPdf || !auditTrailPdf) return;
    for (const file of [completedPdf, auditTrailPdf]) {
      if (file.type !== "application/pdf") {
        setError("Choose the two PDF files downloaded from Google Drive.");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError("Each PDF must be 25 MB or smaller.");
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      await onUpload({ item, completedPdf, auditTrailPdf });
      onClose();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The completed signing pack could not be uploaded.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signing-pack-title"
      >
        <button
          type="button"
          className="portal-modal-close"
          onClick={onClose}
          aria-label="Close completed signing pack"
        >
          ×
        </button>
        <p className="portal-kicker">
          {item.provider === "manual_upload"
            ? "Completed manual signing pack"
            : "Completed Google signing pack"}
        </p>
        <h2 id="signing-pack-title">{item.title}</h2>
        <p>
          {item.provider === "manual_upload"
            ? "Upload the final countersigned PDF and a PDF audit note or signing evidence. Both remain unavailable until the security scanner clears them."
            : "Download both files from the completed Google Workspace request. They remain unavailable until the security scanner clears them."}
        </p>
        <form className="portal-form" onSubmit={submit}>
          <label htmlFor="completed-agreement">Completed signed PDF</label>
          <input
            id="completed-agreement"
            type="file"
            accept=".pdf,application/pdf"
            required
            onChange={(event) =>
              setCompletedPdf(event.target.files?.[0] ?? null)
            }
          />
          <label htmlFor="google-audit-trail">
            {item.provider === "manual_upload"
              ? "Signing evidence / audit note PDF"
              : "Google audit trail PDF"}
          </label>
          <input
            id="google-audit-trail"
            type="file"
            accept=".pdf,application/pdf"
            required
            onChange={(event) =>
              setAuditTrailPdf(event.target.files?.[0] ?? null)
            }
          />
          <small>PDF only · maximum 25 MB each · stored privately</small>
          {error ? (
            <p className="portal-form-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="portal-modal-actions">
            <button
              className="portal-button portal-button-secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              type="submit"
              disabled={!completedPdf || !auditTrailPdf || busy}
            >
              {busy ? "Uploading securely…" : "Upload and security-check"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminCompliancePage() {
  const { snapshot, demo, refresh, updateCompliance } = usePortal();
  const [selected, setSelected] = useState<ComplianceRequirement | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [openingSubmissionId, setOpeningSubmissionId] = useState("");
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState("");

  async function uploadForConsultant(
    requirement: ComplianceRequirement,
    file: File,
    expiryDate: string,
  ) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (
      !ALLOWED_UPLOAD_TYPES.has(file.type) ||
      !ALLOWED_UPLOAD_EXTENSIONS.has(extension)
    ) {
      throw new Error("Upload a PDF, JPG or PNG file.");
    }
    if (file.size > MAX_UPLOAD_BYTES)
      throw new Error("The maximum file size is 10 MB.");

    if (demo) {
      updateCompliance(requirement.id, {
        status: "uploaded",
        uploadedAt: new Date().toLocaleDateString("en-GB"),
        expiryDate: expiryDate || undefined,
        submissionId: `demo-admin-${requirement.id}`,
        originalFilename: file.name,
        scanStatus: "clean",
      });
    } else {
      await uploadComplianceFileAsAdmin(
        requirement.id,
        file,
        expiryDate,
      );
      await refresh();
    }
    setError("");
    setMessage(
      `${requirement.title} uploaded for ${requirement.consultantName || "the consultant"} and queued for security checks.`,
    );
  }

  async function openSubmission(requirement: ComplianceRequirement) {
    if (!requirement.submissionId) return;
    setOpeningSubmissionId(requirement.submissionId);
    setError("");
    try {
      if (demo) {
        setMessage("Secure preview is available only in the live portal.");
        return;
      }
      await openSecureUrl(() =>
        getComplianceSubmissionAccess(requirement.submissionId!),
      );
    } catch (accessError) {
      setError(
        accessError instanceof Error
          ? accessError.message
          : "The submission could not be opened.",
      );
    } finally {
      setOpeningSubmissionId("");
    }
  }

  async function review(
    requirement: ComplianceRequirement,
    status: "accepted" | "rejected",
  ) {
    if (!requirement.submissionId) return;
    setError("");
    setMessage("");
    setReviewingSubmissionId(requirement.submissionId);
    try {
      if (demo) {
        updateCompliance(requirement.id, {
          status,
          administratorNote:
            status === "accepted"
              ? "Verified by DeepBridge."
              : "Please provide a current, complete copy.",
          rejectionReason:
            status === "rejected"
              ? "Please provide a current, complete copy."
              : undefined,
        });
      } else {
        await reviewComplianceSubmission(
          requirement.submissionId,
          status,
          status === "accepted"
            ? "Verified by DeepBridge."
            : "Please provide a current, complete copy.",
        );
        await refresh();
      }
      setMessage(`${requirement.title} marked ${status}.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Review could not be saved.",
      );
    } finally {
      setReviewingSubmissionId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Compliance review"
        description="Review only files that have passed the configured malware scanning gate."
      />
      {message ? (
        <p className="portal-form-message success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="portal-form-message error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="portal-privacy-callout">
        <span aria-hidden="true">i</span>
        <p>
          Administrators may prepare a consultant&apos;s onboarding pack here.
          Every file is stored privately, scanned before viewing and recorded in
          the audit history. PDF, JPG and PNG files are accepted, up to 10 MB.
        </p>
      </div>
      <div className="portal-review-list">
        {snapshot.compliance.map((requirement) => {
          const hasSubmission = Boolean(requirement.submissionId);
          const isClean = requirement.scanStatus === "clean";
          const isScanPending = requirement.scanStatus === "pending";
          const scanFailed =
            requirement.scanStatus === "failed" ||
            requirement.scanStatus === "infected";
          const isAccepted = requirement.status === "accepted";
          const isRejected = requirement.status === "rejected";
          const reviewing =
            reviewingSubmissionId === requirement.submissionId;
          return (
            <article className="portal-panel" key={requirement.id}>
            <div className="portal-review-heading">
              <div>
                <p className="portal-card-label">
                  {requirement.consultantName || "Consultant"}
                  {requirement.consultantEmail
                    ? ` · ${requirement.consultantEmail}`
                    : ""}
                </p>
                <h2>{requirement.title}</h2>
              </div>
              <StatusPill status={requirement.status} />
            </div>
            <p>{requirement.description}</p>
            <dl className="portal-mini-list">
              <div>
                <dt>Uploaded</dt>
                <dd>{requirement.uploadedAt || "No submission"}</dd>
              </div>
              <div>
                <dt>Expiry</dt>
                <dd>{requirement.expiryDate || "Not supplied"}</dd>
              </div>
              <div>
                <dt>File</dt>
                <dd>{requirement.originalFilename || "No submission"}</dd>
              </div>
              <div>
                <dt>Security scan</dt>
                <dd>
                  {requirement.scanStatus === "clean"
                    ? "Passed"
                    : requirement.scanStatus === "pending"
                      ? "Checking…"
                      : requirement.scanStatus
                        ? "Needs replacement"
                      : "Not applicable"}
                </dd>
              </div>
            </dl>
              {hasSubmission && isScanPending ? (
                <div className="portal-scan-progress portal-compliance-scan">
                  <strong>Checking uploaded file</strong>
                  <div
                    className="portal-scan-bar"
                    role="progressbar"
                    aria-label={`${requirement.title} security check`}
                  >
                    <span />
                  </div>
                  <small>Review actions appear automatically when it passes.</small>
                </div>
              ) : null}
              {hasSubmission && scanFailed ? (
                <p className="portal-review-rejected" role="alert">
                  The file could not be cleared. Replace it to continue.
                </p>
              ) : null}
              {isAccepted ? (
                <p className="portal-review-complete" role="status">
                  <span aria-hidden="true">✓</span>
                  Accepted by DeepBridge
                </p>
              ) : isRejected ? (
                <p className="portal-review-rejected" role="status">
                  Rejected — replace the file or accept it after another review.
                </p>
              ) : null}
              <div className="portal-review-actions">
                {hasSubmission && isClean ? (
                  <button
                    className="portal-button portal-button-secondary"
                    type="button"
                    disabled={
                      openingSubmissionId === requirement.submissionId ||
                      reviewing
                    }
                    onClick={() => void openSubmission(requirement)}
                  >
                    {openingSubmissionId === requirement.submissionId
                      ? "Opening…"
                      : "Open file"}
                  </button>
                ) : null}
                <button
                  className="portal-button portal-button-secondary"
                  type="button"
                  disabled={reviewing}
                  onClick={() => setSelected(requirement)}
                >
                  {hasSubmission ? "Replace file" : "Upload file"}
                </button>
                {hasSubmission && isClean && !isAccepted && !isRejected ? (
                  <button
                    className="portal-button portal-button-danger"
                    type="button"
                    disabled={reviewing}
                    onClick={() => void review(requirement, "rejected")}
                  >
                    {reviewing ? "Saving…" : "Reject"}
                  </button>
                ) : null}
                {hasSubmission && isClean && !isAccepted ? (
                  <button
                    className="portal-button portal-button-primary"
                    type="button"
                    disabled={reviewing}
                    onClick={() => void review(requirement, "accepted")}
                  >
                    {reviewing ? "Saving…" : "Accept file"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {selected ? (
        <UploadDialog
          requirement={selected}
          contextLabel={`Administrator upload · ${selected.consultantName || "Consultant"}`}
          introduction="Upload only evidence supplied or approved by the consultant. It will remain quarantined and unavailable for review until the security scan passes. The audit history records that DeepBridge uploaded it on the consultant's behalf."
          onClose={() => setSelected(null)}
          onUpload={uploadForConsultant}
        />
      ) : null}
    </>
  );
}

function AdminAuditPage() {
  const { snapshot } = usePortal();
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Audit history"
        description="Security-relevant and contractual events, shown without document contents or unnecessary sensitive details."
      />
      <section className="portal-panel portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Object</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.audit.map((event) => (
              <tr key={event.id}>
                <td>{event.createdAt}</td>
                <td>
                  <strong>{event.action}</strong>
                </td>
                <td>{event.actor}</td>
                <td>{event.object}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function LoadingPortal() {
  return (
    <main className="portal-centred-state">
      <Brand />
      <span className="portal-loader" aria-hidden="true" />
      <h1>Opening your secure portal</h1>
      <p>Checking access and loading your records.</p>
    </main>
  );
}

function ErrorPortal({ message }: { message: string }) {
  return (
    <main className="portal-centred-state">
      <Brand />
      <p className="portal-kicker">Access unavailable</p>
      <h1>We could not open the portal</h1>
      <p>{message}</p>
      <Link className="portal-button portal-button-primary" to="/login">
        Return to sign in
      </Link>
    </main>
  );
}

export function PortalApp() {
  const [session, setSession] = useState<PortalBrowserSession | null>(null);
  const [demoRole, setDemoRole] = useState<PortalRole | null>(null);
  const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();

  const demo = demoRole !== null;

  async function refresh() {
    if (demoRole) {
      setSnapshot(
        structuredClone(
          demoRole === "admin" ? adminSnapshot : consultantSnapshot,
        ),
      );
      return;
    }
    if (!session) return;
    const next = await loadPortalSnapshot(session.user.id);
    setSnapshot(next);
  }

  useEffect(() => {
    let active = true;
    async function applySession(nextSession: PortalBrowserSession | null) {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setSnapshot(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const nextSnapshot = await loadPortalSnapshot(nextSession.user.id);
        if (active) {
          setSnapshot(nextSnapshot);
          setError("");
        }
      } catch (sessionError) {
        if (active) {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : "Portal records could not be loaded.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    getPortalSession()
      .then(applySession)
      .catch((sessionError) => {
        if (active) {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : "Authentication could not be verified.",
          );
          setLoading(false);
        }
      });
    const unsubscribe = onPortalSessionChange(applySession);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function enterDemoRole(role: PortalRole) {
    setDemoRole(role);
    setSnapshot(
      structuredClone(role === "admin" ? adminSnapshot : consultantSnapshot),
    );
    setLoading(false);
    setError("");
  }

  const contextValue: PortalContextValue | null = snapshot
    ? {
        snapshot,
        demo,
        refresh,
        setDemoRole: enterDemoRole,
        updateDocument: (documentId, updates) =>
          setSnapshot((current) =>
            current
              ? {
                  ...current,
                  documents: current.documents.map((document) =>
                    document.id === documentId
                      ? { ...document, ...updates }
                      : document,
                  ),
                }
              : current,
          ),
        updateCompliance: (requirementId, updates) =>
          setSnapshot((current) =>
            current
              ? {
                  ...current,
                  compliance: current.compliance.map((requirement) =>
                    requirement.id === requirementId
                      ? { ...requirement, ...updates }
                      : requirement,
                  ),
                }
              : current,
          ),
      }
    : null;

  async function handleSignOut() {
    if (demo) {
      setDemoRole(null);
      setSnapshot(null);
    } else {
      await signOutPortal();
      setSession(null);
      setSnapshot(null);
    }
  }

  const publicRoute = [
    "/login",
    "/auth/callback",
    "/privacy",
    "/terms",
  ].includes(location.pathname);

  if (loading && !publicRoute) return <LoadingPortal />;
  if (error && !publicRoute) return <ErrorPortal message={error} />;

  if (!snapshot || !contextValue) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onDemoSignIn={enterDemoRole} />}
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/privacy" element={<PortalLegalPage kind="privacy" />} />
        <Route path="/terms" element={<PortalLegalPage kind="terms" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const consultant = snapshot.profile.role === "consultant";
  return (
    <PortalContext.Provider value={contextValue}>
      <PortalShell onSignOut={handleSignOut}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={consultant ? "/dashboard" : "/admin"} replace />
            }
          />
          <Route
            path="/login"
            element={
              <Navigate to={consultant ? "/dashboard" : "/admin"} replace />
            }
          />
          <Route
            path="/dashboard"
            element={
              consultant ? <ConsultantDashboard /> : <Navigate to="/admin" />
            }
          />
          <Route
            path="/assignment"
            element={consultant ? <AssignmentPage /> : <Navigate to="/admin" />}
          />
          <Route
            path="/documents"
            element={consultant ? <DocumentsPage /> : <Navigate to="/admin" />}
          />
          <Route
            path="/documents/:documentId"
            element={
              consultant ? <DocumentDetailPage /> : <Navigate to="/admin" />
            }
          />
          <Route
            path="/compliance"
            element={consultant ? <CompliancePage /> : <Navigate to="/admin" />}
          />
          <Route
            path="/onboarding"
            element={consultant ? <OnboardingPage /> : <Navigate to="/admin" />}
          />
          <Route
            path="/support"
            element={consultant ? <SupportPage /> : <Navigate to="/admin" />}
          />
          <Route
            path="/profile"
            element={consultant ? <ProfilePage /> : <Navigate to="/admin" />}
          />
          <Route
            path="/admin"
            element={!consultant ? <AdminDashboard /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/admin/organisations"
            element={
              !consultant ? (
                <AdminOrganisationsPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/contracts"
            element={
              !consultant ? (
                <AdminContractsPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/consultants"
            element={
              !consultant ? (
                <AdminConsultantsPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/consultants/:consultantId"
            element={
              !consultant ? (
                <AdminConsultantsPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/assignments"
            element={
              !consultant ? (
                <AdminAssignmentsPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/documents"
            element={
              !consultant ? (
                <AdminDocumentsPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/signing"
            element={
              !consultant ? (
                <AdminSigningPage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/compliance"
            element={
              !consultant ? (
                <AdminCompliancePage />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/admin/audit"
            element={
              !consultant ? <AdminAuditPage /> : <Navigate to="/dashboard" />
            }
          />
          <Route
            path="*"
            element={
              <Navigate to={consultant ? "/dashboard" : "/admin"} replace />
            }
          />
        </Routes>
      </PortalShell>
    </PortalContext.Provider>
  );
}
