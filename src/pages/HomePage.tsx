import { Link } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import {
  ButtonLink,
  ExpertiseGrid,
  ProcessSection,
  SectionHeading,
  SplitCta,
} from "../components/Ui";
import { commonQuestions, homeSchema } from "../config/structuredData";
import { insights } from "../content/insights";
import {
  engagementModels,
  industries,
  transformationFoundations,
  transformationStages,
} from "../content/siteContent";

function HeroVisual() {
  return (
    <figure className="hero-visual">
      <img
        src="/images/transformation/deepbridge-transformation-hero.webp"
        width="1122"
        height="1402"
        alt="Transformation professionals reviewing a modern industrial operation"
        fetchPriority="high"
      />
      <div className="hero-visual-shade" aria-hidden="true" />
      <div className="hero-visual-grid" aria-hidden="true" />
      <figcaption>
        <span>Transformation, built deliberately</span>
        <strong>Define · Mobilise · Deliver</strong>
      </figcaption>
    </figure>
  );
}

export function HomePage() {
  return (
    <>
      <PageMeta path="/" schema={homeSchema} />
      <section className="home-hero">
        <div className="shell home-hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Transformation advisory &amp; delivery</p>
            <h1>
              Build the transformation. <em>From first decision to delivery.</em>
            </h1>
            <p className="hero-intro">
              DeepBridge brings transformation consultancy experience to the
              point programmes are shaped—defining the need, structuring the
              capability and assembling experienced specialists across SAP,
              supply chain, data and business transformation.
            </p>
            <div className="hero-actions">
              <ButtonLink to="/contact?type=client#contact-form">
                Discuss a requirement
              </ButtonLink>
              <ButtonLink to="/contact?type=consultant" variant="secondary">
                Join our network
              </ButtonLink>
            </div>
            <p className="hero-trust">
              <span aria-hidden="true" />
              UK · Spain · DACH · US · Central &amp; South America
            </p>
          </div>
          <HeroVisual />
        </div>
        <div className="shell hero-proof" aria-label="How DeepBridge works">
          <p>
            <span>01</span> Define the transformation need
          </p>
          <p>
            <span>02</span> Build the right capability
          </p>
          <p>
            <span>03</span> Stay close through delivery
          </p>
        </div>
      </section>

      <section className="section problem-section">
        <div className="shell editorial-grid">
          <p className="eyebrow">Start before the job title</p>
          <div>
            <h2>A transformation is designed before it is staffed.</h2>
            <div className="two-column-copy">
              <p>
                The earliest decisions shape everything that follows: which
                outcomes matter, how workstreams connect, where ownership sits
                and what capability is genuinely missing.
              </p>
              <p>
                DeepBridge helps turn that context into a practical capability
                model, then identifies credible specialists and stays involved
                through mobilisation, onboarding and delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section transformation-lifecycle-section">
        <div className="shell lifecycle-intro-grid">
          <div>
            <p className="eyebrow">End-to-end perspective</p>
            <h2>From first brief to operating reality.</h2>
          </div>
          <p>
            DeepBridge can engage while the requirement is still taking shape,
            helping organisations connect programme design with the specialist
            capability needed to carry it forward.
          </p>
        </div>
        <div className="shell lifecycle-grid">
          {transformationStages.map((stage) => (
            <article key={stage.number}>
              <span>{stage.number}</span>
              <h3>{stage.title}</h3>
              <p>{stage.text}</p>
            </article>
          ))}
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

      <section className="section entity-section" aria-labelledby="deepbridge-overview">
        <div className="shell entity-grid">
          <div className="entity-intro">
            <p className="eyebrow">DeepBridge at a glance</p>
            <h2 id="deepbridge-overview">What DeepBridge Advisory does</h2>
            <p>
              A concise view of who we support, where we operate and how an
              engagement begins.
            </p>
          </div>
          <dl className="entity-answers">
            {commonQuestions.map((item, index) => (
              <div key={item.question}>
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
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

      <section className="transformation-media-section">
        <div className="shell transformation-media-frame">
          <img
            src="/images/transformation/industrial-delivery.webp"
            width="1672"
            height="941"
            loading="lazy"
            alt="A connected manufacturing and logistics operation"
          />
          <div className="transformation-media-overlay">
            <p className="eyebrow">Where transformation becomes real</p>
            <h2>Business, technology and operations—moving together.</h2>
          </div>
        </div>
        <div className="shell foundation-grid">
          {transformationFoundations.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
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
              See how we support clients
              <span className="direction-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section home-insights-section">
        <div className="shell">
          <div className="section-heading-row">
            <SectionHeading
              eyebrow="Transformation insights"
              title="Useful thinking before the next delivery decision"
              text="Practical guidance for defining requirements, strengthening programme teams and working across borders."
            />
            <ButtonLink to="/insights" variant="text">
              View all insights
            </ButtonLink>
          </div>
          <div className="home-insights-grid">
            {insights.map((insight, index) => (
              <article key={insight.slug}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{insight.eyebrow}</p>
                <h3>
                  <Link to={`/insights/${insight.slug}`}>{insight.title}</Link>
                </h3>
                <Link className="text-link" to={`/insights/${insight.slug}`}>
                  Read insight
                  <span className="direction-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SplitCta />
    </>
  );
}
