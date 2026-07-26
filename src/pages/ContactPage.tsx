import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import { PageHero } from "../components/Ui";
import { company, siteConfig } from "../config/site";

type EnquiryType = "client" | "consultant" | "general";
type SubmitState = "idle" | "submitting" | "success" | "error";

const enquiryOptions: Array<{
  value: EnquiryType;
  label: string;
  detail: string;
}> = [
  {
    value: "client",
    label: "I need project support",
    detail: "Discuss a specialist or programme requirement.",
  },
  {
    value: "consultant",
    label: "I am an independent consultant",
    detail: "Introduce your expertise and availability.",
  },
  {
    value: "general",
    label: "General enquiry",
    detail: "Ask a question or start a broader conversation.",
  },
];

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required,
  hint,
  maxLength,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {hint && (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      )}
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-describedby={hintId}
        maxLength={maxLength ?? (type === "email" ? 254 : 160)}
      />
    </div>
  );
}

export function ContactPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const initialType: EnquiryType =
    requestedType === "consultant" || requestedType === "general"
      ? requestedType
      : "client";
  const enquiryType = initialType;
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const statusRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setSubmitState("submitting");
    setSubmitMessage("Sending your enquiry…");

    try {
      const response = await fetch(siteConfig.formEndpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Form submission failed");

      form.reset();
      setSubmitState("success");
      setSubmitMessage(
        "Thank you. Your enquiry has been received and we will respond directly.",
      );
    } catch {
      setSubmitState("error");
      setSubmitMessage(
        `We could not send the form. Please email ${company.contactEmail} instead.`,
      );
    }

    window.requestAnimationFrame(() => statusRef.current?.focus());
  }

  return (
    <>
      <PageMeta path="/contact" />
      <PageHero
        eyebrow="Contact"
        title="Start with the requirement. We will take it from there."
        intro="Choose the reason for your enquiry and share only the information needed for a useful first conversation."
      />
      <section className="section contact-section">
        <div className="shell contact-layout">
          <aside className="contact-aside">
            <p className="eyebrow">Direct contact</p>
            <h2>A considered response, not an automated funnel.</h2>
            <p>
              Your message goes to DeepBridge for review. We do not add contact
              form users to a marketing list.
            </p>
            <div className="contact-details">
              <div>
                <span>Email</span>
                <a href={`mailto:${company.contactEmail}`}>
                  {company.contactEmail}
                </a>
              </div>
              <div>
                <span>Coverage</span>
                <p>United Kingdom and Europe</p>
              </div>
              <div>
                <span>Response</span>
                <p>Direct review by DeepBridge</p>
              </div>
            </div>
          </aside>

          <form
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
            acceptCharset="UTF-8"
            aria-busy={submitState === "submitting"}
            aria-label="DeepBridge Advisory enquiry form"
          >
            <input type="hidden" name="enquiryType" value={enquiryType} />
            <input
              type="hidden"
              name="_subject"
              value={`New ${enquiryType} enquiry — DeepBridge Advisory`}
              readOnly
            />
            <div className="form-honeypot" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="_gotcha"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <fieldset className="enquiry-choice">
              <legend>What can we help with?</legend>
              <div>
                {enquiryOptions.map((option) => (
                  <button
                    key={option.value}
                    className={
                      enquiryType === option.value ? "is-selected" : undefined
                    }
                    type="button"
                    aria-pressed={enquiryType === option.value}
                    disabled={submitState === "submitting"}
                    onClick={() => {
                      setSearchParams({ type: option.value }, { replace: true });
                      setSubmitState("idle");
                      setSubmitMessage("");
                    }}
                  >
                    <span>{option.label}</span>
                    <small>{option.detail}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="form-grid">
              <Field
                id="name"
                label="Name"
                autoComplete="name"
                required
              />
              <Field
                id="email"
                label={enquiryType === "client" ? "Work email" : "Email"}
                type="email"
                autoComplete="email"
                required
              />

              {enquiryType === "client" && (
                <>
                  <Field
                    id="company"
                    label="Company"
                    autoComplete="organization"
                    required
                  />
                  <Field
                    id="expertiseRequired"
                    label="Role or expertise required"
                    required
                  />
                  <Field
                    id="projectLocation"
                    label="Project location"
                    autoComplete="country-name"
                    required
                  />
                  <Field
                    id="targetStartDate"
                    label="Target start date"
                    type="date"
                  />
                </>
              )}

              {enquiryType === "consultant" && (
                <>
                  <Field
                    id="currentLocation"
                    label="Current location"
                    autoComplete="country-name"
                    required
                  />
                  <Field
                    id="primaryExpertise"
                    label="Primary expertise"
                    required
                  />
                  <Field id="availability" label="Availability" required />
                  <Field
                    id="linkedin"
                    label="LinkedIn profile"
                    type="url"
                    hint="Please use a full https:// address."
                    maxLength={500}
                  />
                </>
              )}

              {enquiryType === "general" && (
                <Field
                  id="company"
                  label="Company"
                  autoComplete="organization"
                />
              )}

              <div className="field field-full">
                <label htmlFor="message">
                  Message <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={7}
                  maxLength={3000}
                  aria-describedby="message-hint"
                />
                <span className="field-hint" id="message-hint">
                  Do not include passport, identity, bank or tax information.
                </span>
              </div>
            </div>

            <p className="privacy-inline">
              We will use the information you provide to respond to your
              enquiry and, where relevant, assess potential project
              opportunities. Please review our{" "}
              <Link to="/privacy">Privacy Notice</Link> for further information.
            </p>

            <button
              className="button button-primary submit-button"
              type="submit"
              disabled={submitState === "submitting"}
            >
              {submitState === "submitting"
                ? "Sending…"
                : enquiryType === "consultant"
                  ? "Join our network"
                  : enquiryType === "client"
                    ? "Discuss your requirement"
                    : "Send enquiry"}{" "}
              <span aria-hidden="true">↗</span>
            </button>

            {submitMessage && (
              <div
                ref={statusRef}
                className={`form-status is-${submitState}`}
                role={submitState === "error" ? "alert" : "status"}
                tabIndex={-1}
              >
                {submitMessage}
              </div>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
