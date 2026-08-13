import { Link, Navigate, useParams } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import { ButtonLink, PageHero } from "../components/Ui";
import { buildArticleSchema, buildInsightsSchema } from "../config/structuredData";
import { getInsight, insights, type Insight } from "../content/insights";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  return (
    <article className="insight-card">
      <div className="insight-card-meta">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{insight.readingTime}</span>
      </div>
      <p className="insight-category">{insight.eyebrow}</p>
      <h2>
        <Link to={`/insights/${insight.slug}`}>{insight.title}</Link>
      </h2>
      <p>{insight.description}</p>
      <Link className="text-link" to={`/insights/${insight.slug}`}>
        Read the insight
        <span className="direction-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </article>
  );
}

export function InsightsPage() {
  return (
    <>
      <PageMeta path="/insights" schema={buildInsightsSchema(insights)} />
      <PageHero
        eyebrow="DeepBridge insights"
        title="Practical thinking for complex transformation delivery."
        intro="Clear, experience-led guidance for organisations building programme teams and for independent specialists navigating demanding assignments."
        aside={
          <ButtonLink to="/contact?type=client#contact-form">
            Discuss a requirement
          </ButtonLink>
        }
      />
      <section className="section insights-intro">
        <div className="shell editorial-grid">
          <div>
            <p className="eyebrow">Delivery knowledge</p>
            <p className="micro-copy">
              Written by DeepBridge Advisory and reviewed for practical use.
            </p>
          </div>
          <div>
            <h2>Start with the decision the programme needs to make.</h2>
            <p className="lead-copy">
              These notes turn recurring transformation questions into usable
              frameworks. They are deliberately direct: what to clarify, what
              to test and where a specialist can add value.
            </p>
          </div>
        </div>
      </section>
      <section className="section insights-list-section" aria-label="Latest insights">
        <div className="shell insights-grid">
          {insights.map((insight, index) => (
            <InsightCard key={insight.slug} insight={insight} index={index} />
          ))}
        </div>
      </section>
      <section className="single-cta">
        <div className="shell">
          <p className="eyebrow">A specific delivery question?</p>
          <h2>Bring us the programme context.</h2>
          <p>
            Tell us the outcome, workstream, location and timing. We will help
            turn it into a focused specialist requirement.
          </p>
          <ButtonLink to="/contact?type=client#contact-form">
            Start a conversation
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

export function InsightArticlePage() {
  const { slug } = useParams();
  const insight = slug ? getInsight(slug) : undefined;

  if (!insight) return <Navigate to="/404" replace />;

  const path = `/insights/${insight.slug}`;

  return (
    <>
      <PageMeta path={path} schema={buildArticleSchema(insight)} />
      <article className="insight-article">
        <header className="insight-article-hero">
          <div className="shell article-hero-grid">
            <div>
              <nav className="breadcrumb" aria-label="Breadcrumb">
                <Link to="/">Home</Link>
                <span aria-hidden="true">/</span>
                <Link to="/insights">Insights</Link>
              </nav>
              <p className="eyebrow">{insight.eyebrow}</p>
              <h1>{insight.title}</h1>
            </div>
            <div className="article-summary">
              <p>{insight.introduction}</p>
              <div>
                <span>{insight.readingTime}</span>
                <time dateTime={insight.updated}>
                  Reviewed {formatDate(insight.updated)}
                </time>
              </div>
            </div>
          </div>
        </header>

        <div className="shell article-layout">
          <aside className="article-key-points" aria-labelledby="key-points-title">
            <p className="eyebrow" id="key-points-title">
              In brief
            </p>
            <ul>
              {insight.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </aside>
          <div className="article-body">
            {insight.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.checklist && (
                  <div className="article-checklist">
                    <h3>A practical briefing checklist</h3>
                    <ul>
                      {section.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))}
            <aside className="article-note">
              <p>
                This article provides general information, not legal, tax,
                immigration or employment-status advice. Assignment-specific
                questions should be reviewed by appropriately qualified
                advisers.
              </p>
            </aside>
          </div>
        </div>
      </article>
      <section className="article-next">
        <div className="shell article-next-grid">
          <div>
            <p className="eyebrow">Continue the conversation</p>
            <h2>Apply the framework to your programme.</h2>
          </div>
          <ButtonLink to="/contact?type=client#contact-form">
            Discuss a requirement
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
