import { Link } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import { LegalPage, Notice } from "../components/Ui";
import { company, siteConfig } from "../config/site";
import { useLocale } from "../i18n";

type Translation = readonly [string, string, string];
type PolicySection = {
  heading: Translation;
  paragraphs?: Translation[];
  bullets?: Translation[];
};

function PolicySections({ sections }: { sections: PolicySection[] }) {
  const { t } = useLocale();
  return sections.map((section) => (
    <section key={section.heading[0]}>
      <h2>{t(...section.heading)}</h2>
      {section.paragraphs?.map((paragraph) => <p key={paragraph[0]}>{t(...paragraph)}</p>)}
      {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet[0]}>{t(...bullet)}</li>)}</ul>}
    </section>
  ));
}

function policyDate(locale: string) {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(siteConfig.privacyUpdated));
}

const informationCollected: Translation[] = [
  ["contact and professional information supplied through an enquiry;", "Kontakt- und berufliche Angaben, die Sie im Rahmen einer Anfrage übermitteln;", "datos de contacto e información profesional facilitados mediante una consulta;"],
  ["client organisation, role, programme and requirement details;", "Angaben zum Kundenunternehmen, zur Rolle, zum Programm und zum Unterstützungsbedarf;", "información sobre la organización del cliente, la función, el programa y las necesidades;"],
  ["consultant location, expertise, languages, availability, professional profile and commercial expectations;", "Standort, Fachgebiete, Sprachkenntnisse, Verfügbarkeit, berufliches Profil und kommerzielle Erwartungen von Fachleuten;", "ubicación, especialización, idiomas, disponibilidad, perfil profesional y expectativas comerciales de los profesionales;"],
  ["correspondence, interview and engagement records created through our relationship; and", "Korrespondenz sowie Gesprächs- und Einsatzunterlagen, die im Rahmen unserer Zusammenarbeit entstehen; sowie", "correspondencia y registros de entrevistas y encargos generados durante nuestra relación; y"],
  ["limited technical information required to deliver and protect the website.", "begrenzte technische Informationen, die für die Bereitstellung und den Schutz der Website erforderlich sind.", "información técnica limitada necesaria para ofrecer y proteger el sitio web."],
];

const dataUses: Array<{ purpose: Translation; basis: Translation }> = [
  { purpose: ["Responding to enquiries", "Beantwortung von Anfragen", "Responder a consultas"], basis: ["Legitimate interests and steps requested before a contract", "Berechtigte Interessen und auf Anfrage durchgeführte vorvertragliche Maßnahmen", "Intereses legítimos y medidas precontractuales solicitadas"] },
  { purpose: ["Assessing consultant suitability and relevant opportunities", "Prüfung der Eignung von Fachleuten und passender Einsatzmöglichkeiten", "Valorar la idoneidad de los profesionales y las oportunidades pertinentes"], basis: ["Legitimate interests and steps requested before a contract", "Berechtigte Interessen und auf Anfrage durchgeführte vorvertragliche Maßnahmen", "Intereses legítimos y medidas precontractuales solicitadas"] },
  { purpose: ["Coordinating introductions, contracting and assignments", "Koordination von Vorstellungen, Vertragsabschlüssen und Einsätzen", "Coordinar presentaciones, contratación y encargos"], basis: ["Contract, legitimate interests and legal obligations", "Vertragserfüllung, berechtigte Interessen und rechtliche Verpflichtungen", "Ejecución de contratos, intereses legítimos y obligaciones legales"] },
  { purpose: ["Protecting the website and our business", "Schutz der Website und unseres Unternehmens", "Proteger el sitio web y nuestra actividad"], basis: ["Legitimate interests and legal obligations", "Berechtigte Interessen und rechtliche Verpflichtungen", "Intereses legítimos y obligaciones legales"] },
  { purpose: ["Optional marketing, if introduced", "Optionales Marketing, sofern eingeführt", "Comunicaciones comerciales opcionales, si se incorporan"], basis: ["Consent or legitimate interests, as applicable, with an unsubscribe option", "Je nach Fall Einwilligung oder berechtigte Interessen, mit Abmeldemöglichkeit", "Consentimiento o intereses legítimos, según corresponda, con la posibilidad de darse de baja"] },
];

