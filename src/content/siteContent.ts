export type Locale = "en" | "de" | "es";

export type Expertise = {
  code: string;
  title: string;
  summary: string;
  details: string[];
  situation: string;
  assignment: string;
  outputs: string;
  start: string;
};

const expertiseByLocale: Record<Locale, Expertise[]> = {
  en: [
    {
      code: "01 / SAP",
      title: "SAP & Business Transformation",
      summary: "Specialist support for SAP S/4HANA programmes, business processes, operational data and reporting.",
      details: ["SAP and ERP transformation", "Planning and process improvement", "Business analysis", "Data and Power BI reporting", "Workstream coordination"],
      situation: "A SAP programme changes how planning, production or finance works. Business requirements, operational data and decisions need to stay connected.",
      assignment: "A business analyst to define planning requirements, a Power BI specialist to improve operational reporting, or a workstream lead to coordinate business and technical teams.",
      outputs: "Depending on the scope: documented requirements, process maps, reporting specifications, agreed dashboards or a workstream plan with clear owners.",
      start: "We review the programme stage, systems, business processes, data access and decisions required before agreeing the specialist profile and scope.",
    },
    {
      code: "02 / OPERATIONS",
      title: "Operations & Supply Chain",
      summary: "Experienced professionals supporting planning, production, logistics and order-to-delivery improvement.",
      details: ["Production and operations leadership", "Supply chain planning", "Customer service and order-to-delivery", "Inventory and logistics", "Operational stabilisation"],
      situation: "Planning is under pressure, delivery priorities are changing, or a production or logistics team needs additional experience during a period of transition.",
      assignment: "A planning specialist to review supply and demand, operational support across customer service and order-to-delivery, or interim coordination for production and logistics.",
      outputs: "Depending on the scope: an operational assessment, prioritised improvement actions, planning routines, clearer responsibilities or a practical handover plan.",
      start: "We discuss the operating environment, current constraints, site requirements and available data, then agree the immediate priorities and responsibilities.",
    },
    {
      code: "03 / LEADERSHIP",
      title: "Interim Leadership & Finance",
      summary: "Senior capability for periods of change, delivery pressure and temporary leadership needs.",
      details: ["Interim management", "Finance and controlling", "Programme and project leadership", "Transformation PMO", "Business and operational coordination"],
      situation: "A key role is temporarily vacant, reporting needs greater structure, or a transformation programme requires experienced leadership and coordination.",
      assignment: "An interim manager for a defined transition, finance or controlling support, a programme lead, or a PMO professional to organise decisions, dependencies and reporting.",
      outputs: "Depending on the scope: a transition plan, management reporting, a decision and risk register, programme routines or documented knowledge transfer.",
      start: "We clarify the mandate, decision authority, stakeholder relationships, reporting expectations and anticipated handover before selecting the right experience.",
    },
  ],
  de: [
    {
      code: "01 / SAP",
      title: "SAP & Unternehmenstransformation",
      summary: "Spezialisierte Unterstützung für SAP-S/4HANA-Programme, Geschäftsprozesse, operative Daten und Reporting.",
      details: ["SAP- und ERP-Transformation", "Planung und Prozessverbesserung", "Business-Analyse", "Daten und Power-BI-Reporting", "Koordination von Teilprojekten"],
      situation: "Ein SAP-Programm verändert Abläufe in Planung, Produktion oder Finance. Fachliche Anforderungen, operative Daten und Entscheidungen müssen aufeinander abgestimmt bleiben.",
      assignment: "Ein Business-Analyst für Planungsanforderungen, ein Power-BI-Spezialist für das operative Reporting oder eine Teilprojektleitung, die Fachbereiche und technische Teams koordiniert.",
      outputs: "Je nach Auftrag: dokumentierte Anforderungen, Prozessdarstellungen, Reporting-Spezifikationen, abgestimmte Dashboards oder ein Teilprojektplan mit klaren Verantwortlichkeiten.",
      start: "Wir besprechen den Programmstand, die Systeme, Geschäftsprozesse, Datenzugänge und anstehenden Entscheidungen. Darauf aufbauend stimmen wir Expertenprofil und Leistungsumfang ab.",
    },
    {
      code: "02 / OPERATIONS",
      title: "Operations & Supply Chain",
      summary: "Erfahrene Fachleute für Planung, Produktion, Logistik und die Verbesserung von Order-to-Delivery-Prozessen.",
      details: ["Produktions- und Betriebsleitung", "Supply-Chain-Planung", "Kundenservice und Order-to-Delivery", "Bestände und Logistik", "Operative Stabilisierung"],
      situation: "Die Planung steht unter Druck, Lieferprioritäten ändern sich oder ein Produktions- beziehungsweise Logistikteam benötigt zusätzliche Erfahrung in einer Übergangsphase.",
      assignment: "Ein Planungsspezialist zur Abstimmung von Angebot und Nachfrage, operative Unterstützung zwischen Kundenservice und Lieferung oder die zeitweise Koordination von Produktion und Logistik.",
      outputs: "Je nach Auftrag: eine operative Bestandsaufnahme, priorisierte Verbesserungsmaßnahmen, Planungsroutinen, klarere Zuständigkeiten oder ein praxisnaher Übergabeplan.",
      start: "Wir klären das betriebliche Umfeld, aktuelle Engpässe, Anforderungen am Standort und die Datenlage. Anschließend vereinbaren wir Prioritäten und Verantwortlichkeiten.",
    },
    {
      code: "03 / FÜHRUNG",
      title: "Interim Management & Finance",
      summary: "Erfahrene Führungskräfte und Spezialisten für Veränderungsphasen, anspruchsvolle Projekte und temporären Führungsbedarf.",
      details: ["Interim Management", "Finance und Controlling", "Programm- und Projektleitung", "Transformations-PMO", "Betriebliche und operative Koordination"],
      situation: "Eine Schlüsselposition ist vorübergehend unbesetzt, das Berichtswesen braucht mehr Struktur oder ein Transformationsprogramm benötigt erfahrene Führung und Koordination.",
      assignment: "Ein Interim-Manager für eine definierte Übergangsphase, Unterstützung in Finance oder Controlling, eine Programmleitung oder ein PMO-Spezialist für Entscheidungen, Abhängigkeiten und Reporting.",
      outputs: "Je nach Auftrag: ein Übergangsplan, Managementberichte, eine Entscheidungs- und Risikoübersicht, regelmäßige Programmabstimmungen oder dokumentierter Wissenstransfer.",
      start: "Wir klären Mandat, Entscheidungsbefugnisse, Zusammenarbeit mit den Beteiligten, Berichtspflichten und die geplante Übergabe, bevor wir passende Fachleute auswählen.",
    },
  ],
  es: [
    {
      code: "01 / SAP",
      title: "SAP y transformación empresarial",
      summary: "Apoyo especializado en programas SAP S/4HANA, procesos de negocio, datos operativos e informes de gestión.",
      details: ["Transformación SAP y ERP", "Planificación y mejora de procesos", "Análisis de negocio", "Datos e informes con Power BI", "Coordinación de líneas de trabajo"],
      situation: "Un programa SAP cambia la forma de trabajar en planificación, producción o finanzas. Las necesidades del negocio, los datos operativos y las decisiones deben mantenerse alineados.",
      assignment: "Un analista de negocio para definir los requisitos de planificación, un especialista en Power BI para mejorar los informes operativos o un responsable de línea de trabajo que coordine los equipos de negocio y tecnología.",
      outputs: "Según el alcance: requisitos documentados, mapas de procesos, especificaciones de informes, cuadros de mando acordados o un plan de trabajo con responsables definidos.",
      start: "Revisamos la fase del programa, los sistemas, los procesos de negocio, el acceso a los datos y las decisiones pendientes antes de acordar el perfil profesional y el alcance.",
    },
    {
      code: "02 / OPERACIONES",
      title: "Operaciones y cadena de suministro",
      summary: "Profesionales con experiencia en planificación, producción, logística y mejora del proceso desde el pedido hasta la entrega.",
      details: ["Dirección de producción y operaciones", "Planificación de la cadena de suministro", "Atención al cliente y gestión del pedido a la entrega", "Inventario y logística", "Estabilización operativa"],
      situation: "La planificación está bajo presión, cambian las prioridades de entrega o un equipo de producción o logística necesita experiencia adicional durante una transición.",
      assignment: "Un especialista en planificación para revisar oferta y demanda, apoyo operativo entre atención al cliente y entrega, o coordinación temporal de producción y logística.",
      outputs: "Según el alcance: un diagnóstico operativo, acciones de mejora priorizadas, rutinas de planificación, responsabilidades más claras o un plan práctico de traspaso.",
      start: "Analizamos el entorno operativo, las limitaciones actuales, los requisitos del centro de trabajo y los datos disponibles. Después acordamos las prioridades inmediatas y las responsabilidades.",
    },
    {
      code: "03 / DIRECCIÓN",
      title: "Dirección interina y finanzas",
      summary: "Experiencia sénior para etapas de cambio, proyectos exigentes y necesidades temporales de dirección.",
      details: ["Dirección interina", "Finanzas y control de gestión", "Dirección de programas y proyectos", "Oficina de proyectos de transformación (PMO)", "Coordinación empresarial y operativa"],
      situation: "Un puesto clave está temporalmente vacante, los informes necesitan más estructura o un programa de transformación requiere dirección y coordinación con experiencia.",
      assignment: "Un directivo interino para una transición definida, apoyo en finanzas o control de gestión, un director de programa o un profesional de PMO para organizar decisiones, dependencias e informes.",
      outputs: "Según el alcance: un plan de transición, informes de gestión, un registro de decisiones y riesgos, rutinas de seguimiento del programa o transferencia de conocimiento documentada.",
      start: "Aclaramos el mandato, la autoridad para decidir, la relación con las partes implicadas, los requisitos de información y el traspaso previsto antes de seleccionar la experiencia adecuada.",
    },
  ],
};

