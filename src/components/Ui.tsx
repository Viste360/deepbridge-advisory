import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { getExpertise, getProcessSteps } from "../content/siteContent";
import { useLocale } from "../i18n";

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  text?: string;
  align?: "left" | "centre";
}) {
  return (
    <div className={`section-heading ${align === "centre" ? "is-centred" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p className="section-copy">{text}</p>}
    </div>
  );
}

export function ButtonLink({
  to,
  children,
  variant = "primary",
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
}) {
  const { path } = useLocale();
  return (
    <Link className={`button button-${variant}`} to={path(to)}>
      {children}
      <span className="direction-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  aside,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  aside?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="shell page-hero-grid">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="page-hero-aside">
          <p>{intro}</p>
          {aside}
        </div>
      </div>
    </section>
  );
}

export function ExpertiseGrid({ detailed = false }: { detailed?: boolean }) {
  const { locale, path, t } = useLocale();
  const expertise = getExpertise(locale);
  return (
    <div className={`expertise-grid ${detailed ? "is-detailed" : ""}`}>
      {expertise.map((item, index) => (
        <article className="expertise-item" key={item.code}>
          <div className="expertise-topline">
            <span>{item.code}</span>
            <span className="direction-arrow" aria-hidden="true">
              →
            </span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.summary}</p>
          {detailed && (
            <ul className="plain-list">
              {item.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
          <Link className="expertise-link" to={path(`/expertise#${["sap", "operations", "leadership"][index]}`)}>{t("Explore this expertise", "Mehr erfahren", "Más información")} <span aria-hidden="true">↗</span></Link>
        </article>
      ))}
    </div>
  );
}

export function ProcessSection({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocale();
  const processSteps = getProcessSteps(locale);
  return (
    <div className={`process-grid ${compact ? "is-compact" : ""}`}>
      {processSteps.map((step) => (
        <article key={step.number}>
          <span className="step-number">{step.number}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </article>
      ))}
    </div>
  );
}

export function SplitCta() {
  const { t } = useLocale();
  return <section className="split-cta"><div className="shell split-cta-grid">
    <article><p className="eyebrow">{t("For organisations", "Für Unternehmen", "Para empresas")}</p><h2>{t("What does your project need next?", "Was braucht Ihr Projekt als Nächstes?", "¿Qué necesita su proyecto para avanzar?")}</h2><p>{t("Tell us about the assignment, the operating challenge and the expertise you need. We will help clarify the next step.", "Beschreiben Sie uns die Aufgabe, die operative Herausforderung und die benötigte Expertise. Gemeinsam klären wir den nächsten Schritt.", "Cuéntenos el objetivo, el reto operativo y la experiencia que necesita. Le ayudaremos a definir el siguiente paso.")}</p><ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink></article>
    <article><p className="eyebrow">{t("For professionals", "Für Experten", "Para profesionales")}</p><h2>{t("Bring your expertise to the next challenge.", "Bringen Sie Ihre Expertise in die nächste Aufgabe ein.", "Aporte su experiencia al próximo reto.")}</h2><p>{t("Connect with us about industrial assignments across SAP, operations, supply chain, data, finance and programme leadership.", "Sprechen Sie mit uns über Industrieprojekte in SAP, Operations, Supply Chain, Daten, Finance und Projektführung.", "Hablemos de proyectos industriales en SAP, operaciones, cadena de suministro, datos, finanzas y dirección de programas.")}</p><ButtonLink to="/contact?type=consultant#contact-form" variant="secondary">{t("Join our network", "Teil unseres Netzwerks werden", "Únase a nuestra red")}</ButtonLink></article>
  </div></section>;
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <aside className="notice">
      <span aria-hidden="true">i</span>
      <p>{children}</p>
    </aside>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <>
      <PageHero eyebrow={t("Website information", "Informationen zur Website", "Información del sitio web")} title={title} intro={intro} />
      <section className="section legal-section">
        <div className="shell legal-layout">
          <aside className="legal-sidebar" aria-label={t("Legal information", "Rechtliche Informationen", "Información legal")}>
            <p>DeepBridge Advisory</p>
            <span>{t("Clear information, kept current.", "Klare und aktuelle Informationen.", "Información clara y actualizada.")}</span>
          </aside>
          <div className="prose">{children}</div>
        </div>
      </section>
    </>
  );
}