const privacySections: PolicySection[] = [
  {
    heading: ["Who receives information", "Wer Informationen erhält", "Quién recibe la información"],
    paragraphs: [
      ["We share information only where relevant and proportionate. This may include a client considering a consultant, a consultant considering an assignment, professional advisers, and service providers that support hosting, communications and form delivery.", "Wir geben Informationen nur weiter, wenn dies relevant und verhältnismäßig ist. Empfänger können beispielsweise Kunden sein, die den Einsatz einer Fachkraft prüfen, Fachleute, die einen Auftrag prüfen, berufliche Berater sowie Dienstleister für Hosting, Kommunikation und Formularübermittlung.", "Solo compartimos información cuando resulta pertinente y proporcionado. Los destinatarios pueden incluir a un cliente que esté valorando a un profesional, un profesional que esté valorando un encargo, asesores profesionales y proveedores de alojamiento web, comunicaciones y envío de formularios."],
      ["The website is hosted using infrastructure supplied by Vercel or a replacement hosting provider selected by DeepBridge. Public forms are processed through Formspree before being delivered to DeepBridge. These providers process information under their own contractual security and privacy arrangements.", "Die Website wird auf einer Infrastruktur von Vercel oder einem von DeepBridge ausgewählten Ersatzanbieter gehostet. Öffentliche Formulare werden über Formspree verarbeitet, bevor sie an DeepBridge übermittelt werden. Diese Anbieter verarbeiten Informationen im Rahmen ihrer jeweiligen vertraglichen Sicherheits- und Datenschutzregelungen.", "El sitio web utiliza infraestructura de alojamiento proporcionada por Vercel o por un proveedor sustituto seleccionado por DeepBridge. Los formularios públicos se procesan a través de Formspree antes de enviarse a DeepBridge. Estos proveedores tratan la información conforme a sus respectivos acuerdos contractuales de seguridad y privacidad."],
      ["We do not sell personal information and do not add people to marketing lists merely because they submitted an enquiry.", "Wir verkaufen keine personenbezogenen Daten. Personen werden nicht allein deshalb in Marketing-Verteilerlisten aufgenommen, weil sie eine Anfrage gesendet haben.", "No vendemos datos personales ni añadimos a las personas a listas de comunicaciones comerciales por el mero hecho de haber enviado una consulta."],
    ],
  },
  {
    heading: ["International transfers", "Internationale Datenübermittlungen", "Transferencias internacionales"],
    paragraphs: [["DeepBridge supports international work across the UK, Europe and the Americas, and some service providers may process information in other countries. Where personal information is transferred outside the UK or European Economic Area, the parties responsible for the transfer should use an appropriate safeguard, such as an adequacy decision or approved contractual clauses, where required.", "DeepBridge unterstützt internationale Einsätze im Vereinigten Königreich, in Europa und auf dem amerikanischen Kontinent. Einige Dienstleister können Informationen in anderen Ländern verarbeiten. Bei der Übermittlung personenbezogener Daten außerhalb des Vereinigten Königreichs oder des Europäischen Wirtschaftsraums sollten die für die Übermittlung verantwortlichen Parteien, soweit erforderlich, geeignete Schutzmaßnahmen einsetzen, etwa einen Angemessenheitsbeschluss oder genehmigte Vertragsklauseln.", "DeepBridge apoya encargos internacionales en el Reino Unido, Europa y América, y algunos proveedores pueden tratar información en otros países. Cuando se transfieran datos personales fuera del Reino Unido o del Espacio Económico Europeo, las partes responsables de la transferencia deberían utilizar, cuando sea necesario, una garantía adecuada, como una decisión de adecuación o cláusulas contractuales aprobadas."]],
  },
  {
    heading: ["How long we keep information", "Wie lange wir Informationen aufbewahren", "Durante cuánto tiempo conservamos la información"],
    paragraphs: [
      ["Information is retained according to its purpose, the continuing relevance of the professional relationship, any active enquiry or assignment, and applicable contractual, tax, legal or dispute requirements. We periodically review contact and professional profile information and delete or anonymise it when there is no longer a reasonable business or legal need to retain it.", "Die Aufbewahrungsdauer richtet sich nach dem Verwendungszweck, der fortdauernden Relevanz der beruflichen Beziehung, laufenden Anfragen oder Einsätzen sowie einschlägigen vertraglichen, steuerlichen und gesetzlichen Anforderungen oder Anforderungen im Zusammenhang mit Rechtsstreitigkeiten. Wir prüfen Kontakt- und Profildaten regelmäßig und löschen oder anonymisieren sie, sobald kein angemessener geschäftlicher oder rechtlicher Grund für ihre Aufbewahrung mehr besteht.", "La información se conserva en función de su finalidad, la vigencia de la relación profesional, las consultas o los encargos en curso y las exigencias contractuales, fiscales, legales o relacionadas con litigios que resulten aplicables. Revisamos periódicamente los datos de contacto y los perfiles profesionales, y los eliminamos o anonimizamos cuando deja de existir una necesidad empresarial o legal razonable de conservarlos."],
      ["You may ask us to review, correct or delete your information at any time. Some records may need to be retained where a legal obligation or an ongoing contractual need applies.", "Sie können uns jederzeit um Prüfung, Berichtigung oder Löschung Ihrer Informationen bitten. Bestimmte Unterlagen müssen gegebenenfalls aufbewahrt werden, wenn eine rechtliche Verpflichtung oder ein fortbestehender vertraglicher Bedarf vorliegt.", "Puede solicitarnos en cualquier momento que revisemos, corrijamos o eliminemos su información. Es posible que debamos conservar determinados registros cuando exista una obligación legal o una necesidad contractual vigente."],
    ],
  },
  {
    heading: ["Your rights", "Ihre Rechte", "Sus derechos"],
    paragraphs: [
      ["Depending on the circumstances and applicable law, you may have the right to access, correct, erase or restrict personal information; object to processing; receive portable data; or withdraw consent where consent is relied upon. You also have the right to complain to the UK Information Commissioner's Office or another supervisory authority that is relevant to your location.", "Je nach Umständen und anwendbarem Recht können Sie Rechte auf Auskunft, Berichtigung, Löschung oder Einschränkung der Verarbeitung personenbezogener Daten, Widerspruch gegen die Verarbeitung, Datenübertragbarkeit oder Widerruf einer erteilten Einwilligung haben. Sie haben außerdem das Recht, sich beim britischen Information Commissioner’s Office oder einer anderen für Ihren Standort zuständigen Aufsichtsbehörde zu beschweren.", "Según las circunstancias y la legislación aplicable, puede tener derecho a acceder a sus datos personales, rectificarlos, suprimirlos o limitar su tratamiento; oponerse al tratamiento; recibir sus datos en un formato que permita su portabilidad; o retirar el consentimiento cuando el tratamiento se base en él. También tiene derecho a presentar una reclamación ante la Information Commissioner’s Office del Reino Unido u otra autoridad de control competente para su ubicación."],
      ["We do not use website enquiries for solely automated decisions or profiling that produce legal or similarly significant effects.", "Wir verwenden Website-Anfragen nicht für ausschließlich automatisierte Entscheidungen oder Profiling, die rechtliche oder ähnlich erhebliche Auswirkungen haben.", "No utilizamos las consultas del sitio web para tomar decisiones exclusivamente automatizadas ni elaborar perfiles que produzcan efectos jurídicos o de importancia similar."],
    ],
  },
];

