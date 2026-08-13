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
      <img
        className="brand-logo"
        src="/brand/deepbridge-logo-light.png"
        alt="DeepBridge Advisory"
      />
    </Link>
  );
}

function focusContactForm(behaviour: ScrollBehavior = "auto") {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.scrollIntoView({ behavior: behaviour, block: "start" });
  form.focus({ preventScroll: true });
}

function ContactFormLink({
  className,
  children,
  tabIndex,
  onClick,
}: {
  className: string;
  children: ReactNode;
  tabIndex?: number;
  onClick?: () => void;
}) {
  const location = useLocation();

  return (
    <Link
      className={className}
      to="/contact?type=client#contact-form"
      tabIndex={tabIndex}
      onClick={() => {
        onClick?.();
        if (location.pathname === "/contact") {
          const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          window.requestAnimationFrame(() =>
            focusContactForm(reduceMotion ? "auto" : "smooth"),
          );
        }
      }}
    >
      {children}
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
    const pageUrl = `${siteConfig.siteUrl}${path === "/" ? "/" : path}`;
    const socialImageUrl = `${siteConfig.siteUrl}${siteConfig.socialImagePath}`;
    document.title = meta.title;

    const setMeta = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) element.setAttribute(attribute, value);
    };

    setMeta('meta[name="description"]', "content", meta.description);
    setMeta(
      'meta[name="robots"]',
      "content",
      path === "/404"
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large",
    );
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);
    setMeta('meta[property="og:url"]', "content", pageUrl);
    setMeta('meta[property="og:image"]', "content", socialImageUrl);
    setMeta('meta[property="og:type"]', "content", meta.type ?? "website");
    setMeta(
      'meta[property="og:image:alt"]',
      "content",
      "DeepBridge Advisory — specialist transformation consultants",
    );
    setMeta('meta[name="twitter:title"]', "content", meta.title);
    setMeta('meta[name="twitter:description"]', "content", meta.description);
    setMeta('meta[name="twitter:image"]', "content", socialImageUrl);
    setMeta(
      'meta[name="twitter:image:alt"]',
      "content",
      "DeepBridge Advisory — specialist transformation consultants",
    );

    const setOptionalMeta = (property: string, value?: string) => {
      let element = document.querySelector<HTMLMetaElement>(
        `meta[property="${property}"]`,
      );
      if (!value) {
        element?.remove();
        return;
      }
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("property", property);
        document.head.append(element);
      }
      element.content = value;
    };

    setOptionalMeta("article:published_time", meta.published);
    setOptionalMeta("article:modified_time", meta.modified);

    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = pageUrl;

    const scriptId = "deepbridge-structured-data";
    document.getElementById(scriptId)?.remove();
    const resolvedSchema = schema ?? {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: meta.title,
      description: meta.description,
      inLanguage: "en-GB",
      isPartOf: { "@id": `${siteConfig.siteUrl}/#website` },
      about: { "@id": `${siteConfig.siteUrl}/#organisation` },
    };
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(resolvedSchema);
    document.head.append(script);

    return () => document.getElementById(scriptId)?.remove();
  }, [
    meta.description,
    meta.modified,
    meta.published,
    meta.title,
    meta.type,
    path,
    schema,
  ]);

  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 821px)");
    const closeAtDesktopWidth = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    const closeOnHistoryNavigation = () => setOpen(false);

    desktopQuery.addEventListener("change", closeAtDesktopWidth);
    window.addEventListener("popstate", closeOnHistoryNavigation);
    return () => {
      desktopQuery.removeEventListener("change", closeAtDesktopWidth);
      window.removeEventListener("popstate", closeOnHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      document.documentElement.classList.remove("menu-open");
      return;
    }

    const scrollPosition = window.scrollY;
    const previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.documentElement.classList.add("menu-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = "100%";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        const menuLinks = Array.from(
          menuRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [],
        );
        const focusable = [
          ...(toggleRef.current ? [toggleRef.current] : []),
          ...menuLinks,
        ];
        const first = focusable[0];
        const last = focusable.at(-1);

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.classList.remove("menu-open");
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.width = previousBodyStyles.width;
      const previousScrollBehavior =
        document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo({ top: scrollPosition, behavior: "auto" });
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
      document.removeEventListener("keydown", onKeyDown);
    };
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
        <ContactFormLink className="header-cta">
          Discuss a requirement
        </ContactFormLink>
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
        ref={menuRef}
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
              <span className="direction-arrow" aria-hidden="true">
                →
              </span>
            </NavLink>
          ))}
          <ContactFormLink
            className="mobile-nav-cta"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
          >
            <span>Discuss a requirement</span>
            <span className="direction-arrow" aria-hidden="true">
              →
            </span>
          </ContactFormLink>
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
        <ContactFormLink className="button button-light">
          Start a conversation
          <span className="direction-arrow" aria-hidden="true">
            →
          </span>
        </ContactFormLink>
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
          <a href="/llms.txt">AI site overview</a>
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
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const targetId = location.hash.slice(1);
    const focusFrame = window.requestAnimationFrame(() => {
      if (targetId === "contact-form") {
        focusContactForm();
        firstRender.current = false;
        return;
      }

      window.scrollTo({ top: 0, behavior: "auto" });

      if (firstRender.current) {
        firstRender.current = false;
        return;
      }

      mainRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [location.hash, location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <main ref={mainRef} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
