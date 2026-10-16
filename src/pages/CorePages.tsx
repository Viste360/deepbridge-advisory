import { Link } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import { ButtonLink, Notice, PageHero, ProcessSection, SectionHeading, SplitCta } from "../components/Ui";
import { getExpertise, getSiteContent } from "../content/siteContent";
import { buildServiceSchema } from "../config/structuredData";
import { useLocale } from "../i18n";

export function ExpertisePage() {
  const { locale, t } = useLocale();
  return (
    <>
      <PageMeta path="/expertise" schema={buildServiceSchema(locale)} />
      <PageHero
        eyebrow={t("Expertise", "Leistungen", "Especialidades")}
        title={t("Expertise for demanding industrial programmes.", "Kompetenz für anspruchsvolle Industrieprojekte.", "Experiencia para proyectos industriales exigentes.")}
        intro={t("Focused support where business operations, technology and project leadership meet.", "Gezielte Unterstützung an der Schnittstelle von operativem Geschäft, Technologie und Projektführung.", "Apoyo especializado en la confluencia de las operaciones, la tecnología y la dirección de proyectos.")}
        aside={<ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink>}
      />
      <section className="section expertise-detail-section">
        <div className="shell">
          <p className="section-copy expertise-availability">
            {t("These are the areas in which we assess and assemble support. For each enquiry, we confirm the relevant experience, professional availability and scope before an engagement is agreed.", "In diesen Bereichen prüfen wir Ihren Bedarf und stellen passende Unterstützung zusammen. Für jede Anfrage klären wir die relevante Erfahrung, Verfügbarkeit und den Leistungsumfang, bevor ein Auftrag vereinbart wird.", "En estas áreas analizamos las necesidades y reunimos el apoyo adecuado. En cada consulta confirmamos la experiencia relevante, la disponibilidad de los profesionales y el alcance antes de acordar la colaboración.")}
          </p>
          <div className="expertise-detail-list">
            {getExpertise(locale).map((service, index) => (
              <article className="expertise-detail" id={["sap", "operations", "leadership"][index]} key={service.code}>
                <div className="expertise-detail-intro">
                  <p className="eyebrow">{service.code}</p>
                  <h2>{service.title}</h2>
                  <p>{service.summary}</p>
                  <ul className="plain-list">{service.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                </div>
                <div className="expertise-detail-body">
                  <div><h3>{t("Typical situation", "Typische Ausgangssituation", "Situación habitual")}</h3><p>{service.situation}</p></div>
                  <div><h3>{t("How we can help", "Wie wir unterstützen können", "Cómo podemos ayudar")}</h3><p>{service.assignment}</p></div>
                  <div><h3>{t("Possible deliverables", "Mögliche Arbeitsergebnisse", "Posibles entregables")}</h3><p>{service.outputs}</p></div>
                  <div><h3>{t("Where we start", "So beginnen wir", "Por dónde empezamos")}</h3><p>{service.start}</p></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section process-section">
        <div className="shell">
          <SectionHeading
            eyebrow={t("From requirement to handover", "Von der Anforderung bis zur Übergabe", "De la necesidad al traspaso")}
            title={t("One clear approach. Shaped to your assignment.", "Ein klarer Ansatz. Passend zu Ihrem Auftrag.", "Un enfoque claro. Adaptado a su encargo.")}
            text={t("The level of DeepBridge involvement is agreed for each assignment.", "Der Umfang unserer Begleitung wird für jeden Auftrag individuell vereinbart.", "El grado de implicación de DeepBridge se acuerda para cada encargo.")}
          />
          <ProcessSection compact />
          <ButtonLink to="/for-clients" variant="text">{t("How we work", "Unsere Zusammenarbeit", "Cómo trabajamos")}</ButtonLink>
        </div>
      </section>
      <SplitCta />
    </>
  );
}

export function ClientsPage() {
  const { locale, t } = useLocale();
  const { clientInputs, clientServices, engagementModels } = getSiteContent(locale);
  return (
    <>
      <PageMeta path="/for-clients" />
      <PageHero
        eyebrow={t("How we work", "Zusammenarbeit", "Cómo trabajamos")}
        title={t("Clear scope. Coordinated delivery. Practical continuity.", "Klarer Auftrag. Koordinierte Umsetzung. Geregelte Übergabe.", "Alcance claro. Ejecución coordinada. Continuidad planificada.")}
        intro={t("Every assignment starts with understanding the work, the operating environment and the responsibilities involved.", "Jeder Einsatz beginnt mit einem klaren Verständnis der Aufgabe, des betrieblichen Umfelds und der jeweiligen Verantwortlichkeiten.", "Cada encargo comienza por comprender el trabajo, el entorno operativo y las responsabilidades de las partes.")}
        aside={<ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink>}
      />
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow={t("The engagement", "Der Auftrag", "La colaboración")}
            title={t("Support that fits the work.", "Unterstützung, die zur Aufgabe passt.", "Apoyo adaptado al trabajo.")}
            text={t("We shape the engagement around what needs to be done, the expertise required and the responsibilities you want DeepBridge to undertake.", "Wir richten die Zusammenarbeit nach den Aufgaben, der benötigten Expertise und den Verantwortlichkeiten aus, die DeepBridge übernehmen soll.", "Definimos la colaboración en función del trabajo necesario, la experiencia requerida y las responsabilidades que desea que asuma DeepBridge.")}
          />
          <div className="engagement-grid">
            {engagementModels.map((model) => <article key={model.number}><span className="step-number">{model.number}</span><h3>{model.title}</h3><p>{model.text}</p></article>)}
          </div>
          <p className="section-note">{t("Scope, engagement arrangements and the level of DeepBridge involvement are agreed for each assignment.", "Leistungsumfang, vertragliche Rahmenbedingungen und der Umfang unserer Begleitung werden für jeden Auftrag individuell vereinbart.", "El alcance, las condiciones de colaboración y el grado de implicación de DeepBridge se acuerdan para cada encargo.")}</p>
        </div>
      </section>
      <section className="section process-section">
        <div className="shell">
          <SectionHeading
            eyebrow={t("From first conversation to handover", "Vom ersten Gespräch bis zur Übergabe", "Del primer contacto al traspaso")}
            title={t("Five steps. Continued involvement.", "Fünf Schritte. Kontinuierliche Begleitung.", "Cinco pasos. Implicación continua.")}
          />
          <ProcessSection />
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow={t("Delivery coordination", "Begleitung der Umsetzung", "Coordinación de la ejecución")}
            title={t("Clear responsibilities throughout the assignment.", "Klare Verantwortlichkeiten während des gesamten Einsatzes.", "Responsabilidades claras durante todo el encargo.")}
            text={t("A named DeepBridge contact keeps the agreed coordination connected across the client, the professionals and the work.", "Ein benannter Ansprechpartner bei DeepBridge koordiniert die vereinbarte Zusammenarbeit zwischen Kunde und Fachleuten im Projektverlauf.", "Un interlocutor designado de DeepBridge mantiene la coordinación acordada entre el cliente, los profesionales y el proyecto.")}
          />
          <div className="service-grid">
            {clientServices.map((service, index) => <article key={service.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{service.title}</h3><p>{service.text}</p></article>)}
          </div>
        </div>
      </section>
      <section className="section brief-section">
        <div className="shell brief-grid">
          <div>
            <p className="eyebrow">{t("A useful starting brief", "Ein guter Ausgangspunkt", "Un buen punto de partida")}</p>
            <h2>{t("What we need to understand", "Was wir verstehen möchten", "Qué necesitamos comprender")}</h2>
            <p>{t("You do not need a finished specification. Share the context you have, and we will help clarify the assignment and next step.", "Sie brauchen noch keine fertige Leistungsbeschreibung. Schildern Sie uns den aktuellen Stand. Gemeinsam klären wir den Auftrag und den nächsten Schritt.", "No necesita una especificación definitiva. Comparta el contexto disponible y le ayudaremos a concretar el encargo y el siguiente paso.")}</p>
          </div>
          <ul className="numbered-list">{clientInputs.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul>
        </div>
      </section>
      <section className="single-cta">
        <div className="shell">
          <p className="eyebrow">{t("Start with the assignment", "Beginnen wir mit der Aufgabe", "Empecemos por el encargo")}</p>
          <h2>{t("What does your project need next?", "Was braucht Ihr Projekt als Nächstes?", "¿Qué necesita su proyecto ahora?")}</h2>
          <p>{t("Tell us about the assignment, the operating challenge and the expertise you need. We will help clarify the next step.", "Beschreiben Sie uns die Aufgabe, die operative Herausforderung und die benötigte Expertise. Gemeinsam klären wir den nächsten Schritt.", "Cuéntenos en qué consiste el encargo, cuál es el reto operativo y qué experiencia necesita. Le ayudaremos a concretar el siguiente paso.")}</p>
          <ButtonLink to="/contact?type=client#contact-form">{t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto")}</ButtonLink>
        </div>
      </section>
    </>
  );
}

export function ConsultantsPage() {
  const { locale, t } = useLocale();
  const { consultantExpectations, consultantInformation, consultantJourney } = getSiteContent(locale);
  return (
    <>
      <PageMeta path="/for-consultants" />
      <PageHero
        eyebrow={t("For professionals", "Für Experten", "Para profesionales")}
        title={t("Bring your expertise to demanding industrial projects.", "Bringen Sie Ihre Expertise in anspruchsvolle Industrieprojekte ein.", "Aporte su experiencia a proyectos industriales exigentes.")}
        intro={t("We work with experienced independent professionals and interim managers across SAP, operations, supply chain, data, finance and programme leadership.", "Wir arbeiten mit erfahrenen selbstständigen Fachleuten und Interim-Managern in den Bereichen SAP, Operations, Supply Chain, Daten, Finance und Projektführung.", "Trabajamos con profesionales independientes y directivos interinos con experiencia en SAP, operaciones, cadena de suministro, datos, finanzas y dirección de programas.")}
        aside={<ButtonLink to="/contact?type=consultant#contact-form">{t("Join the professional network", "Teil unseres Expertennetzwerks werden", "Únase a la red de profesionales")}</ButtonLink>}
      />
      <section className="section">
        <div className="shell consultant-grid">
          <div>
            <p className="eyebrow">{t("What to expect", "Was Sie erwarten können", "Qué puede esperar")}</p>
            <h2>{t("A relevant assignment begins with a clear conversation.", "Ein passender Einsatz beginnt mit einem klaren Gespräch.", "Un encargo adecuado comienza con una conversación clara.")}</h2>
            <p>{t("Assignments may involve a defined specialist role, an interim leadership need or collaboration with complementary professionals. We assess the fit against your experience and the actual project requirements.", "Ein Einsatz kann eine spezialisierte Fachaufgabe, eine interimistische Führungsrolle oder die Zusammenarbeit mit weiteren Experten umfassen. Wir prüfen, wie Ihre Erfahrung zu den konkreten Projektanforderungen passt.", "Los encargos pueden consistir en una función especializada, una necesidad de dirección interina o la colaboración con profesionales complementarios. Valoramos el encaje entre su experiencia y los requisitos reales del proyecto.")}</p>
          </div>
          <ul className="expectation-list">{consultantExpectations.map((item) => <li key={item}><span aria-hidden="true">—</span>{item}</li>)}</ul>
        </div>
      </section>
      <section className="section consultant-info-section">
        <div className="shell brief-grid">
          <div>
            <p className="eyebrow">{t("Joining the network", "Teil des Netzwerks werden", "Formar parte de la red")}</p>
            <h2>{t("Help us understand your experience.", "Geben Sie uns Einblick in Ihre Erfahrung.", "Ayúdenos a conocer su experiencia.")}</h2>
            <p>{t("Start with the information that helps us assess relevant assignments. Please do not send identity documents, bank details or other sensitive onboarding documents through the public form.", "Beginnen Sie mit den Angaben, die uns helfen, passende Einsätze einzuschätzen. Bitte senden Sie keine Ausweisdokumente, Bankdaten oder andere vertrauliche Unterlagen über das öffentliche Formular.", "Empiece por la información que nos permita valorar encargos adecuados. No envíe documentos de identidad, datos bancarios ni otros documentos sensibles de incorporación a través del formulario público.")}</p>
          </div>
          <ul className="numbered-list">{consultantInformation.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul>
        </div>
        <div className="shell">
          <Notice>{t("Joining the network does not guarantee an assignment or create an employment relationship. The status, responsibilities, commercial terms and payment arrangements for each engagement are confirmed in the applicable written agreement before work begins.", "Die Aufnahme in das Netzwerk garantiert keinen Auftrag und begründet kein Arbeitsverhältnis. Status, Verantwortlichkeiten, Konditionen und Zahlungsmodalitäten werden für jeden Einsatz vor Arbeitsbeginn in der jeweiligen schriftlichen Vereinbarung festgelegt.", "La incorporación a la red no garantiza un encargo ni crea una relación laboral. La naturaleza de la relación, las responsabilidades, las condiciones comerciales y las condiciones de pago de cada colaboración se confirman en el acuerdo escrito correspondiente antes de comenzar.")}</Notice>
        </div>
      </section>
      <section className="section consultant-journey-section">
        <div className="shell">
          <SectionHeading
            eyebrow={t("How the relationship works", "So arbeiten wir zusammen", "Cómo se desarrolla la colaboración")}
            title={t("From introduction to assignment and handover.", "Von der Vorstellung bis zum Einsatz und zur Übergabe.", "De la presentación al encargo y al traspaso.")}
            text={t("We keep the context, expectations and communication clear at each stage.", "In jeder Phase achten wir auf einen klaren Kontext, abgestimmte Erwartungen und direkte Kommunikation.", "Mantenemos claros el contexto, las expectativas y la comunicación en cada etapa.")}
          />
          <ol className="consultant-journey-grid">{consultantJourney.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
        </div>
      </section>
      <section className="single-cta">
        <div className="shell">
          <p className="eyebrow">{t("Your next assignment", "Ihr nächster Einsatz", "Su próximo encargo")}</p>
          <h2>{t("Let us know where you can contribute.", "Zeigen Sie uns, wo Sie unterstützen können.", "Cuéntenos dónde puede aportar.")}</h2>
          <p>{t("Share your expertise, location, languages and availability so we can consider your profile when a relevant requirement arises.", "Teilen Sie uns Ihre Expertise, Ihren Standort, Ihre Sprachen und Ihre Verfügbarkeit mit, damit wir Ihr Profil bei passenden Anfragen berücksichtigen können.", "Comparta su especialización, ubicación, idiomas y disponibilidad para que podamos tener en cuenta su perfil cuando surja una necesidad adecuada.")}</p>
          <div className="hero-actions">
            <ButtonLink to="/contact?type=consultant#contact-form">{t("Join the professional network", "Teil des Expertennetzwerks werden", "Únase a la red de profesionales")}</ButtonLink>
            <ButtonLink to="/opportunities" variant="text">{t("View opportunities", "Projektmöglichkeiten ansehen", "Ver oportunidades")}</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

export function AboutPage() {
  const { locale, t, path } = useLocale();
  const { principles, operatingRegions } = getSiteContent(locale);
  return (
    <>
      <PageMeta path="/about" />
      <PageHero
        eyebrow={t("About DeepBridge", "Über DeepBridge", "Quiénes somos")}
        title={t("Industrial understanding. Practical involvement.", "Industrielles Verständnis. Praxisnahe Begleitung.", "Conocimiento industrial. Implicación práctica.")}
        intro={t("DeepBridge connects industrial project needs with experienced professionals and practical delivery coordination.", "DeepBridge verbindet die Anforderungen industrieller Projekte mit erfahrenen Fachleuten und einer praxisnahen Begleitung der Umsetzung.", "DeepBridge conecta las necesidades de los proyectos industriales con profesionales experimentados y una coordinación práctica de la ejecución.")}
        aside={<ButtonLink to="/contact?type=client#contact-form">{t("Start a conversation", "Gespräch beginnen", "Iniciemos una conversación")}</ButtonLink>}
      />
      <section className="section story-section">
        <div className="shell story-grid">
          <p className="eyebrow">{t("Our approach", "Unser Ansatz", "Nuestro enfoque")}</p>
          <div>
            <p className="story-lead">{t("We work with organisations navigating transformation, operational pressure and temporary leadership needs.", "Wir unterstützen Unternehmen in Transformationsphasen, bei operativen Herausforderungen und bei temporärem Führungsbedarf.", "Trabajamos con organizaciones que afrontan procesos de transformación, presión operativa y necesidades temporales de dirección.")}</p>
            <p>{t("Our approach combines clear scoping, selective expertise and continued involvement throughout the assignment. We bring the client's operating context together with the practical experience of independent professionals and interim managers.", "Unser Ansatz verbindet eine klare Auftragsklärung, gezielt ausgewählte Expertise und eine kontinuierliche Begleitung des Einsatzes. Wir bringen das betriebliche Umfeld des Kunden mit der praktischen Erfahrung selbstständiger Fachleute und Interim-Manager zusammen.", "Nuestro enfoque combina un alcance claro, experiencia seleccionada y una implicación continua durante el encargo. Conectamos el contexto operativo del cliente con la experiencia práctica de profesionales independientes y directivos interinos.")}</p>
            <p>{t("Our European focus centres on London, Munich and Madrid, with particular attention to industrial programmes in Germany.", "Unser europäischer Fokus liegt auf London, München und Madrid, mit besonderem Augenmerk auf Industrieprojekte in Deutschland.", "Nuestro enfoque europeo se centra en Londres, Múnich y Madrid, con especial atención a los proyectos industriales en Alemania.")}</p>
          </div>
        </div>
      </section>
      <section className="section principles-section">
        <div className="shell">
          <SectionHeading eyebrow={t("Our principles", "Unsere Grundsätze", "Nuestros principios")} title={t("How we choose to work", "Wie wir zusammenarbeiten", "Nuestra forma de trabajar")} text={t("Clear responsibilities and direct relationships guide the work.", "Klare Verantwortlichkeiten und direkte Zusammenarbeit prägen unseren Ansatz.", "Las responsabilidades claras y las relaciones directas guían nuestro trabajo.")} />
          <div className="principles-grid">{principles.map((principle, index) => <article key={principle.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{principle.title}</h3><p>{principle.text}</p></article>)}</div>
        </div>
      </section>
      <section className="section">
        <div className="shell editorial-grid">
          <p className="eyebrow">{t("Our professional network", "Unser Expertennetzwerk", "Nuestra red de profesionales")}</p>
          <div>
            <h2>{t("Relevant people. An agreed way of working.", "Passende Fachleute. Eine abgestimmte Zusammenarbeit.", "Profesionales adecuados. Una forma de trabajar acordada.")}</h2>
            <p>{t("We consider professionals for the experience an assignment needs: the processes they understand, the operating environments they know and the responsibilities they can take on. Availability, language, travel and working arrangements are part of that discussion.", "Wir betrachten Fachleute im Hinblick auf die Erfahrung, die ein Auftrag erfordert: die Prozesse, die sie verstehen, das betriebliche Umfeld, das sie kennen, und die Verantwortung, die sie übernehmen können. Verfügbarkeit, Sprachen, Reisebereitschaft und Arbeitsmodell gehören zu diesem Gespräch.", "Valoramos a los profesionales por la experiencia que requiere cada encargo: los procesos que conocen, los entornos operativos en los que han trabajado y las responsabilidades que pueden asumir. La disponibilidad, los idiomas, los desplazamientos y el modelo de trabajo forman parte de esa conversación.")}</p>
            <p>{t("DeepBridge remains the agreed point of coordination, bringing the client and the professionals together around progress, issues and continuity. The responsibilities of all parties are defined for the specific engagement.", "DeepBridge bleibt der vereinbarte Ansprechpartner für die Koordination und begleitet den Austausch zwischen Kunde und Experten zu Fortschritt, Problemen und Kontinuität. Die Verantwortung aller Beteiligten wird für den jeweiligen Auftrag festgelegt.", "DeepBridge mantiene el papel de interlocutor acordado para la coordinación entre el cliente y los profesionales en torno al avance, las incidencias y la continuidad. Las responsabilidades de todas las partes se definen para cada colaboración.")}</p>
            <ButtonLink to="/for-consultants" variant="text">{t("For professionals", "Für Experten", "Para profesionales")}</ButtonLink>
          </div>
        </div>
      </section>
      <section className="section international-section">
        <div className="shell">
          <SectionHeading
            eyebrow={t("European focus", "Europäischer Fokus", "Enfoque europeo")}
            title={t("London · Munich · Madrid", "London · München · Madrid", "Londres · Múnich · Madrid")}
            text={t("European focus: London · Munich · Madrid. Germany is central to our development, with an emphasis on industrial transformation and project delivery.", "Europäischer Fokus: London · München · Madrid. Deutschland steht im Mittelpunkt unserer Entwicklung, mit einem Schwerpunkt auf industrieller Transformation und Projektumsetzung.", "Enfoque europeo: Londres · Múnich · Madrid. Alemania ocupa un lugar central en nuestro desarrollo, con especial atención a la transformación industrial y la ejecución de proyectos.")}
          />
          <div className="region-grid" aria-label={t("DeepBridge European focus", "Europäischer Fokus von DeepBridge", "Enfoque europeo de DeepBridge")}>{operatingRegions.map((region, index) => <article key={region.name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{region.name}</h3><p>{region.detail}</p></article>)}</div>
          <div className="international-note">
            <p>{t("These cities describe our strategic focus. Engagement locations and working arrangements are confirmed for each project.", "Diese Städte beschreiben unseren strategischen Fokus. Einsatzorte und Arbeitsmodelle werden für jedes Projekt abgestimmt.", "Estas ciudades describen nuestro enfoque estratégico. Los lugares de prestación del servicio y las condiciones de trabajo se confirman para cada proyecto.")}</p>
            <p>{t("Beyond this European focus, our wider network can inform discussions involving Austria, Switzerland, the United States, Central America and South America. Relevant local expertise and availability are assessed for each requirement.", "Über diesen europäischen Schwerpunkt hinaus kann unser weiteres Netzwerk Gespräche mit Bezug zu Österreich, der Schweiz, den USA, Mittelamerika und Südamerika unterstützen. Passende regionale Expertise und Verfügbarkeit werden für jede Anforderung geprüft.", "Más allá de este enfoque europeo, nuestra red puede contribuir a conversaciones relacionadas con Austria, Suiza, Estados Unidos, Centroamérica y Sudamérica. La experiencia local pertinente y la disponibilidad se valoran para cada necesidad.")}</p>
            <Link className="text-link" to={path("/legal")}>{t("Company and legal information", "Unternehmensangaben und Impressum", "Información societaria y legal")}<span className="direction-arrow" aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
      <SplitCta />
    </>
  );
}

export function OpportunitiesPage() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta path="/opportunities" />
      <PageHero
        eyebrow={t("Current opportunities", "Aktuelle Projektmöglichkeiten", "Oportunidades actuales")}
        title={t("Relevant assignments, shared with context.", "Passende Einsätze mit klarem Kontext.", "Encargos adecuados, con el contexto necesario.")}
        intro={t("We publish opportunities only when the project requirement is current and we are authorised to discuss it.", "Wir veröffentlichen Projektmöglichkeiten nur, wenn der Bedarf aktuell ist und wir berechtigt sind, darüber zu sprechen.", "Solo publicamos oportunidades cuando la necesidad del proyecto está vigente y contamos con autorización para tratarla.")}
        aside={<ButtonLink to="/contact?type=consultant#contact-form">{t("Join the professional network", "Teil des Expertennetzwerks werden", "Únase a la red de profesionales")}</ButtonLink>}
      />
      <section className="section">
        <div className="shell empty-state">
          <span>{t("Current status", "Aktueller Stand", "Situación actual")}</span>
          <h2>{t("No public opportunities are listed at present.", "Derzeit sind keine öffentlichen Projektangebote gelistet.", "Actualmente no hay oportunidades publicadas.")}</h2>
          <p>{t("Some assignments are handled confidentially or directly through our professional network. Joining the network allows us to consider your profile when a relevant requirement becomes available.", "Einige Einsätze werden vertraulich oder direkt über unser Expertennetzwerk besprochen. Mit der Aufnahme in unser Netzwerk können wir Ihr Profil bei passenden Anfragen berücksichtigen.", "Algunos encargos se gestionan de forma confidencial o directamente a través de nuestra red de profesionales. Al incorporarse a la red, podremos tener en cuenta su perfil cuando surja una necesidad adecuada.")}</p>
          <div>
            <ButtonLink to="/contact?type=consultant#contact-form">{t("Share your profile", "Profil vorstellen", "Presente su perfil")}</ButtonLink>
            <ButtonLink to="/for-consultants" variant="text">{t("How we work with professionals", "So arbeiten wir mit Experten", "Cómo trabajamos con los profesionales")}</ButtonLink>
          </div>
        </div>
        <div className="shell opportunity-note"><Notice>{t("Opportunities remain subject to changes in project requirements, client confirmation and the applicable engagement arrangements.", "Projektmöglichkeiten stehen unter dem Vorbehalt geänderter Anforderungen, der Kundenbestätigung und der jeweiligen vertraglichen Rahmenbedingungen.", "Las oportunidades están sujetas a cambios en las necesidades del proyecto, a la confirmación del cliente y a las condiciones de colaboración aplicables.")}</Notice></div>
      </section>
    </>
  );
}

export function NotFoundPage() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta path="/404" />
      <section className="not-found"><div className="shell">
        <p className="eyebrow">{t("404 · Page not found", "404 · Seite nicht gefunden", "404 · Página no encontrada")}</p>
        <h1>{t("We could not find this page.", "Diese Seite konnten wir nicht finden.", "No hemos encontrado esta página.")}</h1>
        <p>{t("The page may have moved. Return home or go directly to the contact page.", "Die Seite wurde möglicherweise verschoben. Gehen Sie zur Startseite oder direkt zur Kontaktseite.", "Es posible que la página se haya movido. Vuelva al inicio o acceda directamente a la página de contacto.")}</p>
        <div className="hero-actions"><ButtonLink to="/">{t("Return home", "Zur Startseite", "Volver al inicio")}</ButtonLink><ButtonLink to="/contact" variant="secondary">{t("Contact DeepBridge", "DeepBridge kontaktieren", "Contactar con DeepBridge")}</ButtonLink></div>
      </div></section>
    </>
  );
}