const processByLocale = {
  en: [
    { number: "01", title: "Define", text: "Clarify the requirement, scope, expected outputs, working model and client dependencies." },
    { number: "02", title: "Assemble", text: "Identify professionals whose experience and availability match the assignment." },
    { number: "03", title: "Mobilise", text: "Align responsibilities, engagement arrangements, onboarding and reporting." },
    { number: "04", title: "Oversee", text: "Maintain agreed progress reviews, coordinate issues and manage changes as the work develops." },
    { number: "05", title: "Transition", text: "Plan handover, knowledge transfer and continuity, including replacement coordination where required." },
  ],
  de: [
    { number: "01", title: "Auftrag klären", text: "Anforderungen, Leistungsumfang, erwartete Arbeitsergebnisse, Arbeitsmodell und Mitwirkung des Kunden abstimmen." },
    { number: "02", title: "Expertise zusammenstellen", text: "Fachleute auswählen, deren Erfahrung und Verfügbarkeit zur Aufgabe passen." },
    { number: "03", title: "Einsatz vorbereiten", text: "Verantwortlichkeiten, vertragliche Rahmenbedingungen, Einarbeitung und Berichterstattung abstimmen." },
    { number: "04", title: "Umsetzung begleiten", text: "Vereinbarte Fortschrittsgespräche führen, Probleme koordinieren und Änderungen im Projektverlauf abstimmen." },
    { number: "05", title: "Übergabe sichern", text: "Wissenstransfer, Übergabe und Kontinuität planen sowie bei Bedarf die Nachbesetzung koordinieren." },
  ],
  es: [
    { number: "01", title: "Definir", text: "Aclarar la necesidad, el alcance, los entregables previstos, el modelo de trabajo y las aportaciones necesarias del cliente." },
    { number: "02", title: "Reunir la experiencia", text: "Identificar profesionales cuya experiencia y disponibilidad encajen con el encargo." },
    { number: "03", title: "Preparar el inicio", text: "Acordar responsabilidades, condiciones de colaboración, incorporación e informes de seguimiento." },
    { number: "04", title: "Acompañar la ejecución", text: "Mantener las revisiones de avance acordadas, coordinar incidencias y gestionar los cambios durante el trabajo." },
    { number: "05", title: "Preparar el traspaso", text: "Planificar la transferencia de conocimiento, el traspaso y la continuidad, incluida la coordinación de sustituciones cuando sea necesario." },
  ],
};

