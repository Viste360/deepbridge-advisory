import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildPageSchema } from "../config/structuredData";
import { useLocale, basePath, localizePath, locales, localeNames, languageTags, socialLocales } from "../i18n";
import { focusFragment } from "./navigation";
import { Link, NavLink, useLocation, useNavigationType } from "react-router-dom";
import {
  company,
  legalNavigation,
  pageMeta,
  primaryNavigation,
  siteConfig,
} from "../config/site";

function Brand() {
  const { path, t } = useLocale();
  return (
    <Link className="brand" to={path("/")} title={t("DeepBridge Advisory home", "DeepBridge Advisory Startseite", "Inicio de DeepBridge Advisory")}>
      <img
        className="brand-logo"
        src="/brand/deepbridge-logo-light.png"
        alt="DeepBridge Advisory"
      />
    </Link>
  );
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
  const { path } = useLocale();
  return <Link className={className} to={path("/contact?type=client#contact-form")} tabIndex={tabIndex} onClick={onClick}>{children}</Link>;
}

export function PageMeta({
  path: requestedPath,
  schema,
}: {
  path: string;
  schema?: Record<string, unknown>;
}) {
  const { locale, path: localePath, t } = useLocale();
  const path = localePath(requestedPath);
  const meta = pageMeta[path] ?? {
    title: "DeepBridge Advisory",
    description:
      "Transformation advisory and specialist delivery for complex programmes.",
  };

  useEffect(() => {
    const pageUrl = `${siteConfig.siteUrl}${path === "/" ? "/" : path}`;
    const socialImageUrl = `${siteConfig.siteUrl}${siteConfig.socialImagePath}`;
    document.title = meta.title;
    document.documentElement.lang = languageTags[locale];

    const setMeta = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) element.setAttribute(attribute, value);
    };

    setMeta('meta[name="description"]', "content", meta.description);
    setMeta(
      'meta[name="robots"]',
      "content",
      basePath(path) === "/404"
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large",
    );
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);
    setMeta('meta[property="og:url"]', "content", pageUrl);
    setMeta('meta[property="og:image"]', "content", socialImageUrl);
    setMeta('meta[property="og:type"]', "content", meta.type ?? "website");
    setMeta('meta[property="og:locale"]', "content", socialLocales[locale]);
    setMeta(
      'meta[property="og:image:alt"]',
      "content",
      t("DeepBridge Advisory — industrial transformation and project delivery", "DeepBridge Advisory — industrielle Transformation und Projektumsetzung", "DeepBridge Advisory — transformación industrial y ejecución de proyectos"),
    );
    setMeta('meta[name="twitter:title"]', "content", meta.title);
    setMeta('meta[name="twitter:description"]', "content", meta.description);
    setMeta('meta[name="twitter:image"]', "content", socialImageUrl);
    setMeta(
      'meta[name="twitter:image:alt"]',
      "content",
      t("DeepBridge Advisory — industrial transformation and project delivery", "DeepBridge Advisory — industrielle Transformation und Projektumsetzung", "DeepBridge Advisory — transformación industrial y ejecución de proyectos"),
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

    document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((node) => node.remove());
    for (const otherLocale of locales.filter((candidate) => candidate !== locale)) {
      const alternate = document.createElement("meta");
      alternate.setAttribute("property", "og:locale:alternate");
      alternate.content = socialLocales[otherLocale];
      document.head.append(alternate);
    }
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
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
    if (basePath(path) !== "/404") {
      for (const [language, targetLocale] of [["en", "en"], ["de", "de"], ["es", "es"], ["x-default", "en"]] as const) {
        const alternate = document.createElement("link");
        alternate.rel = "alternate";
        alternate.hreflang = language;
        alternate.href = `${siteConfig.siteUrl}${localizePath(path, targetLocale)}`;
        document.head.append(alternate);
      }
    }

    const scriptId = "deepbridge-structured-data";
    document.getElementById(scriptId)?.remove();
    const resolvedSchema = schema ?? buildPageSchema(basePath(path), locale);
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(resolvedSchema);
    document.head.append(script);

    return () => document.getElementById(scriptId)?.remove();
  }, [
    locale,
    t,
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
  const { path, t } = useLocale();
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1161px)");
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
        <nav className="desktop-nav" aria-label={t("Primary navigation", "Hauptnavigation", "Navegación principal")}>
          {primaryNavigation.map((item) => (
            <NavLink
              key={item.href}
              className={({ isActive }) => (isActive ? "active" : undefined)}
              to={path(item.href)}
            >
              {t(item.label, item.de, item.es)}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitch />
          <ContactFormLink className="header-cta">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")} <span aria-hidden="true">↗</span></ContactFormLink>
        </div>
        <button
          ref={toggleRef}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t("Close navigation menu", "Menü schließen", "Cerrar menú de navegación") : t("Open navigation menu", "Menü öffnen", "Abrir menú de navegación")}
          onClick={() => setOpen((current) => !current)}
        >
          <span />
          <span />
        </button>
      </div>
      <div className="professional-bar"><div className="shell"><span>{t("Industrial expertise. European perspective.", "Industriekompetenz. Europäische Perspektive.", "Experiencia industrial. Perspectiva europea.")}</span><Link to={path("/for-consultants")}>{t("For Professionals", "Für Experten", "Para profesionales")} <span aria-hidden="true">↗</span></Link></div></div>
      <nav
        ref={menuRef}
        id={menuId}
        className={`mobile-nav ${open ? "is-open" : ""}`}
        aria-label={t("Mobile navigation", "Mobile Navigation", "Navegación móvil")}
        aria-hidden={!open}
      >
        <div className="shell">
          {primaryNavigation.map((item) => (
            <NavLink
              key={item.href}
              to={path(item.href)}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
            >
              {t(item.label, item.de, item.es)}
              <span className="direction-arrow" aria-hidden="true">
                →
              </span>
            </NavLink>
          ))}
          <Link to={path("/for-consultants")} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>{t("For Professionals", "Für Experten", "Para profesionales")} <span aria-hidden="true">→</span></Link>
          <LanguageSwitch onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} />
          <ContactFormLink
            className="mobile-nav-cta"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
          >
            <span>{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</span>
            <span className="direction-arrow" aria-hidden="true">
              →
            </span>
          </ContactFormLink>
        </div>
      </nav>
    </header>
  );
}