export function PrivacyPage() {
  const { t, locale } = useLocale();
  return (
    <>
      <PageMeta path="/privacy" />
      <LegalPage title={t("Privacy Notice", "Datenschutzhinweise", "Aviso de privacidad")} intro={`${t("Version", "Version", "Versión")} ${siteConfig.privacyVersion} · ${t("Last updated", "Zuletzt aktualisiert", "Última actualización")} ${policyDate(locale)}`}>
        <section>
          <h2>{t("Who is responsible for your information", "Wer für Ihre Informationen verantwortlich ist", "Quién es responsable de sus datos")}</h2>
          <p>{t(
            `${company.legalName}, company number ${company.companyNumber}, registered in ${company.registeredIn}, operates this website and acts as the data controller for website and enquiry information.`,
            `${company.legalName}, registriert in England und Wales unter der Unternehmensnummer ${company.companyNumber}, betreibt diese Website und ist für Informationen aus der Website und aus Anfragen der datenschutzrechtlich Verantwortliche.`,
            `${company.legalName}, registrada en Inglaterra y Gales con el número de sociedad ${company.companyNumber}, es titular de este sitio web y responsable del tratamiento de los datos del sitio web y de las consultas.`,
          )}</p>
          <p>{t("You can contact us about privacy at ", "Bei Datenschutzfragen erreichen Sie uns unter ", "Puede contactar con nosotros para cuestiones de privacidad en ")}<a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>{t(` or by writing to ${company.registeredOffice}.`, ` oder schriftlich unter ${company.registeredOffice}.`, ` o por escrito a ${company.registeredOffice}.`)}</p>
        </section>
        <section>
          <h2>{t("Information we collect", "Welche Informationen wir erheben", "Información que recopilamos")}</h2>
          <p>{t("Depending on how you interact with DeepBridge, this may include:", "Je nach Art Ihres Kontakts mit DeepBridge können hierzu gehören:", "Según cómo se relacione con DeepBridge, esta información puede incluir:")}</p>
          <ul>{informationCollected.map((item) => <li key={item[0]}>{t(...item)}</li>)}</ul>
          <p>{t(
            "We may obtain information directly from you, from a client or consultant involved in an assignment, from professional networking services, or from publicly available professional sources. We do not ask for identity, banking or tax documents through the public website.",
            "Wir können Informationen direkt von Ihnen, von einem an einem Einsatz beteiligten Kunden oder einer Fachkraft, aus beruflichen Netzwerkdiensten oder aus öffentlich zugänglichen beruflichen Quellen erhalten. Über die öffentliche Website fordern wir keine Ausweis-, Bank- oder Steuerunterlagen an.", "Podemos obtener información directamente de usted, de un cliente o profesional que participe en un encargo, de redes profesionales o de fuentes profesionales de acceso público. No solicitamos documentos de identidad, bancarios ni fiscales a través del sitio web público.",
          )}</p>
        </section>
        <section>
          <h2>{t("How and why we use information", "Wie und warum wir Informationen verwenden", "Cómo y por qué utilizamos la información")}</h2>
          <div className="legal-table" role="table" aria-label={t("Data uses", "Datenverwendung", "Usos de los datos")}>
            <div role="row"><strong role="columnheader">{t("Purpose", "Zweck", "Finalidad")}</strong><strong role="columnheader">{t("Typical lawful basis", "Typische Rechtsgrundlage", "Base jurídica habitual")}</strong></div>
            {dataUses.map((row) => <div role="row" key={row.purpose[0]}><span role="cell">{t(...row.purpose)}</span><span role="cell">{t(...row.basis)}</span></div>)}
          </div>
          <p>{t(
            "Our legitimate interests include operating a specialist advisory business, understanding genuine project needs, maintaining relevant professional relationships and protecting our services. We balance these interests against the rights and expectations of individuals.",
            "Zu unseren berechtigten Interessen gehören der Betrieb eines spezialisierten Beratungsunternehmens, das Verständnis konkreter Projektbedarfe, die Pflege relevanter beruflicher Beziehungen und der Schutz unserer Dienstleistungen. Wir wägen diese Interessen gegen die Rechte und Erwartungen der betroffenen Personen ab.", "Nuestros intereses legítimos incluyen desarrollar una actividad de asesoramiento especializado, comprender necesidades reales de proyectos, mantener relaciones profesionales pertinentes y proteger nuestros servicios. Ponderamos estos intereses frente a los derechos y las expectativas de las personas.",
          )}</p>
        </section>
        <PolicySections sections={privacySections} />
        <section>
          <h2>{t("Contacting us", "Kontakt", "Contacto")}</h2>
          <p>{t("To exercise a right or ask a privacy question, email ", "Wenn Sie ein Recht ausüben möchten oder eine Datenschutzfrage haben, schreiben Sie an ", "Para ejercer un derecho o plantear una consulta sobre privacidad, escriba a ")}<a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>{t(
            ". We may need to confirm your identity before acting on a request, but we will not ask you to send sensitive identity documents through the public contact form.",
            ". Gegebenenfalls müssen wir Ihre Identität bestätigen, bevor wir eine Anfrage bearbeiten. Wir werden Sie jedoch nicht auffordern, sensible Ausweisdokumente über das öffentliche Kontaktformular zu senden.", ". Es posible que necesitemos confirmar su identidad antes de atender una solicitud, pero no le pediremos que envíe documentos de identidad sensibles a través del formulario de contacto público.",
          )}</p>
        </section>
        <Notice>{t(
          "This notice describes the current public website and enquiry process. Assignment-specific contracts may contain additional data protection information.",
          "Diese Hinweise beschreiben die aktuelle öffentliche Website und die Bearbeitung von Anfragen. Auftragsbezogene Verträge können zusätzliche Datenschutzinformationen enthalten.", "Este aviso describe el sitio web público actual y el proceso de gestión de consultas. Los contratos específicos de cada encargo pueden incluir información adicional sobre protección de datos.",
        )}</Notice>
      </LegalPage>
    </>
  );
}

