import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { expertise, processSteps } from "../content/siteContent";

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
  return (
    <Link className={`button button-${variant}`} to={to}>
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
  return (
    <div className={`expertise-grid ${detailed ? "is-detailed" : ""}`}>
      {expertise.map((item) => (
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
        </article>
      ))}
    </div>
  );
}

export function ProcessSection({ compact = false }: { compact?: boolean }) {
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
  return (
    <section className="split-cta">
      <div className="shell split-cta-grid">
        <article>
          <p className="eyebrow">For organisations</p>
          <h2>Building or strengthening a transformation team?</h2>
          <p>
            Tell us what the programme needs, where the work will take place and
            when support is required.
          </p>
          <ButtonLink to="/contact?type=client">Discuss your requirement</ButtonLink>
        </article>
        <article>
          <p className="eyebrow">For independent specialists</p>
          <h2>Looking for your next meaningful programme?</h2>
          <p>
            Join our network for relevant project opportunities across the UK
            and Europe.
          </p>
          <ButtonLink to="/contact?type=consultant" variant="secondary">
            Join our network
          </ButtonLink>
        </article>
      </div>
    </section>
  );
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
  return (
    <>
      <PageHero eyebrow="Website information" title={title} intro={intro} />
      <section className="section legal-section">
        <div className="shell legal-layout">
          <aside className="legal-sidebar" aria-label="Legal information">
            <p>DeepBridge Advisory</p>
            <span>Clear information, kept current.</span>
          </aside>
          <div className="prose">{children}</div>
        </div>
      </section>
    </>
  );
}