function LanguageSwitch({ onClick, tabIndex }: { onClick?: () => void; tabIndex?: number }) {
  const { locale, t } = useLocale();
  const location = useLocation();
  const destination = location.pathname + location.search + location.hash;
  return <div className="language-switch" role="group" aria-label={t("Language", "Sprache", "Idioma")}>
    {locales.map((language) => <Link key={language} to={localizePath(destination, language)} lang={language} hrefLang={language} aria-current={locale === language ? "true" : undefined} aria-label={localeNames[language]} onClick={onClick} tabIndex={tabIndex}>{language.toUpperCase()}</Link>)}
  </div>;
}

function Footer() {
  const { path, t } = useLocale();
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div className="footer-brand"><Brand /><p>{t("Industrial expertise. Accountable delivery.", "Erfahrene Experten. Klare Verantwortung.", "Experiencia industrial. Compromiso con la ejecución.")}</p><p className="footer-cities">{t("European focus: London · Munich · Madrid", "Europäischer Fokus: London · München · Madrid", "Enfoque europeo: Londres · Múnich · Madrid")}</p></div>
      <div><h3>{t("Explore", "Entdecken", "Explorar")}</h3>{primaryNavigation.map((item) => <Link key={item.href} to={path(item.href)}>{t(item.label, item.de, item.es)}</Link>)}</div>
      <div><h3>{t("For professionals", "Für Experten", "Para profesionales")}</h3><Link to={path("/for-consultants")}>{t("Professional network", "Expertennetzwerk", "Red de profesionales")}</Link><Link to={path("/opportunities")}>{t("Opportunities", "Projektmöglichkeiten", "Oportunidades")}</Link><a href="https://portal.deepbridgeadvisory.com/login">{t("Consultant portal", "Expertenportal", "Portal de profesionales")} ↗</a><a href={siteConfig.linkedInUrl} rel="noreferrer" target="_blank">LinkedIn <span className="visually-hidden">{t("(opens in a new tab)", "(öffnet einen neuen Tab)", "(se abre en una pestaña nueva)")}</span> ↗</a></div>
      <div><h3>{t("Get in touch", "Kontakt aufnehmen", "Contacte con nosotros")}</h3><a className="footer-email" href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a><p>{t("Tell us what your project needs next.", "Sprechen wir über die nächsten Schritte für Ihr Projekt.", "Cuéntenos qué necesita su proyecto.")}</p><ContactFormLink className="footer-contact-link">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")} →</ContactFormLink></div>
    </div>
    <div className="shell footer-legal">
      <p>© {new Date().getFullYear()} {company.legalName}.<br />{t("Registered in England and Wales. Company no.", "Eingetragen in England und Wales. Registernummer", "Registrada en Inglaterra y Gales. Número de sociedad")} {company.companyNumber}.<br />{t("Registered office:", "Eingetragener Sitz:", "Domicilio social:")} {company.registeredOffice}.</p>
      <nav aria-label={t("Legal information", "Rechtliche Informationen", "Información legal")}>{legalNavigation.map(item => <Link key={item.href} to={path(item.href)}>{t(item.label, item.de, item.es)}</Link>)}</nav>
    </div>
  </footer>;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useLocale();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map<string, number>());

  useEffect(() => {
    let applied = false;
    const positions = scrollPositions.current;
    const frame = window.requestAnimationFrame(() => {
      applied = true;
      const initial = firstRender.current;
      firstRender.current = false;
      if (!initial && navigationType === "REPLACE" && location.state?.preserveScroll) {
        const focusId = location.state?.focusId;
        if (typeof focusId === "string") document.getElementById(focusId)?.focus({ preventScroll: true });
        return;
      }
      const previousPosition = positions.get(location.key);
      if (!initial && navigationType === "POP" && previousPosition !== undefined) {
        window.scrollTo({ top: previousPosition, behavior: "instant" });
      } else if (focusFragment(location.hash)) {
        return;
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      if (!initial) mainRef.current?.focus({ preventScroll: true });
    });

    return () => {
      if (applied) positions.set(location.key, window.scrollY);
      window.cancelAnimationFrame(frame);
    };
  }, [location.key, location.pathname, location.hash, location.state, navigationType]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("Skip to main content", "Zum Hauptinhalt springen", "Saltar al contenido principal")}
      </a>
      <Header key={location.pathname} />
      <main ref={mainRef} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