export function CookiesPage() {
  const { t, locale, path } = useLocale();
  return (
    <>
      <PageMeta path="/cookies" />
      <LegalPage title={t("Cookie Information", "Cookie-Informationen", "Información sobre cookies")} intro={`${t("Last updated", "Zuletzt aktualisiert", "Última actualización")} ${policyDate(locale)}`}>
        <PolicySections sections={[
          {
            heading: ["Our current approach", "Unser derzeitiger Ansatz", "Nuestro enfoque actual"],
            paragraphs: [["This website does not currently use advertising cookies, behavioural tracking, social-media pixels or optional analytics. We have therefore not added a consent banner that would create an unnecessary interruption.", "Diese Website verwendet derzeit keine Werbe-Cookies, kein verhaltensbezogenes Tracking, keine Social-Media-Pixel und keine optionalen Analysefunktionen. Daher haben wir kein Einwilligungsbanner eingebunden, das zu einer unnötigen Unterbrechung führen würde.", "Este sitio web no utiliza actualmente cookies publicitarias, seguimiento del comportamiento, píxeles de redes sociales ni herramientas analíticas opcionales. Por ello, no hemos añadido un aviso de consentimiento que supondría una interrupción innecesaria."]],
          },
          {
            heading: ["Strictly necessary technology", "Unbedingt erforderliche Technologie", "Tecnología estrictamente necesaria"],
            paragraphs: [["The website host and security services may process limited technical information or use short-lived, strictly necessary technology to deliver pages, balance traffic, prevent abuse and protect forms. This technology is used to provide the service and cannot be switched off through a marketing preference panel.", "Der Hosting-Anbieter und die Sicherheitsdienste können begrenzte technische Informationen verarbeiten oder kurzlebige, unbedingt erforderliche Technologie einsetzen, um Seiten bereitzustellen, den Datenverkehr zu verteilen, Missbrauch zu verhindern und Formulare zu schützen. Diese Technologie dient der Bereitstellung des Dienstes und lässt sich nicht über Marketing-Einstellungen deaktivieren.", "El proveedor de alojamiento y los servicios de seguridad pueden tratar información técnica limitada o utilizar tecnología de corta duración y estrictamente necesaria para servir las páginas, distribuir el tráfico, evitar abusos y proteger los formularios. Esta tecnología se utiliza para prestar el servicio y no puede desactivarse mediante un panel de preferencias comerciales."]],
          },
          {
            heading: ["Contact forms", "Kontaktformulare", "Formularios de contacto"],
            paragraphs: [["Form submissions are delivered using Formspree. Its security controls may use necessary technical signals to identify automated or abusive traffic.", "Formularanfragen werden über Formspree übermittelt. Die Sicherheitsfunktionen dieses Dienstes können erforderliche technische Signale verwenden, um automatisierte oder missbräuchliche Zugriffe zu erkennen.", "Los formularios se envían a través de Formspree. Sus controles de seguridad pueden utilizar señales técnicas necesarias para identificar tráfico automatizado o abusivo."]],
          },
        ]} />
        <p>{t("Form contents and related processing are explained in our ", "Informationen zu Formularinhalten und ihrer Verarbeitung finden Sie in unseren ", "El contenido de los formularios y su tratamiento se explican en nuestro ")}<Link to={path("/privacy")}>{t("Privacy Notice", "Datenschutzhinweisen", "Aviso de privacidad")}</Link>.</p>
        <PolicySections sections={[
          {
            heading: ["If our use of cookies changes", "Wenn sich unsere Cookie-Nutzung ändert", "Si cambia nuestro uso de cookies"],
            paragraphs: [["We will update this page and, where required, introduce controls that allow users to accept, reject and manage non-essential technologies before they load. Optional categories will not be enabled by default.", "Wir aktualisieren diese Seite und führen, soweit erforderlich, Einstellungen ein, mit denen Sie nicht notwendige Technologien vor deren Laden akzeptieren, ablehnen und verwalten können. Optionale Kategorien werden nicht standardmäßig aktiviert.", "Actualizaremos esta página y, cuando sea necesario, incorporaremos controles que permitan aceptar, rechazar y gestionar tecnologías no esenciales antes de que se carguen. Las categorías opcionales no estarán activadas de forma predeterminada."]],
          },
        ]} />
      </LegalPage>
    </>
  );
}

