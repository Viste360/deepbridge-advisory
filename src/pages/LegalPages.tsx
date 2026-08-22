import { PageMeta } from "../components/SiteShell";
import { LegalPage, Notice } from "../components/Ui";
import { company, siteConfig } from "../config/site";

export function PrivacyPage() {
  return (
    <>
      <PageMeta path="/privacy" />
      <LegalPage
        title="Privacy Notice"
        intro={`Version ${siteConfig.privacyVersion} · Last updated ${siteConfig.privacyUpdated}`}
      >
        <section>
          <h2>Who is responsible for your information</h2>
          <p>
            {company.tradingName} is operated by {company.legalName}, company
            number {company.companyNumber}, registered in {company.registeredIn}.
            For website and enquiry information, {company.legalName} acts as the
            data controller.
          </p>
          <p>
            You can contact us about privacy at{" "}
            <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>{" "}
            or by writing to {company.registeredOffice}.
          </p>
        </section>

        <section>
          <h2>Information we collect</h2>
          <p>Depending on how you interact with DeepBridge, this may include:</p>
          <ul>
            <li>
              contact and professional information supplied through an enquiry;
            </li>
            <li>
              client organisation, role, programme and requirement details;
            </li>
            <li>
              consultant location, expertise, availability, professional
              profile and commercial expectations;
            </li>
            <li>
              correspondence, interview and engagement records created through
              our relationship; and
            </li>
            <li>
              limited technical information required to deliver and protect the
              website.
            </li>
          </ul>
          <p>
            We may obtain information directly from you, from a client or
            consultant involved in an assignment, from professional networking
            services, or from publicly available professional sources. We do
            not ask for identity, banking or tax documents through the public
            website.
          </p>
        </section>

        <section>
          <h2>How and why we use information</h2>
          <div className="legal-table" role="table" aria-label="Data uses">
            <div role="row">
              <strong role="cell">Purpose</strong>
              <strong role="cell">Typical lawful basis</strong>
            </div>
            <div role="row">
              <span role="cell">Responding to enquiries</span>
              <span role="cell">
                Legitimate interests and steps requested before a contract
              </span>
            </div>
            <div role="row">
              <span role="cell">
                Assessing consultant suitability and relevant opportunities
              </span>
              <span role="cell">
                Legitimate interests and steps requested before a contract
              </span>
            </div>
            <div role="row">
              <span role="cell">
                Coordinating introductions, contracting and assignments
              </span>
              <span role="cell">
                Contract, legitimate interests and legal obligations
              </span>
            </div>
            <div role="row">
              <span role="cell">Protecting the website and our business</span>
              <span role="cell">Legitimate interests and legal obligations</span>
            </div>
            <div role="row">
              <span role="cell">Optional marketing, if introduced</span>
              <span role="cell">
                Consent or legitimate interests, as applicable, with an
                unsubscribe option
              </span>
            </div>
          </div>
          <p>
            Our legitimate interests include operating a specialist advisory
            business, understanding genuine project needs, maintaining relevant
            professional relationships and protecting our services. We balance
            these interests against the rights and expectations of individuals.
          </p>
        </section>

        <section>
          <h2>Who receives information</h2>
          <p>
            We share information only where relevant and proportionate. This may
            include a client considering a consultant, a consultant considering
            an assignment, professional advisers, and service providers that
            support hosting, communications and form delivery.
          </p>
          <p>
            The website is hosted using infrastructure supplied by Vercel or a
            replacement hosting provider selected by DeepBridge. Public forms
            are processed through Formspree before being delivered to
            DeepBridge. These providers process information under their own
            contractual security and privacy arrangements.
          </p>
          <p>
            We do not sell personal information and do not add people to
            marketing lists merely because they submitted an enquiry.
          </p>
        </section>

        <section>
          <h2>International transfers</h2>
          <p>
            DeepBridge supports international work across the UK, Europe and the
            Americas, and some service providers may process information in
            other countries. Where personal information is transferred outside
            the UK or European Economic Area, the parties responsible for the
            transfer should use an appropriate safeguard, such as an adequacy
            decision or approved contractual clauses, where required.
          </p>
        </section>

        <section>
          <h2>How long we keep information</h2>
          <p>
            Information is retained according to its purpose, the continuing
            relevance of the professional relationship, any active enquiry or
            assignment, and applicable contractual, tax, legal or dispute
            requirements. We periodically review contact and professional
            profile information and delete or anonymise it when there is no
            longer a reasonable business or legal need to retain it.
          </p>
          <p>
            You may ask us to review, correct or delete your information at any
            time. Some records may need to be retained where a legal obligation
            or an ongoing contractual need applies.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            Depending on the circumstances and applicable law, you may have the
            right to access, correct, erase or restrict personal information;
            object to processing; receive portable data; or withdraw consent
            where consent is relied upon. You also have the right to complain
            to the UK Information Commissioner&apos;s Office or another
            supervisory authority that is relevant to your location.
          </p>
          <p>
            We do not use website enquiries for solely automated decisions or
            profiling that produce legal or similarly significant effects.
          </p>
        </section>

        <section>
          <h2>Contacting us</h2>
          <p>
            To exercise a right or ask a privacy question, email{" "}
            <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>
            . We may need to confirm your identity before acting on a request,
            but we will not ask you to send sensitive identity documents through
            the public contact form.
          </p>
        </section>

        <Notice>
          This notice describes the current public website and enquiry process.
          Assignment-specific contracts may contain additional data protection
          information.
        </Notice>
      </LegalPage>
    </>
  );
}