const content = {
  en: {
    engagementModels: [
      { number: "01", title: "Individual specialist assignment", text: "One experienced professional with a clear role, agreed outputs and defined interfaces within your team." },
      { number: "02", title: "Complementary professionals", text: "Several specialists whose capabilities work together across a programme, workstream or operating challenge." },
      { number: "03", title: "Work package or coordination mandate", text: "An agreed scope of work or coordination responsibility, with the delivery approach and respective responsibilities defined at the outset." },
    ],
    clientServices: [
      { title: "Scope and responsibilities", text: "Agree the work, intended outputs, decision owners and client dependencies. Define what DeepBridge and each professional will coordinate or deliver." },
      { title: "Selection and mobilisation", text: "Review relevant experience and availability, align working and commercial arrangements, and coordinate interviews, onboarding and access." },
      { title: "Progress and escalation", text: "Agree review points and reporting. Keep decisions, emerging issues and changes visible, with a named route for escalation." },
      { title: "Handover and continuity", text: "Plan knowledge transfer and outstanding actions. Where continuity requires a replacement, coordinate the requirement, availability and transition." },
    ],
    clientInputs: ["The operating challenge and required work", "Expected start, duration and immediate priorities", "Project location, travel and working model", "Required expertise and languages", "Decision owners, available data and dependencies", "Commercial parameters and onboarding requirements"],
    consultantExpectations: ["Clear assignment context and responsibilities", "Open discussion of rates and engagement arrangements", "Realistic travel and onsite expectations", "Direct communication throughout selection", "Coordinated onboarding and agreed reporting", "Continued contact, issue coordination and planned handover"],
    consultantInformation: ["Relevant project experience and areas of expertise", "Location, availability and languages", "Professional profile or optional LinkedIn link", "Preferred working model and travel availability", "Rate expectations, discussed for a relevant assignment", "Company, invoicing and work-authorisation details at the appropriate stage"],
    consultantJourney: [
      { title: "Introduce your experience", text: "Tell us where you are based, when you are available and the industrial assignments you are best placed to support." },
      { title: "Review the fit", text: "We consider relevant delivery experience, sector context, languages and working preferences against the requirement." },
      { title: "Discuss the assignment", text: "We discuss scope, responsibilities, timing, location and commercial expectations before progressing an introduction." },
      { title: "Agree and mobilise", text: "We coordinate client discussions, clarify engagement arrangements and support the practical steps into the assignment." },
      { title: "Stay connected", text: "We maintain the agreed contact and progress reviews, help coordinate issues and plan handover or continuity as needed." },
    ],
    principles: [
      { title: "Understand the assignment", text: "Start with the work and the operating environment. Good scope makes responsibilities and the expertise required easier to define." },
      { title: "Choose relevant experience", text: "Consider what a professional has done, how they work and where their experience fits the assignment." },
      { title: "Remain involved", text: "Agree how progress is reviewed and how issues, changes and continuity will be coordinated throughout the engagement." },
      { title: "Make the handover practical", text: "Plan the transfer of knowledge and responsibility so that the client team can carry the work forward." },
    ],
    operatingRegions: [
      { name: "London", detail: "UK company base and a connection to clients and professionals across Europe." },
      { name: "Munich", detail: "A strategic focus for developing relationships around German industrial programmes." },
      { name: "Madrid", detail: "A strategic focus for connections with Spain and wider European project delivery." },
    ],
  },
  de: {
    engagementModels: [
      { number: "01", title: "Einzelner Experteneinsatz", text: "Eine erfahrene Fachkraft mit einer klaren Rolle, vereinbarten Arbeitsergebnissen und definierten Schnittstellen zu Ihrem Team." },
      { number: "02", title: "Sich ergänzende Fachleute", text: "Mehrere Spezialisten, deren Kompetenzen sich in einem Programm, Teilprojekt oder bei einer operativen Aufgabe ergänzen." },
      { number: "03", title: "Arbeitspaket oder Koordinationsmandat", text: "Ein vereinbarter Leistungsumfang oder Koordinationsauftrag. Vorgehen und jeweilige Verantwortlichkeiten werden zu Beginn festgelegt." },
    ],
    clientServices: [
      { title: "Auftrag und Verantwortung", text: "Aufgaben, angestrebte Arbeitsergebnisse, Entscheidungsbefugnisse und Mitwirkung des Kunden abstimmen. Festlegen, was DeepBridge und die einzelnen Fachleute koordinieren oder umsetzen." },
      { title: "Auswahl und Vorbereitung", text: "Relevante Erfahrung und Verfügbarkeit prüfen, Arbeitsweise und Konditionen abstimmen sowie Gespräche, Einarbeitung und Zugänge koordinieren." },
      { title: "Fortschritt und Eskalation", text: "Fortschrittsgespräche und Berichterstattung vereinbaren. Entscheidungen, aufkommende Probleme und Änderungen transparent halten und einen Eskalationsweg benennen." },
      { title: "Übergabe und Kontinuität", text: "Wissenstransfer und offene Aufgaben planen. Ist eine Nachbesetzung erforderlich, koordinieren wir Anforderungen, Verfügbarkeit und Übergang." },
    ],
    clientInputs: ["Operative Herausforderung und konkrete Aufgaben", "Geplanter Beginn, Dauer und erste Prioritäten", "Projektstandort, Reisetätigkeit und Arbeitsmodell", "Benötigte Expertise und Sprachen", "Entscheidungsverantwortliche, verfügbare Daten und Abhängigkeiten", "Kommerzielle Rahmenbedingungen und Anforderungen an die Einarbeitung"],
    consultantExpectations: ["Klarer Auftragskontext und eindeutige Verantwortlichkeiten", "Offener Austausch zu Honorar und vertraglichen Rahmenbedingungen", "Realistische Reise- und Präsenzanforderungen", "Direkte Kommunikation im Auswahlprozess", "Koordinierte Einarbeitung und vereinbarte Berichterstattung", "Fortlaufender Austausch, Problemkoordination und geplante Übergabe"],
    consultantInformation: ["Relevante Projekterfahrung und Fachgebiete", "Standort, Verfügbarkeit und Sprachen", "Berufliches Profil oder optional ein LinkedIn-Link", "Bevorzugtes Arbeitsmodell und Reisebereitschaft", "Honorarvorstellungen im Gespräch über einen passenden Einsatz", "Unternehmens-, Rechnungs- und Arbeitserlaubnisangaben zum geeigneten Zeitpunkt"],
    consultantJourney: [
      { title: "Erfahrung vorstellen", text: "Teilen Sie uns mit, wo Sie ansässig sind, wann Sie verfügbar sind und welche industriellen Aufgaben am besten zu Ihrer Expertise passen." },
      { title: "Passung prüfen", text: "Wir betrachten relevante Projekterfahrung, Branchenkenntnis, Sprachen und Arbeitspräferenzen im Hinblick auf die konkrete Anforderung." },
      { title: "Auftrag besprechen", text: "Wir klären Umfang, Verantwortlichkeiten, Zeitrahmen, Standort und Konditionen, bevor wir eine Vorstellung beim Kunden vorbereiten." },
      { title: "Abstimmen und starten", text: "Wir koordinieren Kundengespräche, klären die Rahmenbedingungen und begleiten die praktischen Schritte bis zum Einsatzbeginn." },
      { title: "Im Austausch bleiben", text: "Wir führen die vereinbarten Fortschrittsgespräche, unterstützen die Koordination von Problemen und planen bei Bedarf Übergabe und Kontinuität." },
    ],
    principles: [
      { title: "Den Auftrag verstehen", text: "Ausgangspunkt sind die Aufgabe und das betriebliche Umfeld. Ein klarer Umfang hilft, Verantwortung und benötigte Expertise zu bestimmen." },
      { title: "Passende Erfahrung auswählen", text: "Wir betrachten die bisherigen Aufgaben, die Arbeitsweise und die Erfahrung einer Fachkraft im Hinblick auf den konkreten Einsatz." },
      { title: "Die Umsetzung begleiten", text: "Wir vereinbaren, wie Fortschritte besprochen und Probleme, Änderungen sowie Kontinuität während des Einsatzes koordiniert werden." },
      { title: "Die Übergabe vorbereiten", text: "Wir planen die Weitergabe von Wissen und Verantwortung, damit das Kundenteam die Arbeit weiterführen kann." },
    ],
    operatingRegions: [
      { name: "London", detail: "Sitz der britischen Gesellschaft und Verbindung zu Kunden und Fachleuten in Europa." },
      { name: "München", detail: "Strategischer Fokus für den Aufbau von Beziehungen rund um Industrieprojekte in Deutschland." },
      { name: "Madrid", detail: "Strategischer Fokus für Verbindungen nach Spanien und die Zusammenarbeit in europäischen Projekten." },
    ],
  },
  es: {
    engagementModels: [
      { number: "01", title: "Un especialista para una función definida", text: "Un profesional con experiencia, una función clara, entregables acordados y una coordinación definida con su equipo." },
      { number: "02", title: "Profesionales complementarios", text: "Varios especialistas cuyas capacidades se complementan en un programa, una línea de trabajo o un reto operativo." },
      { number: "03", title: "Paquete de trabajo o mandato de coordinación", text: "Un alcance de trabajo o una responsabilidad de coordinación acordados, con el enfoque de ejecución y las responsabilidades de cada parte definidos desde el inicio." },
    ],
    clientServices: [
      { title: "Alcance y responsabilidades", text: "Acordar el trabajo, los entregables previstos, quién toma las decisiones y las aportaciones del cliente. Definir qué coordinará o ejecutará DeepBridge y cada profesional." },
      { title: "Selección e incorporación", text: "Revisar la experiencia relevante y la disponibilidad, acordar el modelo de trabajo y las condiciones comerciales, y coordinar entrevistas, incorporación y accesos." },
      { title: "Seguimiento y escalado de incidencias", text: "Acordar revisiones e informes de avance. Mantener visibles las decisiones, las incidencias y los cambios, con un cauce definido para su escalado." },
      { title: "Traspaso y continuidad", text: "Planificar la transferencia de conocimiento y las acciones pendientes. Cuando la continuidad requiera una sustitución, coordinar las necesidades, la disponibilidad y la transición." },
    ],
    clientInputs: ["El reto operativo y el trabajo necesario", "Inicio previsto, duración y prioridades inmediatas", "Ubicación del proyecto, desplazamientos y modelo de trabajo", "Especialización e idiomas necesarios", "Responsables de las decisiones, datos disponibles y dependencias", "Condiciones comerciales y requisitos de incorporación"],
    consultantExpectations: ["Contexto del encargo y responsabilidades claros", "Conversación abierta sobre honorarios y condiciones de colaboración", "Expectativas realistas de desplazamiento y presencia", "Comunicación directa durante la selección", "Incorporación coordinada e informes de seguimiento acordados", "Contacto continuo, coordinación de incidencias y traspaso planificado"],
    consultantInformation: ["Experiencia relevante en proyectos y áreas de especialización", "Ubicación, disponibilidad e idiomas", "Perfil profesional o enlace opcional a LinkedIn", "Modelo de trabajo preferido y disponibilidad para viajar", "Expectativas de honorarios, tratadas para un encargo concreto", "Datos de empresa, facturación y autorización de trabajo en la fase correspondiente"],
    consultantJourney: [
      { title: "Presentar su experiencia", text: "Indíquenos dónde está, cuándo tiene disponibilidad y en qué proyectos industriales puede aportar más valor." },
      { title: "Valorar el encaje", text: "Contrastamos la experiencia en proyectos, el contexto sectorial, los idiomas y las preferencias de trabajo con los requisitos del encargo." },
      { title: "Concretar el encargo", text: "Hablamos del alcance, las responsabilidades, los plazos, la ubicación y las condiciones comerciales antes de avanzar con una presentación." },
      { title: "Acordar y preparar el inicio", text: "Coordinamos las conversaciones con el cliente, aclaramos las condiciones de colaboración y acompañamos los pasos prácticos hasta la incorporación." },
      { title: "Mantener el contacto", text: "Mantenemos el contacto y las revisiones de avance acordados, ayudamos a coordinar incidencias y planificamos el traspaso o la continuidad según las necesidades." },
    ],
    principles: [
      { title: "Comprender el encargo", text: "Partir del trabajo y del entorno operativo. Un alcance claro facilita la definición de las responsabilidades y la experiencia necesaria." },
      { title: "Seleccionar experiencia relevante", text: "Considerar qué ha hecho un profesional, cómo trabaja y cómo encaja su experiencia con el encargo." },
      { title: "Mantener la implicación", text: "Acordar cómo se revisará el avance y cómo se coordinarán las incidencias, los cambios y la continuidad durante la colaboración." },
      { title: "Preparar un traspaso práctico", text: "Planificar la transferencia de conocimiento y responsabilidades para que el equipo del cliente pueda dar continuidad al trabajo." },
    ],
    operatingRegions: [
      { name: "Londres", detail: "Sede de la sociedad británica y conexión con clientes y profesionales de toda Europa." },
      { name: "Múnich", detail: "Foco estratégico para desarrollar relaciones en torno a proyectos industriales en Alemania." },
      { name: "Madrid", detail: "Foco estratégico para las conexiones con España y la ejecución de proyectos europeos." },
    ],
  },
};

export const getExpertise = (locale: Locale) => expertiseByLocale[locale];
export const getProcessSteps = (locale: Locale) => processByLocale[locale];
export const getSiteContent = (locale: Locale) => content[locale];

// English exports remain available to existing integrations and content consumers.
export const expertise = getExpertise("en");
export const processSteps = getProcessSteps("en");
export const {
  engagementModels,
  clientServices,
  clientInputs,
  consultantExpectations,
  consultantInformation,
  consultantJourney,
  principles,
  operatingRegions,
} = getSiteContent("en");

export const industries = ["Manufacturing", "Industrial products", "Supply chain & logistics", "Consumer & packaged goods", "Technology-enabled transformation"];
export const transformationStages = processSteps;
export const transformationFoundations = [
  { title: "Business operations", text: "Processes, planning and the operating context behind the assignment." },
  { title: "Technology & data", text: "SAP, operational data and reporting connected to business requirements." },
  { title: "Project leadership", text: "Clear responsibilities, practical coordination and planned handover." },
];
