import { PageMeta } from "../components/SiteShell";
import { ButtonLink, ExpertiseGrid, ProcessSection, SectionHeading } from "../components/Ui";
import { buildHomeSchema } from "../config/structuredData";
import { useLocale } from "../i18n";
import { ProjectExperience } from "../components/ProjectExperience";

export function HomePage() {
  const { locale, t } = useLocale();
  const coordination = [
    ["A named DeepBridge contact", "Ein benannter Ansprechpartner bei DeepBridge", "Un interlocutor designado en DeepBridge"],
    ["Clear responsibilities and communication", "Klare Verantwortlichkeiten und Kommunikation", "Responsabilidades y comunicación claras"],
    ["Agreed progress reviews", "Vereinbarte Fortschrittsgespräche", "Revisiones de avance acordadas"],
    ["Practical issue and change coordination", "Koordination von Problemen und Änderungen", "Coordinación práctica de incidencias y cambios"],
    ["Planned handover and replacement coordination when needed", "Geplante Übergabe und bei Bedarf koordinierte Nachbesetzung", "Traspaso planificado y coordinación de sustituciones cuando sea necesario"],
  ];
  return <>
    <PageMeta path="/" schema={buildHomeSchema(locale)} />
    <section className="home-hero">
      <div className="shell home-hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" aria-hidden="true" />{t("Industrial transformation & project delivery", "Industrielle Transformation & Projektumsetzung", "Transformación industrial y ejecución de proyectos")}</p>
          <h1>{t("Industrial expertise.", "Erfahrene Experten.", "Experiencia industrial.")}<br /><span>{t("Accountable delivery.", "Klare Verantwortung.", "Responsabilidad en la ejecución.")}</span></h1>
          <p className="hero-intro">{t("DeepBridge supports industrial businesses through SAP transformation, operational improvement and interim leadership.", "DeepBridge unterstützt Industrieunternehmen bei SAP-Transformationen, operativen Verbesserungen und Interim-Management-Aufgaben.", "DeepBridge apoya a las empresas industriales en la transformación SAP, la mejora operativa y la dirección interina.")}</p>
          <p className="hero-detail">{t("We bring together experienced professionals, define the assignment and stay involved through delivery, coordination and handover.", "Wir bringen erfahrene Fachleute zusammen, klären den Auftrag und begleiten die Zusammenarbeit von der Mobilisierung bis zur Übergabe.", "Reunimos a profesionales con experiencia, definimos el encargo y mantenemos nuestra implicación durante la ejecución, la coordinación y el traspaso.")}</p>
          <div className="hero-actions"><ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink><ButtonLink to="/expertise" variant="secondary">{t("Explore our expertise", "Leistungen entdecken", "Conozca nuestras especialidades")}</ButtonLink></div>
          <p className="hero-location"><span aria-hidden="true">◦</span>{t("European focus: London · Munich · Madrid", "Europäischer Fokus: London · München · Madrid", "Enfoque europeo: Londres · Múnich · Madrid")}</p>
        </div>
        <figure className="industrial-visual">
          <img src="/images/transformation/industrial-delivery.webp" width="1672" height="941" alt={t("Illustrative view of an industrial production hall", "Illustrative Ansicht einer industriellen Produktionshalle", "Imagen ilustrativa de una nave de producción industrial")} fetchPriority="high" />
          <figcaption><span>{t("Industry in focus", "Industrie im Fokus", "La industria, en el centro")}</span><span>{t("Illustrative image", "Illustrative Darstellung", "Imagen ilustrativa")}</span></figcaption>
          <div className="visual-index" aria-hidden="true"><span>DB / 01</span><span>{t("EUROPE", "EUROPA", "EUROPA")}</span></div>
        </figure>
      </div>
      <div className="shell hero-bottom"><span>{t("Expertise where it matters", "Expertise, wo sie zählt", "Experiencia donde se necesita")}</span><p>SAP <span aria-hidden="true">/</span> {t("Operations", "Operations", "Operaciones")} <span aria-hidden="true">/</span> {t("Supply Chain", "Supply Chain", "Cadena de suministro")} <span aria-hidden="true">/</span> {t("Interim Leadership", "Interim Management", "Dirección interina")}</p><a href="#expertise" aria-label={t("Discover our expertise", "Unsere Leistungen entdecken", "Descubra nuestras especialidades")}>↓</a></div>
    </section>

    <section className="section expertise-section" id="expertise">
      <div className="shell"><div className="section-heading-row"><SectionHeading eyebrow={t("01 / Core expertise", "01 / Leistungen", "01 / Especialidades")} title={t("Expertise for demanding industrial programmes.", "Kompetenz für anspruchsvolle Industrieprojekte.", "Experiencia para proyectos industriales exigentes.")} text={t("Focused support where business operations, technology and project leadership meet.", "Gezielte Unterstützung an der Schnittstelle von operativem Geschäft, Technologie und Projektführung.", "Apoyo especializado en la confluencia de las operaciones, la tecnología y la dirección de proyectos.")} /><ButtonLink to="/expertise" variant="text">{t("Our expertise", "Unsere Leistungen", "Nuestras especialidades")}</ButtonLink></div><ExpertiseGrid /></div>
    </section>

    <section className="section how-section">
      <div className="shell"><div className="section-heading-row"><SectionHeading eyebrow={t("02 / How we work", "02 / Zusammenarbeit", "02 / Cómo trabajamos")} title={t("Clear scope. Coordinated delivery. Practical continuity.", "Klarer Auftrag. Koordinierte Umsetzung. Geregelte Übergabe.", "Alcance claro. Ejecución coordinada. Continuidad planificada.")} text={t("Every assignment starts with understanding the work, the operating environment and the responsibilities involved.", "Jeder Einsatz beginnt mit einem klaren Verständnis der Aufgabe, des betrieblichen Umfelds und der jeweiligen Verantwortlichkeiten.", "Cada encargo comienza por comprender el trabajo, el entorno operativo y las responsabilidades de las partes.")} /><ButtonLink to="/for-clients" variant="text">{t("How we work", "Unsere Zusammenarbeit", "Cómo trabajamos")}</ButtonLink></div><ProcessSection /><p className="process-note">{t("The level of DeepBridge involvement is agreed for each assignment.", "Der Umfang unserer Begleitung wird für jeden Auftrag individuell vereinbart.", "El grado de implicación de DeepBridge se acuerda para cada encargo.")}</p></div>
    </section>

    <ProjectExperience />

    <section className="section accountability-section">
      <div className="shell accountability-grid"><div><p className="eyebrow">{t("03 / Accountability & continuity", "03 / Verantwortung & Kontinuität", "03 / Responsabilidad y continuidad")}</p><h2>{t("A clear point of coordination throughout the assignment.", "Ein zentraler Ansprechpartner während des gesamten Einsatzes.", "Un interlocutor de referencia durante todo el encargo.")}</h2><p className="section-copy">{t("DeepBridge remains involved beyond the initial introduction. We agree how progress is reviewed, how issues are escalated and how continuity is managed.", "DeepBridge bleibt auch nach der Vorstellung der Experten eingebunden. Wir vereinbaren, wie Fortschritte besprochen, Probleme eskaliert und Kontinuität organisiert werden.", "La implicación de DeepBridge continúa tras la presentación inicial. Acordamos cómo se revisa el avance, cómo se escalan las incidencias y cómo se gestiona la continuidad.")}</p></div><ul className="accountability-list">{coordination.map(([en,de,es],i)=><li key={en}><span aria-hidden="true">{String(i+1).padStart(2,"0")}</span>{t(en,de,es)}<span className="checkmark" aria-hidden="true">✓</span></li>)}</ul></div>
    </section>

    <section className="section european-section">
      <div className="shell european-grid"><div><p className="eyebrow">{t("04 / European focus", "04 / Europäischer Fokus", "04 / Enfoque europeo")}</p><h2>{t("European perspective.\nIndustrial understanding.", "Europäische Perspektive.\nIndustrielles Verständnis.", "Perspectiva europea.\nConocimiento industrial.")}</h2></div><div><p className="european-cities">{t("London · Munich · Madrid", "London · München · Madrid", "Londres · Múnich · Madrid")}</p><p>{t("Our European focus connects the UK, Germany and Spain, with particular attention to industrial programmes in Germany.", "Unser europäischer Fokus verbindet Großbritannien, Deutschland und Spanien – mit besonderem Augenmerk auf Industrieprojekte in Deutschland.", "Nuestro enfoque europeo conecta el Reino Unido, Alemania y España, con especial atención a los proyectos industriales en Alemania.")}</p><p>{t("We shape each assignment around its location, language needs and working arrangements.", "Wir stimmen jeden Einsatz auf den Standort, die Sprachanforderungen und das Arbeitsmodell ab.", "Adaptamos cada encargo a su ubicación, sus necesidades lingüísticas y su modelo de trabajo.")}</p><ButtonLink to="/about" variant="text">{t("About DeepBridge", "Über DeepBridge", "Quiénes somos")}</ButtonLink></div></div>
    </section>

    <section className="final-cta"><div className="shell final-cta-grid"><div><p className="eyebrow">{t("Let's move your project forward", "Bringen wir Ihr Projekt voran", "Avancemos con su proyecto")}</p><h2>{t("What does your project need next?", "Was braucht Ihr Projekt als Nächstes?", "¿Qué necesita su proyecto ahora?")}</h2><p>{t("Tell us about the assignment, the operating challenge and the expertise you need. We will help clarify the next step.", "Beschreiben Sie uns die Aufgabe, die operative Herausforderung und die benötigte Expertise. Gemeinsam klären wir den nächsten Schritt.", "Cuéntenos en qué consiste el encargo, cuál es el reto operativo y qué experiencia necesita. Le ayudaremos a concretar el siguiente paso.")}</p></div><ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink></div></section>
  </>;
}
