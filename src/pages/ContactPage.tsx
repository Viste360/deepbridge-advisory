import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import { PageHero } from "../components/Ui";
import { company, siteConfig } from "../config/site";
import {
  validateContactValue,
  type ContactValidationError,
} from "../content/contactValidation";
import { ContactSubmissionTimeoutError, submitContactEnquiry } from "../content/contactSubmission";
import { useLocale } from "../i18n";

type EnquiryType = "client" | "consultant" | "general";
type SubmitState = "idle" | "submitting" | "success" | "error";
type FormField = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  maxLength: number;
  multiline?: boolean;
};

function EnquiryForm({
  enquiryType,
  onTypeChange,
}: {
  enquiryType: EnquiryType;
  onTypeChange: (type: EnquiryType) => void;
}) {
  const { t, path, locale } = useLocale();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submissionTimedOut, setSubmissionTimedOut] = useState(false);
  const [errors, setErrors] = useState<Record<string, ContactValidationError>>({});
  const statusRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const submissionInProgress = useRef(false);
  const isProfessional = enquiryType === "consultant";
  const isClient = enquiryType === "client";
  const field = (id: string, label: string, options: Partial<FormField> = {}): FormField => ({
    id,
    label,
    maxLength: 160,
    ...options,
  });
  const fields = [
    field("name", t("Name", "Name", "Nombre"), { autoComplete: "name", required: true }),
    ...(isClient ? [field("company", t("Company", "Unternehmen", "Empresa"), { autoComplete: "organization", required: true })] : []),
    field("email", isClient ? t("Work email", "Geschäftliche E-Mail-Adresse", "Correo electrónico profesional") : t("Email", "E-Mail-Adresse", "Correo electrónico"), {
      type: "email", autoComplete: "email", required: true, maxLength: 254,
    }),
    ...(isClient ? [
      field("phone", t("Telephone", "Telefonnummer", "Teléfono"), { type: "tel", autoComplete: "tel", maxLength: 50 }),
      field("projectLocation", t("Project location", "Projektstandort", "Ubicación del proyecto"), {
        required: true, hint: t("City / country and any remote working arrangements.", "Stadt / Land und gegebenenfalls Remote-Arbeitsmodell.", "Ciudad / país y modalidad de trabajo a distancia, si procede."),
      }),
      field("expertiseRequired", t("Area of support", "Gewünschte Unterstützung", "Área de apoyo"), {
        required: true, hint: t("For example SAP, operations, supply chain, finance or project leadership.", "Zum Beispiel SAP, Operations, Supply Chain, Finance oder Projektführung.", "Por ejemplo, SAP, operaciones, cadena de suministro, finanzas o dirección de proyectos."),
      }),
      field("targetStartDate", t("Expected start", "Gewünschter Beginn", "Inicio previsto"), {
        hint: t("An approximate date or timeframe is enough.", "Ein ungefähres Datum oder ein Zeitraum genügt.", "Basta con indicar una fecha o un período aproximado."),
      }),
      field("expectedDuration", t("Expected duration", "Voraussichtliche Dauer", "Duración prevista")),
    ] : []),
    ...(isProfessional ? [
      field("currentLocation", t("Location", "Standort", "Ubicación"), { required: true, autoComplete: "address-level2" }),
      field("primaryExpertise", t("Areas of expertise", "Fachgebiete", "Áreas de especialización"), { required: true, maxLength: 500 }),
      field("languages", t("Languages", "Sprachkenntnisse", "Idiomas"), {
        required: true, hint: t("Please include your working proficiency.", "Bitte geben Sie auch Ihr jeweiliges Sprachniveau an.", "Indique también su nivel profesional en cada idioma."),
      }),
      field("availability", t("Availability", "Verfügbarkeit", "Disponibilidad"), {
        required: true, hint: t("Earliest start and preferred commitment.", "Frühester Beginn und gewünschter zeitlicher Umfang.", "Fecha de incorporación más temprana y dedicación preferida."),
      }),
      field("linkedin", t("LinkedIn profile", "LinkedIn-Profil", "Perfil de LinkedIn"), {
        type: "url", hint: t("Use the full web address, including https://.", "Bitte geben Sie die vollständige Webadresse einschließlich https:// an.", "Introduzca la dirección web completa, incluido https://."), maxLength: 500,
      }),
    ] : []),
    ...(enquiryType === "general" ? [field("company", t("Company", "Unternehmen", "Empresa"), { autoComplete: "organization" })] : []),
    field("message", isClient ? t("Brief project description", "Kurze Projektbeschreibung", "Breve descripción del proyecto") : isProfessional ? t("Additional information", "Weitere Informationen", "Información adicional") : t("Message", "Nachricht", "Mensaje"), {
      required: !isProfessional,
      multiline: true,
      maxLength: 3000,
      hint: t("Please do not include identity, bank, tax or confidential project information.", "Bitte übermitteln Sie keine Ausweis-, Bank- oder Steuerdaten und keine vertraulichen Projektinformationen.", "No incluya documentos de identidad, datos bancarios o fiscales ni información confidencial del proyecto."),
    }),
  ];

  function errorMessage(error: ContactValidationError) {
    switch (error) {
      case "required": return t("Please complete this field.", "Bitte füllen Sie dieses Feld aus.", "Complete este campo.");
      case "email": return t("Enter a valid email address, such as name@company.com.", "Bitte geben Sie eine gültige E-Mail-Adresse ein, zum Beispiel name@unternehmen.de.", "Introduzca una dirección de correo electrónico válida, como nombre@empresa.com.");
      case "url": return t("Enter a full web address, starting with https:// or http://.", "Bitte geben Sie eine vollständige Webadresse mit https:// oder http:// ein.", "Introduzca una dirección web completa que empiece por https:// o http://.");
      case "tooLong": return t("Please shorten your entry.", "Bitte kürzen Sie Ihre Eingabe.", "Reduzca la longitud del texto.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors: Record<string, ContactValidationError> = {};
    for (const current of fields) {
      const value = String(data.get(current.id) ?? "");
      const error = validateContactValue(value, current);
      if (error) nextErrors[current.id] = error;
      data.set(current.id, value.trim());
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSubmitState("idle");
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    submissionInProgress.current = true;
    setSubmissionTimedOut(false);
    setSubmitState("submitting");
    try {
      await submitContactEnquiry(siteConfig.formEndpoint, data);
      form.reset();
      setSubmitState("success");
    } catch (error) {
      setSubmissionTimedOut(error instanceof ContactSubmissionTimeoutError);
      setSubmitState("error");
    } finally {
      submissionInProgress.current = false;
      window.requestAnimationFrame(() => statusRef.current?.focus());
    }
  }

  const choices: Array<{ value: EnquiryType; label: string; detail: string }> = [
    { value: "client", label: t("Discuss a project", "Projekt besprechen", "Hablemos de un proyecto"), detail: t("Share your assignment and support needs.", "Beschreiben Sie Ihre Aufgabe und Ihren Unterstützungsbedarf.", "Describa el encargo y el apoyo que necesita.") },
    { value: "consultant", label: t("Join the professional network", "Expertennetzwerk beitreten", "Unirse a la red de profesionales"), detail: t("Introduce your expertise and availability.", "Stellen Sie Ihre Expertise und Verfügbarkeit vor.", "Presente su especialización y disponibilidad.") },
    ...(enquiryType === "general" ? [{ value: "general" as const, label: t("General enquiry", "Allgemeine Anfrage", "Consulta general"), detail: t("Start a conversation with DeepBridge.", "Nehmen Sie Kontakt mit DeepBridge auf.", "Póngase en contacto con DeepBridge.") }] : []),
  ];

  return (
    <form
      id="contact-form"
      className="contact-form"
      tabIndex={-1}
      onSubmit={handleSubmit}
      action={siteConfig.formEndpoint}
      method="post"
      noValidate
      acceptCharset="UTF-8"
      aria-busy={submitState === "submitting"}
      aria-label={isProfessional ? t("Professional network enquiry", "Anfrage zum Expertennetzwerk", "Consulta sobre la red de profesionales") : isClient ? t("Project enquiry", "Projektanfrage", "Consulta sobre un proyecto") : t("General enquiry", "Allgemeine Anfrage", "Consulta general")}
    >
      <input type="hidden" name="enquiryType" value={enquiryType} />
      <input type="hidden" name="language" value={locale} />
      <input type="hidden" name="_subject" value={`New ${enquiryType} enquiry — DeepBridge Advisory`} />
      <div className="form-honeypot" aria-hidden="true">
        <label htmlFor="website">{t("Website", "Website", "Sitio web")}</label>
        <input id="website" name="_gotcha" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <fieldset className="enquiry-choice">
        <legend>{t("How can we help?", "Wie können wir Sie unterstützen?", "¿Cómo podemos ayudarle?")}</legend>
        <div>
          {choices.map((choice) => (
            <button id={`enquiry-type-${choice.value}`} key={choice.value} className={enquiryType === choice.value ? "is-selected" : undefined} type="button" aria-pressed={enquiryType === choice.value} disabled={submitState === "submitting"} onClick={() => onTypeChange(choice.value)}>
              <span>{choice.label}</span>
              <small>{choice.detail}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <p className="form-instructions">{t("Fields marked ‘required’ are needed to review your enquiry.", "Die als „Pflichtfeld“ gekennzeichneten Angaben benötigen wir zur Bearbeitung Ihrer Anfrage.", "Los campos marcados como «obligatorio» son necesarios para atender su consulta.")}</p>
      {Object.keys(errors).length > 0 && (
        <div className="form-status is-error form-error-summary" ref={errorRef} tabIndex={-1} role="alert">
          <p><strong>{t("Please check the following fields:", "Bitte prüfen Sie die folgenden Felder:", "Revise los siguientes campos:")}</strong></p>
          <ul>{fields.filter((current) => errors[current.id]).map((current) => (
            <li key={current.id}><a href={`#${current.id}`} onClick={(event) => {
              event.preventDefault();
              document.getElementById(current.id)?.focus();
            }}>{current.label}: {errorMessage(errors[current.id])}</a></li>
          ))}</ul>
        </div>
      )}
      <div className="form-grid">
        {fields.map((current) => {
          const error = errors[current.id];
          const describedBy = [current.hint ? `${current.id}-hint` : "", error ? `${current.id}-error` : ""].filter(Boolean).join(" ") || undefined;
          const inputProps = {
            id: current.id,
            name: current.id,
            required: current.required,
            disabled: submitState === "submitting",
            maxLength: current.maxLength,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true as const : undefined,
            onChange: () => {
              if (error) setErrors((previous) => {
                const next = { ...previous };
                delete next[current.id];
                return next;
              });
            },
          };
          return (
            <div className={`field${current.multiline ? " field-full" : ""}`} key={current.id}>
              <label htmlFor={current.id}>{current.label} <span className="field-requirement">({current.required ? t("required", "Pflichtfeld", "obligatorio") : t("optional", "optional", "opcional")})</span></label>
              {current.multiline ? <textarea {...inputProps} rows={5} /> : <input {...inputProps} type={current.type ?? "text"} autoComplete={current.autoComplete} />}
              {current.hint && <span className="field-hint" id={`${current.id}-hint`}>{current.hint}</span>}
              {error && <span className="field-error" id={`${current.id}-error`}>{errorMessage(error)}</span>}
            </div>
          );
        })}
      </div>
      <p className="privacy-inline">
        {t("We use your information to respond to your enquiry and, where relevant, assess potential project opportunities. Read our ", "Wir verwenden Ihre Angaben, um Ihre Anfrage zu beantworten und gegebenenfalls passende Projekte zu prüfen. Weitere Informationen finden Sie in unseren ", "Utilizamos sus datos para responder a su consulta y, cuando corresponda, valorar posibles oportunidades de proyecto. Consulte nuestro ")}
        <Link to={path("/privacy")}>{t("Privacy Notice", "Datenschutzhinweisen", "Aviso de privacidad")}</Link>.
      </p>
      <button className="button button-primary submit-button" type="submit" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? t("Sending…", "Wird gesendet …", "Enviando…") : isProfessional ? t("Introduce yourself", "Profil vorstellen", "Presente su perfil") : isClient ? t("Discuss your project", "Projekt besprechen", "Hablemos de su proyecto") : t("Send enquiry", "Anfrage senden", "Enviar consulta")}
        <span className="direction-arrow" aria-hidden="true">→</span>
      </button>
      {submitState !== "idle" && (
        <div ref={statusRef} className={`form-status is-${submitState}`} role={submitState === "error" ? "alert" : "status"} tabIndex={-1}>
          {submitState === "submitting" && t("Sending your enquiry…", "Ihre Anfrage wird gesendet …", "Enviando su consulta…")}
          {submitState === "success" && (isProfessional
            ? t("Thank you. We have received your introduction and will review your expertise and availability. We will contact you directly if there is a relevant next step.", "Vielen Dank. Wir haben Ihre Angaben erhalten und prüfen Ihre Expertise und Verfügbarkeit. Wenn sich ein passender nächster Schritt ergibt, kontaktieren wir Sie direkt.", "Gracias. Hemos recibido su presentación y revisaremos su especialización y disponibilidad. Nos pondremos en contacto con usted si surge una oportunidad de avanzar.")
            : t("Thank you. Your enquiry has been received. DeepBridge will review the information and respond directly to discuss the next step.", "Vielen Dank. Ihre Anfrage ist eingegangen. DeepBridge prüft Ihre Angaben und meldet sich direkt bei Ihnen, um den nächsten Schritt zu besprechen.", "Gracias. Hemos recibido su consulta. DeepBridge revisará la información y se pondrá en contacto con usted para acordar el siguiente paso."))}
          {submitState === "error" && <>{submissionTimedOut
            ? t("The connection timed out before we could confirm delivery. Your entries are still here. To check whether your enquiry arrived, email ", "Die Verbindung wurde wegen Zeitüberschreitung beendet, bevor wir den Eingang bestätigen konnten. Ihre Eingaben bleiben erhalten. Bitte fragen Sie nach, ob Ihre Anfrage eingegangen ist, unter ", "La conexión ha agotado el tiempo de espera antes de que pudiéramos confirmar la recepción. Sus datos siguen en el formulario. Para comprobar si su consulta ha llegado, escriba a ")
            : t("We could not confirm delivery of your enquiry. Your entries are still here. Please try again or email ", "Wir konnten den Eingang Ihrer Anfrage nicht bestätigen. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut oder schreiben Sie an ", "No hemos podido confirmar la recepción de su consulta. Sus datos siguen en el formulario. Inténtelo de nuevo o escriba a ")}<a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>.</>}
        </div>
      )}
    </form>
  );
}

export function ContactPage() {
  const { t, path } = useLocale();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedType = searchParams.get("type");
  const enquiryType: EnquiryType = requestedType === "consultant" || requestedType === "general" ? requestedType : "client";

  return (
    <>
      <PageMeta path="/contact" />
      <PageHero
        eyebrow={t("Contact", "Kontakt", "Contacto")}
        title={enquiryType === "consultant" ? t("Bring your expertise to the conversation.", "Bringen Sie Ihre Expertise ein.", "Hablemos de su experiencia.") : t("What does your project need next?", "Was braucht Ihr Projekt als Nächstes?", "¿Cuál es el siguiente paso para su proyecto?")}
        intro={enquiryType === "consultant" ? t("Tell us about your experience, languages and availability so we can understand which assignments may suit you.", "Beschreiben Sie Ihre Erfahrung, Sprachkenntnisse und Verfügbarkeit, damit wir passende Einsatzmöglichkeiten einschätzen können.", "Cuéntenos su experiencia, idiomas y disponibilidad para que podamos valorar qué encargos pueden encajar con su perfil.") : t("Tell us about the assignment, the operating challenge and the expertise you need. We will help clarify the next step.", "Beschreiben Sie uns die Aufgabe, die operative Herausforderung und die benötigte Expertise. Gemeinsam klären wir den nächsten Schritt.", "Describa el encargo, el reto operativo y la experiencia que necesita. Le ayudaremos a definir el siguiente paso.")}
      />
      <section className="section contact-section">
        <div className="shell contact-layout">
          <aside className="contact-aside">
            <p className="eyebrow">{t("Direct contact", "Direkter Kontakt", "Contacto directo")}</p>
            <h2>{t("A conversation with DeepBridge.", "Im Gespräch mit DeepBridge.", "Converse con DeepBridge.")}</h2>
            <p>{t("Your enquiry goes to DeepBridge for review. We use it to understand your needs and discuss the next step.", "Ihre Anfrage wird von DeepBridge geprüft. Sie hilft uns, Ihren Bedarf zu verstehen und den nächsten Schritt mit Ihnen abzustimmen.", "DeepBridge revisa su consulta para comprender sus necesidades y acordar con usted el siguiente paso.")}</p>
            <div className="contact-details">
              <div><span>{t("Email", "E-Mail", "Correo electrónico")}</span><a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a></div>
              <div><span>{t("European focus", "Europäischer Fokus", "Enfoque europeo")}</span><p>{t("London · Munich · Madrid", "London · München · Madrid", "Londres · Múnich · Madrid")}</p></div>
              <div><span>{t("Your information", "Ihre Angaben", "Sus datos")}</span><p>{t("Submitting an enquiry does not add you to a marketing list.", "Durch Ihre Anfrage werden Sie nicht in eine Marketing-Verteilerliste aufgenommen.", "El envío de una consulta no implica su inclusión en una lista de comunicaciones comerciales.")}</p></div>
            </div>
            <p><Link to={path("/contact?type=general#contact-form")}>{t("Have a general enquiry?", "Sie haben eine allgemeine Anfrage?", "¿Tiene una consulta general?")}</Link></p>
          </aside>
          <EnquiryForm key={enquiryType} enquiryType={enquiryType} onTypeChange={(type) => {
            if (type === enquiryType) return;
            const next = new URLSearchParams(searchParams);
            next.set("type", type);
            navigate({ pathname: location.pathname, search: `?${next}`, hash: location.hash }, {
              replace: true,
              preventScrollReset: true,
              state: { preserveScroll: true, focusId: `enquiry-type-${type}` },
            });
          }} />
        </div>
      </section>
    </>
  );
}