export function LegalNoticePage() {
  const { t } = useLocale();
  const details: Array<{ label: Translation; value: string }> = [
    { label: ["Company name", "Unternehmensname", "Denominación social"], value: company.legalName },
    { label: ["Company number", "Unternehmensnummer", "Número de registro de la sociedad"], value: company.companyNumber },
    { label: ["Registered in", "Registriert in", "Registrada en"], value: t(company.registeredIn, "England und Wales", "Inglaterra y Gales") },
    { label: ["Registered office", "Eingetragener Sitz", "Domicilio social"], value: company.registeredOffice },
  ];
  return (
    <>
      <PageMeta path="/legal" />
      <LegalPage title={t("Legal Notice", "Impressum", "Aviso legal")} intro={t("Corporate identity and information about use of this website.", "Unternehmensangaben und Hinweise zur Nutzung dieser Website.", "Datos de la sociedad e información sobre el uso de este sitio web.")}>
        <section>
          <h2>{t("Website operator", "Betreiber der Website", "Titular del sitio web")}</h2>
          <dl className="company-details">
            {details.map((item) => <div key={item.label[0]}><dt>{t(...item.label)}</dt><dd>{item.value}</dd></div>)}
            <div><dt>{t("Email", "E-Mail", "Correo electrónico")}</dt><dd><a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a></dd></div>
          </dl>
        </section>
        <PolicySections sections={[
          {
            heading: ["General information only", "Allgemeine Informationen", "Información de carácter general"],
            paragraphs: [["Information on this website is general in nature and does not constitute legal, tax, immigration, employment-status or other regulated professional advice. Assignment-specific requirements should be assessed with appropriately qualified advisers.", "Die Informationen auf dieser Website sind allgemeiner Natur. Sie stellen keine Rechts-, Steuer-, Einwanderungs- oder Statusberatung und keine sonstige reglementierte Fachberatung dar. Auftragsspezifische Anforderungen sollten mit entsprechend qualifizierten Beratern geprüft werden.", "La información de este sitio web es de carácter general y no constituye asesoramiento jurídico, fiscal, migratorio, sobre la situación laboral ni de otras profesiones reguladas. Los requisitos específicos de cada encargo deben evaluarse con asesores debidamente cualificados."]],
          },
          {
            heading: ["Consultants and opportunities", "Fachleute und Einsatzmöglichkeiten", "Profesionales y oportunidades"],
            paragraphs: [
              ["References to consultants, specialists or professionals do not mean that every person is employed by DeepBridge. The status, contracting party, obligations and commercial terms of each engagement are defined in the applicable written agreement.", "Die Bezeichnung als Berater, Spezialist oder Fachkraft bedeutet nicht, dass jede Person bei DeepBridge angestellt ist. Status, Vertragspartner, Pflichten und kommerzielle Bedingungen jedes Einsatzes werden in der jeweils geltenden schriftlichen Vereinbarung festgelegt.", "Las referencias a consultores, especialistas o profesionales no significan que todas estas personas estén empleadas por DeepBridge. La condición profesional, la parte contratante, las obligaciones y las condiciones comerciales de cada encargo se definen en el acuerdo escrito correspondiente."],
              ["Joining the DeepBridge network does not guarantee an assignment or require either party to proceed. Published opportunities are subject to change, client confirmation and applicable contracting and compliance requirements.", "Die Aufnahme in das DeepBridge-Netzwerk garantiert keinen Auftrag und verpflichtet keine der Parteien zur Zusammenarbeit. Veröffentlichte Einsatzmöglichkeiten können sich ändern und stehen unter dem Vorbehalt der Bestätigung durch den Kunden sowie der geltenden vertraglichen und regulatorischen Anforderungen.", "La incorporación a la red de DeepBridge no garantiza un encargo ni obliga a ninguna de las partes a continuar. Las oportunidades publicadas pueden cambiar y están sujetas a la confirmación del cliente y a los requisitos de contratación y cumplimiento que resulten aplicables."],
            ],
          },
          {
            heading: ["Website content and links", "Website-Inhalte und Links", "Contenido y enlaces del sitio web"],
            paragraphs: [
              ["We aim to keep website information accurate and current but do not guarantee that every item will remain complete or available. Links to third-party websites are provided for convenience; DeepBridge is not responsible for their content or availability.", "Wir bemühen uns um korrekte und aktuelle Website-Informationen, garantieren jedoch nicht, dass alle Angaben vollständig oder dauerhaft verfügbar bleiben. Links zu Websites Dritter dienen der leichteren Information; DeepBridge ist für deren Inhalte oder Verfügbarkeit nicht verantwortlich.", "Procuramos que la información del sitio web sea precisa y esté actualizada, pero no garantizamos que todos sus contenidos permanezcan completos o disponibles. Los enlaces a sitios web de terceros se facilitan para comodidad del usuario; DeepBridge no es responsable de su contenido ni de su disponibilidad."],
              [`Unless stated otherwise, website text, design and brand material belong to ${company.legalName}. They may not be republished or used commercially without permission.`, `Soweit nicht anders angegeben, gehören die Texte, das Design und die Markenmaterialien der Website ${company.legalName}. Sie dürfen ohne Genehmigung nicht erneut veröffentlicht oder kommerziell genutzt werden.`, `Salvo que se indique lo contrario, los textos, el diseño y los materiales de marca del sitio web pertenecen a ${company.legalName}. No pueden volver a publicarse ni utilizarse con fines comerciales sin autorización.`],
            ],
          },
          {
            heading: ["Professional selection", "Professionelle Auswahl", "Selección profesional"],
            paragraphs: [["DeepBridge supports fair and professional selection processes and does not knowingly discriminate unlawfully in connection with the opportunities it manages.", "DeepBridge unterstützt faire und professionelle Auswahlverfahren und nimmt im Zusammenhang mit den betreuten Einsatzmöglichkeiten wissentlich keine rechtswidrige Diskriminierung vor.", "DeepBridge promueve procesos de selección justos y profesionales y no incurre deliberadamente en discriminación ilícita en relación con las oportunidades que gestiona."]],
          },
        ]} />
      </LegalPage>
    </>
  );
}

