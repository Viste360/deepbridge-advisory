import { Link, Navigate, useParams } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import { ButtonLink, PageHero } from "../components/Ui";
import { buildArticleSchema, buildInsightsSchema } from "../config/structuredData";
import { getInsight, getInsights, type Insight } from "../content/insights";
import { useLocale, type Locale } from "../i18n";

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const { path, t } = useLocale();
  return (
    <article className="insight-card">
      <div className="insight-card-meta">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{insight.readingTime}</span>
      </div>
      <p className="insight-category">{insight.eyebrow}</p>
      <h2><Link to={path(`/insights/${insight.slug}`)}>{insight.title}</Link></h2>
      <p>{insight.description}</p>
      <Link className="text-link" to={path(`/insights/${insight.slug}`)}>
        {t("Read the insight", "Beitrag lesen", "Leer el artículo")}
        <span className="direction-arrow" aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function InsightsPage() {
  const { locale, t } = useLocale();
  const insights = getInsights(locale);
  return (
    <>
      <PageMeta path="/insights" schema={buildInsightsSchema(insights, locale)} />
      <PageHero
        eyebrow={t("DeepBridge insights", "DeepBridge Einblicke", "Perspectivas de DeepBridge")}
        title={t("Practical thinking for complex transformation delivery.", "Praktische Impulse für anspruchsvolle Transformationsprojekte.", "Ideas prácticas para proyectos de transformación exigentes.")}
        intro={t("Clear guidance for organisations building programme teams and for independent specialists navigating demanding assignments.", "Klare Orientierung für Unternehmen beim Aufbau ihrer Projektteams und für selbstständige Experten in anspruchsvollen Einsätzen.", "Orientación clara para organizaciones que forman equipos de proyecto y para especialistas independientes que afrontan encargos exigentes.")}
        aside={<ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink>}
      />
      <section className="section insights-intro">
        <div className="shell editorial-grid">
          <div>
            <p className="eyebrow">{t("Delivery knowledge", "Wissen für die Umsetzung", "Conocimiento para la ejecución")}</p>
            <p className="micro-copy">{t("Practical perspectives from DeepBridge Advisory.", "Praktische Perspektiven von DeepBridge Advisory.", "Perspectivas prácticas de DeepBridge Advisory.")}</p>
          </div>
          <div>
            <h2>{t("Start with the decision the programme needs to make.", "Beginnen Sie mit der Entscheidung, die Ihr Programm voranbringt.", "Empiece por la decisión que su programa necesita tomar.")}</h2>
            <p className="lead-copy">{t("These notes turn recurring transformation questions into usable frameworks: what to clarify, what to test and where a specialist can add value.", "Diese Beiträge übersetzen wiederkehrende Fragen der Transformation in praktische Orientierung: Was ist zu klären, was ist zu prüfen und wo kann ein Experte einen Beitrag leisten?", "Estos artículos convierten preguntas habituales sobre transformación en una orientación práctica: qué aclarar, qué comprobar y dónde puede aportar valor un especialista.")}</p>
          </div>
        </div>
      </section>
      <section className="section insights-list-section" aria-label={t("Latest insights", "Aktuelle Einblicke", "Últimas perspectivas")}>
        <div className="shell insights-grid">
          {insights.map((insight, index) => <InsightCard key={insight.slug} insight={insight} index={index} />)}
        </div>
      </section>
      <section className="single-cta">
        <div className="shell">
          <p className="eyebrow">{t("A specific delivery question?", "Eine konkrete Frage zur Umsetzung?", "¿Una pregunta concreta sobre la ejecución?")}</p>
          <h2>{t("Bring us the programme context.", "Sprechen wir über Ihr Programm.", "Hablemos del contexto de su programa.")}</h2>
          <p>{t("Tell us the assignment, workstream, location and timing. We will help clarify the expertise and coordination your project needs.", "Beschreiben Sie uns die Aufgabe, das Teilprojekt, den Einsatzort und die Zeitplanung. Gemeinsam klären wir, welche Expertise und Koordination Ihr Projekt braucht.", "Cuéntenos el encargo, la línea de trabajo, la ubicación y los plazos. Le ayudaremos a concretar la experiencia y la coordinación que necesita su proyecto.")}</p>
          <ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink>
        </div>
      </section>
    </>
  );
}

export function InsightArticlePage() {
  const { slug } = useParams();
  const { locale, path, t } = useLocale();
  const insight = slug ? getInsight(slug, locale) : undefined;

  if (!insight) return <Navigate to={path("/404")} replace />;

  return (
    <>
      <PageMeta path={`/insights/${insight.slug}`} schema={buildArticleSchema(insight, locale)} />
      <article className="insight-article">
        <header className="insight-article-hero">
          <div className="shell article-hero-grid">
            <div>
              <nav className="breadcrumb" aria-label={t("Breadcrumb", "Brotkrumennavigation", "Ruta de navegación")}>
                <Link to={path("/")}>{t("Home", "Startseite", "Inicio")}</Link>
                <span aria-hidden="true">/</span>
                <Link to={path("/insights")}>{t("Insights", "Einblicke", "Perspectivas")}</Link>
              </nav>
              <p className="eyebrow">{insight.eyebrow}</p>
              <h1>{insight.title}</h1>
            </div>
            <div className="article-summary">
              <p>{insight.introduction}</p>
              <div>
                <span>{insight.readingTime}</span>
                <time dateTime={insight.updated}>{t("Updated", "Aktualisiert am", "Actualizado el")} {formatDate(insight.updated, locale)}</time>
              </div>
            </div>
          </div>
        </header>
        <div className="shell article-layout">
          <aside className="article-key-points" aria-labelledby="key-points-title">
            <p className="eyebrow" id="key-points-title">{t("In brief", "Auf einen Blick", "En pocas palabras")}</p>
            <ul>{insight.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
          </aside>
          <div className="article-body">
            {insight.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.checklist && (
                  <div className="article-checklist">
                    <h3>{t("A practical briefing checklist", "Eine praktische Checkliste für Ihr Briefing", "Lista práctica para definir el encargo")}</h3>
                    <ul>{section.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
              </section>
            ))}
            <aside className="article-note">
              <p>{t("This article provides general information, not legal, tax, immigration or employment-status advice. Assignment-specific questions should be reviewed by appropriately qualified advisers.", "Dieser Beitrag enthält allgemeine Informationen und stellt keine Rechts-, Steuer-, Migrations- oder Statusberatung dar. Fragen zu einem konkreten Einsatz sollten mit entsprechend qualifizierten Beratern geprüft werden.", "Este artículo ofrece información general, no asesoramiento jurídico, fiscal, migratorio ni sobre la situación laboral. Las cuestiones relativas a un encargo concreto deben revisarse con asesores debidamente cualificados.")}</p>
            </aside>
          </div>
        </div>
      </article>
      <section className="article-next">
        <div className="shell article-next-grid">
          <div>
            <p className="eyebrow">{t("Continue the conversation", "Lassen Sie uns weiterdenken", "Continuemos la conversación")}</p>
            <h2>{t("Apply the framework to your programme.", "Übertragen Sie diese Ansätze auf Ihr Programm.", "Aplique estas ideas a su programa.")}</h2>
          </div>
          <ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink>
        </div>
      </section>
    </>
  );
}
