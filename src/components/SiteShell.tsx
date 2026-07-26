import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  company,
  legalNavigation,
  pageMeta,
  primaryNavigation,
  siteConfig,
} from "../config/site";

function Brand() {
  return (
    <Link className="brand" to="/" title="DeepBridge Advisory home">
      <span className="brand-mark" aria-hidden="true">
        <span>D</span>
        <span>B</span>
      </span>
      <span className="brand-name">
        <strong>DeepBridge</strong>
        <span>Advisory</span>
      </span>
    </Link>
  );
}

export function PageMeta({
  path,
  schema,
}: {
  path: string;
  schema?: Record<string, unknown>;
}) {
  const meta = pageMeta[path] ?? {
    title: "DeepBridge Advisory",
    description:
      "Specialist consultants for complex transformation programmes.",
  };

  useEffect(() => {
    document.title = meta.title;

    const setMeta = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) element.setAttribute(attribute, value);
    };

    setMeta('meta[name="description"]', "content", meta.description);
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);

    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `${siteConfig.siteUrl}${path === "/" ? "" : path}`;

    const scriptId = "deepbridge-structured-data";
    document.getElementById(scriptId)?.remove();
    if (schema) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.text = JSON.stringify(schema);
      document.head.append(script);
    }

    return () => document.getElementById(scriptId)?.remove();
  }, [meta.description, meta.title, path, schema]);

  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <NavLink
              key={item.href}
              className={({ isActive }) => (isActive ? "active" : undefined)}
              to={item.href}
              end={item.href === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link className="header-cta" to="/contact?type=client">
          Discuss a requirement
        </Link>
        <button
          ref={toggleRef}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setOpen((current) => !current)}
        >
          <span />
          <span />
        </button>
      </div>
      <nav
        id={menuId}
        className={`mobile-nav ${open ? "is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!open}
      >
        <div className="shell">
          {primaryNavigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              tabIndex={open ? 0 : -1}
              end={item.href === "/"}
              onClick={() => setOpen(false)}
            >
              {item.label}
              <span aria-hidden="true">↗</span>
            </NavLink>
          ))}
          <Link
            className="button button-primary"
            to="/contact?type=client"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
          >
            Discuss a requirement
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-lead">
        <div>
          <p className="eyebrow">The next delivery question</p>
          <h2>What expertise does the programme need now?</h2>
        </div>
        <Link className="button button-light" to="/contact?type=client">
          Start a conversation <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Brand />
          <p>
            Specialist consultants for complex transformation programmes across
            the UK and Europe.
          </p>
        </div>
        <div>
          <h3>Navigate</h3>
          {primaryNavigation.slice(1).map((item) => (
            <Link key={item.href} to={item.href}>
              {item.label}
            </Link>
          ))}
          <Link to="/opportunities">Opportunities</Link>
        </div>
        <div>
          <h3>Information</h3>
          {legalNavigation.map((item) => (
            <Link key={item.href} to={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <h3>Contact</h3>
          <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>
          <p>London · United Kingdom</p>
          <a href={siteConfig.linkedInUrl} rel="noreferrer" target="_blank">
            LinkedIn <span className="visually-hidden">(opens in a new tab)</span>
          </a>
        </div>
      </div>
      <div className="shell footer-legal">
        <p>
          © {new Date().getFullYear()} {company.tradingName}. {company.legalName},
          registered in {company.registeredIn}. Company no.{" "}
          {company.companyNumber}.
        </p>
        <p>
          Information on this website is general in nature and does not
          constitute legal, tax, immigration or employment-status advice.
        </p>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
