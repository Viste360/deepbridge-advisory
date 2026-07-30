import {
  CSSProperties,
  FormEvent,
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
  createPortalCountersignature,
  createInvitation,
  getComplianceSubmissionAccess,
  getConsultantSignedUpload,
  getDocumentAccess,
  getPortalSession,
  listAdminConsultants,
  listAdminDocumentCatalogue,
  listAdminSigningItems,
  loadPortalSnapshot,
  onPortalSessionChange,
  portalConfigured,
  portalDemoEnabled,
  prepareCountersignSource,
  recordGoogleSigningStep,
  removeAdminDocumentVersion,
  reviewComplianceSubmission,
  sendMagicLink,
  signInWithGoogle,
  signOutPortal,
  uploadComplianceFile,
  uploadComplianceFileAsAdmin,
  uploadCompletedSigningPack,
  uploadAdminDocumentVersion,
  uploadManualSignedDocument,
  type AdminDocumentCatalogueItem,
  type AdminConsultant,
  type AdminSigningItem,
  type PortalBrowserSession,
  type UploadProgress,
} from "./portalApi";

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
        <span>Consultant portal</span>
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
          <h1>Your assignment, documents and onboarding in one place.</h1>
          <p>
            Review your DeepBridge engagement, sign agreements through Google
            Workspace and upload compliance documents through a protected
            workspace.
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
            session.role === "admin" ? "/admin" : "/dashboard",
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
            : "Using the DeepBridge Consultant Portal"}
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
          DustDeep Ltd · Company number 16775578 · 124–128 City Road, London,
          EC1V 2NX, United Kingdom
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
  ["Consultants", "/admin/consultants"],
  ["Assignments", "/admin/assignments"],
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
    document.title = `DeepBridge Consultant Portal`;
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
          <span className="portal-mobile-title">Consultant portal</span>
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
            const result = await getDocumentAccess(selectedDocument.id, "final");
            if (result.url)
              window.open(result.url, "_blank", "noopener,noreferrer");
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
        const result = await getDocumentAccess(selectedDocument.id, "source");
        if (result.url)
          window.open(result.url, "_blank", "noopener,noreferrer");
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
      const result = await getDocumentAccess(selectedDocument.id, kind);
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
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
        title="Consultant onboarding"
        description="Manage invitations, documents, compliance review and the audit history."
        action={
          <Link
            className="portal-button portal-button-primary"
            to="/admin/consultants"
          >
            Invite consultant
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

function AdminConsultantsPage() {
  const { snapshot, demo } = usePortal();
  const [showInvite, setShowInvite] = useState(false);
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
    void listAdminConsultants()
      .then((items) => {
        if (active) setConsultants(items);
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
                  {consultant.lastLoginAt ? (
                    <span>Last login {consultant.lastLoginAt}</span>
                  ) : (
                    <span>Awaiting first sign-in</span>
                  )}
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
    </>
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
  const { snapshot } = usePortal();
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Assignments"
        description="Assignment records and consultant access."
      />
      <section className="portal-panel">
        <div className="portal-admin-record">
          <div>
            <StatusPill status="active" />
            <h2>{snapshot.assignment.title}</h2>
            <p>{snapshot.assignment.programme}</p>
          </div>
          <dl className="portal-compact-details">
            <div>
              <dt>Consultant</dt>
              <dd>Roland Schneider</dd>
            </div>
            <div>
              <dt>End customer</dt>
              <dd>{snapshot.assignment.endCustomer}</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd>{snapshot.assignment.startDate}</dd>
            </div>
          </dl>
          <button className="portal-button portal-button-secondary" type="button">
            Edit assignment
          </button>
        </div>
      </section>
    </>
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

function AdminSigningPage() {
  const { snapshot, demo } = usePortal();
  const [items, setItems] = useState<AdminSigningItem[]>([]);
  const [selected, setSelected] = useState<AdminSigningItem | null>(null);
  const [countersignSelected, setCountersignSelected] =
    useState<AdminSigningItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function refreshItems() {
    const next = demo
      ? createDemoSigningItems(snapshot.documents)
      : await listAdminSigningItems();
    setItems(next);
  }

  useEffect(() => {
    let active = true;
    const request = demo
      ? Promise.resolve(createDemoSigningItems(snapshot.documents))
      : listAdminSigningItems();
    request
      .then((next) => {
        if (active) setItems(next);
      })
      .catch((loadError) => {
        if (active)
          setMessage(
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

  const signingScanPending = items.some(
    (item) =>
      item.providerStatus === "security_review" ||
      item.providerStatus === "countersign_source_security_review" ||
      item.providerStatus === "consultant_upload_security_review" ||
      item.finalScanStatus === "pending" ||
      item.certificateScanStatus === "pending",
  );

  useEffect(() => {
    if (demo || !signingScanPending) return;
    const timer = window.setInterval(() => {
      void listAdminSigningItems()
        .then(setItems)
        .catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [demo, signingScanPending]);

  async function recordStep(
    item: AdminSigningItem,
    action: "request_sent" | "consultant_signed",
  ) {
    setBusyId(item.id);
    setMessage("");
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
      setMessage(
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
    try {
      if (demo) {
        setMessage("Consultant-signed PDF download requested securely.");
      } else {
        const result = await getConsultantSignedUpload(item.id);
        if (result.url)
          window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (downloadError) {
      setMessage(
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
      if (input.consultantSignedPdf) {
        await prepareCountersignSource({
          assignedDocumentId: input.item.id,
          consultantSignedPdf: input.consultantSignedPdf,
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

      await createPortalCountersignature({
        assignedDocumentId: input.item.id,
        signerName: input.signerName,
        signerTitle: input.signerTitle,
        signatureImageDataUrl: input.signatureImageDataUrl,
        confirmed: true,
      });
      await refreshItems();
    }
    setMessage(
      "DeepBridge signed the agreement. The final PDF and its audit certificate are undergoing the final security scan and will become downloadable automatically.",
    );
  }

  async function downloadCompleted(
    item: AdminSigningItem,
    kind: "final" | "certificate",
  ) {
    setBusyId(item.id);
    setMessage("");
    try {
      if (demo) {
        setMessage(
          kind === "final"
            ? "Final signed PDF download requested."
            : "Audit certificate download requested.",
        );
      } else {
        const result = await getDocumentAccess(item.id, kind);
        if (result.url)
          window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (downloadError) {
      setMessage(
        downloadError instanceof Error
          ? downloadError.message
          : "The completed document is not available.",
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
              After the final scan, download the countersigned PDF and its audit
              certificate whenever needed.
            </small>
          </p>
        </article>
      </section>
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
      <section className="portal-panel portal-table-wrap">
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
              const scanning =
                item.providerStatus === "security_review" ||
                item.providerStatus ===
                  "consultant_upload_security_review" ||
                item.finalScanStatus === "pending" ||
                item.certificateScanStatus === "pending";
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
                    {scanning ? (
                      <span className="portal-table-complete">
                        Security scan pending
                      </span>
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
  const usesStoredConsultantPdf = item.provider === "manual_upload";

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

  return (
    <div className="portal-modal-backdrop" role="presentation">
      <div
        className="portal-modal portal-signature-modal"
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
          Review the consultant-signed agreement, then sign it electronically
          for DeepBridge. The portal will append a tamper-evident
          countersignature page and create a separate audit certificate.
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
                    consultant. It will be scanned before DeepBridge signs it.
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
                    onChange={(event) =>
                      setConsultantSignedPdf(event.target.files?.[0] ?? null)
                    }
                  />
                </>
              )}
            </div>
          </div>

          <div className="portal-signing-step">
            <span>2</span>
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
                <small>Electronic signature preview</small>
                <span>{signerName || "Your name"}</span>
                <p>{signerTitle || "Signing authority"}</p>
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
              {busy ? "Signing securely…" : "Sign for DeepBridge"}
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
      const result = await getComplianceSubmissionAccess(
        requirement.submissionId,
      );
      if (!result.url)
        throw new Error("The secure viewing link could not be created.");
      window.open(result.url, "_blank", "noopener,noreferrer");
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
        {snapshot.compliance.map((requirement) => (
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
                    : requirement.scanStatus
                      ? "Not cleared"
                      : "Not applicable"}
                </dd>
              </div>
            </dl>
            <div className="portal-review-actions">
              <button
                className="portal-button portal-button-secondary"
                type="button"
                disabled={
                  !requirement.submissionId ||
                  requirement.scanStatus !== "clean" ||
                  openingSubmissionId === requirement.submissionId
                }
                onClick={() => openSubmission(requirement)}
              >
                {openingSubmissionId === requirement.submissionId
                  ? "Opening…"
                  : "View securely"}
              </button>
              <button
                className="portal-button portal-button-secondary"
                type="button"
                onClick={() => setSelected(requirement)}
              >
                {requirement.submissionId
                  ? "Upload replacement"
                  : "Upload for consultant"}
              </button>
              <button
                className="portal-button portal-button-danger"
                type="button"
                disabled={
                  !requirement.submissionId ||
                  requirement.scanStatus !== "clean"
                }
                onClick={() => review(requirement, "rejected")}
              >
                Reject
              </button>
              <button
                className="portal-button portal-button-primary"
                type="button"
                disabled={
                  !requirement.submissionId ||
                  requirement.scanStatus !== "clean"
                }
                onClick={() => review(requirement, "accepted")}
              >
                Accept
              </button>
            </div>
          </article>
        ))}
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
