import { Link } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import {
  ButtonLink,
  ExpertiseGrid,
  ProcessSection,
  SectionHeading,
  SplitCta,
} from "../components/Ui";
import { company, siteConfig } from "../config/site";
import {
  engagementModels,
  industries,
} from "../content/siteContent";

const organisationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "ProfessionalService"],
      "@id": `${siteConfig.siteUrl}/#organisation`,
      name: company.tradingName,
      legalName: company.legalName,
      url: siteConfig.siteUrl,
      email: company.contactEmail,
      sameAs: [siteConfig.linkedInUrl],
      areaServed: ["United Kingdom", "Europe"],
      knowsAbout: [
        "SAP S/4HANA transformation",
        "Enterprise resource planning",
        "Supply chain transformation",
        "Data and business intelligence",
        "Programme leadership",
      ],
      description:
        "A specialist advisory and delivery partner supporting transformation programmes with experienced independent consultants.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Kemp House, 152-160 City Road",
        addressLocality: "London",
        postalCode: "EC1V 2NX",
        addressCountry: "GB",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.siteUrl}/#website`,
      url: siteConfig.siteUrl,
      name: company.tradingName,
      publisher: { "@id": `${siteConfig.siteUrl}/#organisation` },
    },
  ],
};

function HeroField() {
  return (
    <div className="hero-field" aria-hidden="true">
      <div className="field-grid" />
      <div className="field-ring field-ring-one" />
      <div className="field-ring field-ring-two" />
      <div className="field-axis field-axis-x" />
      <div className="field-axis field-axis-y" />
      <span className="field-label field-label-one">Business</span>
      <span className="field-label field-label-two">Technology</span>
      <span className="field-label field-label-three">Delivery</span>
      <p>
        <strong>One requirement.</strong>
        <span>A focused route to the right expertise.</span>
      </p>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <PageMeta path="/" schema={organisationSchema} />
      <section className="home-hero">
        <div className="shell home-hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">European transformation expertise</p>
            <h1>
              Specialist consultants for complex{" "}
              <em>transformation programmes.</em>
            </h1>
            <p className="hero-intro">
              DeepBridge helps organisations build experienced project teams
              across SAP, supply chain, data and business transformation.
            </p>
            <div className="hero-actions">
              <ButtonLink to="/contact?type=client">
                Discuss a requirement
              </ButtonLink>
              <ButtonLink to="/contact?type=consultant" variant="secondary">
                Join our network
              </ButtonLink>
            </div>
            <p className="hero-trust">
              <span aria-hidden="true" />
              Supporting international programmes across the UK and Europe.
            </p>
          </div>
          <HeroField />
        </div>
        <div className="shell hero-proof" aria-label="How DeepBridge works">
          <p>
            <span>01</span> Selective specialist network
          </p>
          <p>
            <span>02</span> Cross-border programme coverage
          </p>
          <p>
            <span>03</span> Support through delivery
          </p>
        </div>
      </section>

      <section className="section problem-section">
        <div className="shell editorial-grid">
          <p className="eyebrow">The delivery challenge</p>
          <div>
            <h2>The right expertise, without the unnecessary noise.</h2>
            <div className="two-column-copy">
              <p>
                Transformation programmes rarely fail because organisations
                lack ambition. They stall when the right expertise is
                unavailable, responsibilities are unclear or teams cannot scale
                at the pace the programme demands.
              </p>
              <p>
                DeepBridge takes a focused approach: understand the requirement,
                identify credible specialists and remain involved through
                contracting, onboarding and delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section expertise-section">
        <div className="shell">
          <div className="section-heading-row">
            <SectionHeading
              eyebrow="Core expertise"
              title="Where we add value"
              text="Specialist capability for the points where business operations, technology and programme delivery meet."
            />
            <ButtonLink to="/expertise" variant="text">
              Explore our expertise
            </ButtonLink>
          </div>
          <ExpertiseGrid />
        </div>
      </section>

      <section className="section process-section">
        <div className="shell">
          <SectionHeading
            eyebrow="How we work"
            title="A focused route from requirement to delivery"
            text="Clear decisions at each stage, with DeepBridge involved beyond the initial introduction."
          />
          <ProcessSection />
        </div>
      </section>

      <section className="section engagement-section">
        <div className="shell engagement-grid">
          <div className="engagement-intro">
            <p className="eyebrow">Flexible engagement</p>
            <h2>Support that adapts as the programme evolves.</h2>
            <p>
              Requirements change as programmes move from design into
              implementation and delivery. DeepBridge can support individual
              specialist requirements, multiple project roles and the gradual
              build-out of a wider transformation team.
            </p>
          </div>
          <div className="engagement-list">
            {engagementModels.map((item) => (
              <article key={item.number}>
                <span>{item.number}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section industries-section">
        <div className="shell editorial-grid">
          <div>
            <p className="eyebrow">Industry context</p>
            <p className="micro-copy">
              Experience matters most when the operating environment is
              genuinely complex.
            </p>
          </div>
          <div>
            <h2>Experience in operationally complex environments</h2>
            <div className="industry-list">
              {industries.map((industry, index) => (
                <div key={industry}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{industry}</p>
                </div>
              ))}
            </div>
            <Link className="text-link" to="/for-clients">
              See how we support clients <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <SplitCta />
    </>
  );
}