export function AccessibilityPage() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta path="/accessibility" />
      <LegalPage title={t("Accessibility", "Barrierefreiheit", "Accesibilidad")} intro={t("Our approach to an inclusive, usable website.", "Unser Ansatz für eine inklusive und gut nutzbare Website.", "Nuestro enfoque para un sitio web inclusivo y fácil de utilizar.")}>
        <PolicySections sections={[
          {
            heading: ["Our objective", "Unser Ziel", "Nuestro objetivo"],
            paragraphs: [["We aim to make this website usable by as many people as possible and have designed it with WCAG 2.2 Level AA principles in mind. This is an ongoing commitment rather than a claim that every future content change will be without issue.", "Wir möchten diese Website für möglichst viele Menschen nutzbar machen und haben ihre Gestaltung an den Grundsätzen der WCAG 2.2, Konformitätsstufe AA, ausgerichtet. Dies ist eine fortlaufende Aufgabe und keine Zusicherung, dass jede künftige Inhaltsänderung frei von Problemen sein wird.", "Nuestro objetivo es que el mayor número posible de personas pueda utilizar este sitio web, y lo hemos diseñado teniendo en cuenta los principios de las WCAG 2.2, nivel AA. Se trata de un compromiso continuo y no de una garantía de que todos los cambios futuros de contenido estarán libres de problemas."]],
          },
          {
            heading: ["What we have considered", "Was wir berücksichtigt haben", "Qué hemos tenido en cuenta"],
            bullets: [
              ["semantic page structure and logical heading order;", "semantische Seitenstruktur und logische Überschriftenfolge;", "una estructura semántica de las páginas y una jerarquía lógica de encabezados;"],
              ["keyboard navigation and visible focus indicators;", "Tastaturbedienung und sichtbare Fokusmarkierungen;", "la navegación mediante teclado e indicadores de foco visibles;"],
              ["a skip link and accessible mobile navigation;", "einen Sprunglink zum Hauptinhalt und eine zugängliche mobile Navigation;", "un enlace para saltar al contenido principal y una navegación móvil accesible;"],
              ["labels, required status and status messages for forms;", "Beschriftungen, Kennzeichnung von Pflichtfeldern und Statusmeldungen in Formularen;", "etiquetas, indicación de campos obligatorios y mensajes de estado en los formularios;"],
              ["colour contrast and information that does not rely on colour;", "Farbkontraste und Informationen, die nicht allein durch Farbe vermittelt werden;", "el contraste de colores e información que no depende únicamente del color;"],
              ["responsive layouts, text resizing and touch target size; and", "responsive Layouts, Textvergrößerung und ausreichend große Bedienelemente; sowie", "diseños adaptables, ampliación del texto y tamaño de los controles táctiles; y"],
              ["reduced-motion preferences.", "Einstellungen für reduzierte Bewegung.", "las preferencias de movimiento reducido."],
            ],
          },
          {
            heading: ["Known limitations", "Bekannte Einschränkungen", "Limitaciones conocidas"],
            paragraphs: [["Third-party form processing may display its own error or security interface in exceptional cases. Those interfaces are controlled by the service provider, although we aim to keep the primary website form clear and accessible.", "Die Formularverarbeitung durch Drittanbieter kann in Ausnahmefällen eigene Fehler- oder Sicherheitsoberflächen anzeigen. Diese Oberflächen werden vom jeweiligen Dienstleister kontrolliert. Wir bemühen uns, das eigentliche Website-Formular klar und zugänglich zu gestalten.", "El servicio externo de procesamiento de formularios puede mostrar su propia interfaz de error o seguridad en casos excepcionales. Estas interfaces dependen del proveedor del servicio, aunque procuramos que el formulario principal del sitio web sea claro y accesible."]],
          },
        ]} />
        <section>
          <h2>{t("Tell us about a problem", "Melden Sie uns ein Problem", "Comuníquenos un problema")}</h2>
          <p>{t("If you cannot access information or complete an enquiry, email ", "Wenn Sie Informationen nicht aufrufen oder eine Anfrage nicht abschließen können, schreiben Sie an ", "Si no puede acceder a la información o completar una consulta, escriba a ")}<a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>{t(". Please tell us which page caused difficulty and the format or adjustment that would help.", ". Bitte teilen Sie uns mit, welche Seite Schwierigkeiten verursacht und welches Format oder welche Anpassung Ihnen helfen würde.", ". Indique qué página le ha causado dificultades y qué formato o ajuste le resultaría útil.")}</p>
        </section>
      </LegalPage>
    </>
  );
}