export function CookiesPage() {
  return (
    <>
      <PageMeta path="/cookies" />
      <LegalPage
        title="Cookie Information"
        intro={`Last updated ${siteConfig.privacyUpdated}`}
      >
        <section>
          <h2>Our current approach</h2>
          <p>
            This website does not currently use advertising cookies, behavioural
            tracking, social-media pixels or optional analytics. We have
            therefore not added a consent banner that would create an
            unnecessary interruption.
          </p>
        </section>
        <section>
          <h2>Strictly necessary technology</h2>
          <p>
            The website host and security services may process limited
            technical information or use short-lived, strictly necessary
            technology to deliver pages, balance traffic, prevent abuse and
            protect forms. This technology is used to provide the service and
            cannot be switched off through a marketing preference panel.
          </p>
        </section>
        <section>
          <h2>Contact forms</h2>
          <p>
            Form submissions are delivered using Formspree. Its security
            controls may use necessary technical signals to identify automated
            or abusive traffic. Form contents and related processing are
            explained in our Privacy Notice.
          </p>
        </section>
        <section>
          <h2>If our use of cookies changes</h2>
          <p>
            We will update this page and, where required, introduce controls
            that allow users to accept, reject and manage non-essential
            technologies before they load. Optional categories will not be
            enabled by default.
          </p>
        </section>
      </LegalPage>
    </>
  );
}

export function LegalNoticePage() {
  return (
    <>
      <PageMeta path="/legal" />
      <LegalPage
        title="Legal Notice"
        intro="Corporate identity and information about use of this website."
      >
        <section>
          <h2>Website operator</h2>
          <dl className="company-details">
            <div>
              <dt>Trading name</dt>
              <dd>{company.tradingName}</dd>
            </div>
            <div>
              <dt>Legal entity</dt>
              <dd>{company.legalName}</dd>
            </div>
            <div>
              <dt>Company number</dt>
              <dd>{company.companyNumber}</dd>
            </div>
            <div>
              <dt>Registered in</dt>
              <dd>{company.registeredIn}</dd>
            </div>
            <div>
              <dt>Registered office</dt>
              <dd>{company.registeredOffice}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${company.contactEmail}`}>
                  {company.contactEmail}
                </a>
              </dd>
            </div>
          </dl>
        </section>
        <section>
          <h2>General information only</h2>
          <p>
            Information on this website is general in nature and does not
            constitute legal, tax, immigration, employment-status or other
            regulated professional advice. Assignment-specific requirements
            should be assessed with appropriately qualified advisers.
          </p>
        </section>
        <section>
          <h2>Consultants and opportunities</h2>
          <p>
            References to consultants, specialists or professionals do not mean
            that every person is employed by DeepBridge. The status, contracting
            party, obligations and commercial terms of each engagement are
            defined in the applicable written agreement.
          </p>
          <p>
            Joining the DeepBridge network does not guarantee an assignment or
            require either party to proceed. Published opportunities are
            subject to change, client confirmation and applicable contracting
            and compliance requirements.
          </p>
        </section>
        <section>
          <h2>Website content and links</h2>
          <p>
            We aim to keep website information accurate and current but do not
            guarantee that every item will remain complete or available. Links
            to third-party websites are provided for convenience; DeepBridge is
            not responsible for their content or availability.
          </p>
          <p>
            Unless stated otherwise, website text, design and brand material
            belong to {company.legalName}. They may not be republished or used
            commercially without permission.
          </p>
        </section>
        <section>
          <h2>Professional selection</h2>
          <p>
            DeepBridge supports fair and professional selection processes and
            does not knowingly discriminate unlawfully in connection with the
            opportunities it manages.
          </p>
        </section>
      </LegalPage>
    </>
  );
}

export function AccessibilityPage() {
  return (
    <>
      <PageMeta path="/accessibility" />
      <LegalPage
        title="Accessibility"
        intro="Our approach to an inclusive, usable website."
      >
        <section>
          <h2>Our objective</h2>
          <p>
            We aim to make this website usable by as many people as possible and
            have designed it with WCAG 2.2 Level AA principles in mind. This is
            an ongoing commitment rather than a claim that every future content
            change will be without issue.
          </p>
        </section>
        <section>
          <h2>What we have considered</h2>
          <ul>
            <li>semantic page structure and logical heading order;</li>
            <li>keyboard navigation and visible focus indicators;</li>
            <li>a skip link and accessible mobile navigation;</li>
            <li>labels, required status and status messages for forms;</li>
            <li>colour contrast and information that does not rely on colour;</li>
            <li>responsive layouts, text resizing and touch target size; and</li>
            <li>reduced-motion preferences.</li>
          </ul>
        </section>
        <section>
          <h2>Known limitations</h2>
          <p>
            Third-party form processing may display its own error or security
            interface in exceptional cases. Those interfaces are controlled by
            the service provider, although we aim to keep the primary website
            form clear and accessible.
          </p>
        </section>
        <section>
          <h2>Tell us about a problem</h2>
          <p>
            If you cannot access information or complete an enquiry, email{" "}
            <a href={`mailto:${company.contactEmail}`}>
              {company.contactEmail}
            </a>
            . Please tell us which page caused difficulty and the format or
            adjustment that would help.
          </p>
        </section>
      </LegalPage>
    </>
  );
}
