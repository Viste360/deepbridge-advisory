import { Link } from "react-router-dom";
import { PageMeta } from "../components/SiteShell";
import {
  ButtonLink,
  ExpertiseGrid,
  Notice,
  PageHero,
  ProcessSection,
  SectionHeading,
  SplitCta,
} from "../components/Ui";
import {
  clientInputs,
  clientServices,
  consultantExpectations,
  consultantInformation,
  consultantJourney,
  principles,
} from "../content/siteContent";

export function ExpertisePage() {
  return (
    <>
      <PageMeta path="/expertise" />
      <PageHero
        eyebrow="Expertise"
        title="Specialist capability where transformation gets complex."
        intro="DeepBridge focuses on the programme environments where operational context, technology and delivery discipline must work together."
        aside={
          <ButtonLink to="/contact?type=client">Discuss your requirement</ButtonLink>
        }
      />
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="Transformation capability"
            title="Four connected areas of expertise"
            text="We identify independent specialists whose experience is relevant to the workstream, industry setting and stage of delivery."
          />
          <ExpertiseGrid detailed />
        </div>
      </section>
      <section className="section outcome-section">
        <div className="shell outcome-grid">
          <div>
            <p className="eyebrow">Built around outcomes</p>
            <h2>Technology knowledge is only part of the requirement.</h2>
          </div>
          <div>
            <p>
              The strongest programme specialists understand how decisions move
              through an organisation: from operating model and process design
              to system configuration, data, adoption and day-to-day delivery.
            </p>
            <p>
              DeepBridge evaluates the context around a role as carefully as the
              keywords within it. That means considering stakeholders,
              programme maturity, industry complexity, working model and the
              deliverables that define success.
            </p>
          </div>
        </div>
      </section>
      <section className="section process-section">
        <div className="shell">
          <SectionHeading
            eyebrow="From need to delivery"
            title="A focused, selective process"
            text="The same clear route applies whether you need one workstream lead or several complementary project roles."
          />
          <ProcessSection compact />
        </div>
      </section>
      <SplitCta />
    </>
  );
}

export function ClientsPage() {
  return (
    <>
      <PageMeta path="/for-clients" />
      <PageHero
        eyebrow="For clients"
        title="Focused expertise for demanding programmes."
        intro="DeepBridge supports organisations that need experienced specialists without relying on high-volume candidate submissions."
        aside={
          <ButtonLink to="/contact?type=client">Discuss your requirement</ButtonLink>
        }
      />
      <section className="section">
        <div className="shell editorial-grid">
          <p className="eyebrow">A more relevant search</p>
          <div>
            <h2>Understand the work before introducing the person.</h2>
            <p className="lead-copy">
              We work to understand the project context before introducing
              professionals whose background, availability and working model
              are genuinely relevant.
            </p>
          </div>
        </div>
        <div className="shell service-grid">
          {clientServices.map((service, index) => (
            <article key={service.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section brief-section">
        <div className="shell brief-grid">
          <div>
            <p className="eyebrow">A useful starting brief</p>
            <h2>What we need to understand</h2>
            <p>
              The clearer the context at the beginning, the more selective and
              useful the search can be.
            </p>
          </div>
          <ul className="numbered-list">
            {clientInputs.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="section process-section">
        <div className="shell">
          <SectionHeading
            eyebrow="Client process"
            title="Clear steps. Continued involvement."
            text="DeepBridge stays close to the practical details from the first conversation through the assignment."
          />
          <ProcessSection />
          <Notice>
            Engagement structures, work authorisations and assignment-specific
            compliance requirements are reviewed as part of the contracting and
            onboarding process. Clients and consultants may need to obtain their
            own professional advice.
          </Notice>
        </div>
      </section>
      <section className="single-cta">
        <div className="shell">
          <p className="eyebrow">Start with the programme need</p>
          <h2>Tell us what has to be delivered.</h2>
          <p>
            Share the context, location, working model and target start date.
            We will come back with a clear next step.
          </p>
          <ButtonLink to="/contact?type=client">Discuss your requirement</ButtonLink>
        </div>
      </section>
    </>
  );
}

export function ConsultantsPage() {
  return (
    <>
      <PageMeta path="/for-consultants" />
      <PageHero
        eyebrow="For independent consultants"
        title="Work on meaningful transformation programmes."
        intro="DeepBridge works with experienced independent professionals across SAP, supply chain, business analysis, data and programme delivery."
        aside={
          <ButtonLink to="/contact?type=consultant">Join our network</ButtonLink>
        }
      />
      <section className="section">
        <div className="shell consultant-grid">
          <div>
            <p className="eyebrow">What to expect</p>
            <h2>A relevant opportunity should begin with a clear conversation.</h2>
            <p>
              We aim to present assignments clearly and avoid sending
              consultants into poorly defined processes.
            </p>
          </div>
          <ul className="expectation-list">
            {consultantExpectations.map((item) => (
              <li key={item}>
                <span aria-hidden="true">—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="section consultant-info-section">
        <div className="shell brief-grid">
          <div>
            <p className="eyebrow">Joining the network</p>
            <h2>The information we normally need</h2>
            <p>
              We ask only for information that helps us assess relevant
              opportunities. Sensitive onboarding documents should not be sent
              through the public website.
            </p>
          </div>
          <ul className="numbered-list">
            {consultantInformation.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="shell">
          <Notice>
            Joining the DeepBridge network does not create an employment
            relationship, guarantee an assignment or oblige either party to
            proceed with an opportunity. The status and terms of each
            engagement are defined in the applicable written agreement.
          </Notice>
          <p className="payment-note">
            Payment terms are confirmed in the applicable consultant agreement
            before an assignment begins.
          </p>
        </div>
      </section>
      <section className="section consultant-journey-section">
        <div className="shell">
          <SectionHeading
            eyebrow="How the relationship works"
            title="A clear route from introduction to engagement"
            text="Each stage is designed to keep context, expectations and communication clear."
          />
          <ol className="consultant-journey-grid">
            {consultantJourney.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="single-cta">
        <div className="shell">
          <p className="eyebrow">Your next programme</p>
          <h2>Make your expertise easier to place well.</h2>
          <p>
            Tell us where you are based, when you are available and the
            transformation work you do best.
          </p>
          <ButtonLink to="/contact?type=consultant">Join our network</ButtonLink>
        </div>
      </section>
    </>
  );
}

export function AboutPage() {
  return (
    <>
      <PageMeta path="/about" />
      <PageHero
        eyebrow="About DeepBridge"
        title="A more focused way to build transformation teams."
        intro="DeepBridge was created to close the gap between large-scale consulting models and high-volume recruitment."
        aside={<ButtonLink to="/contact">Start a conversation</ButtonLink>}
      />
      <section className="section story-section">
        <div className="shell story-grid">
          <p className="eyebrow">Why DeepBridge exists</p>
          <div>
            <p className="story-lead">
              Complex programmes often need highly specific expertise, but
              organisations do not always need another layer of process.
            </p>
            <p>
              They need someone who understands the requirement, knows where to
              search and stays involved after an introduction has been made.
            </p>
            <p>
              We work across the UK and Europe, bringing together organisations
              and experienced independent specialists in SAP, supply chain,
              data and business transformation.
            </p>
          </div>
        </div>
      </section>
      <section className="section principles-section">
        <div className="shell">
          <SectionHeading
            eyebrow="Our principles"
            title="How we choose to work"
            text="Simple standards that keep the focus on relevance, clarity and delivery."
          />
          <div className="principles-grid">
            {principles.map((principle, index) => (
              <article key={principle.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section international-section">
        <div className="shell international-grid">
          <div>
            <p className="eyebrow">International by design</p>
            <h2>Cross-border work needs local clarity.</h2>
          </div>
          <div>
            <p>
              European programmes often bring together organisations,
              consultants and work locations across several jurisdictions.
              DeepBridge helps align the practical details early while
              recognising that legal, tax, immigration and employment-status
              questions require appropriately qualified advice.
            </p>
            <Link className="text-link" to="/legal">
              Read our legal notice
              <span className="direction-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
      <SplitCta />
    </>
  );
}

export function OpportunitiesPage() {
  return (
    <>
      <PageMeta path="/opportunities" />
      <PageHero
        eyebrow="Current opportunities"
        title="Relevant assignments, shared with context."
        intro="We publish opportunities only when the project requirement is current and we are authorised to discuss it."
        aside={
          <ButtonLink to="/contact?type=consultant">Join our network</ButtonLink>
        }
      />
      <section className="section">
        <div className="shell empty-state">
          <span>Current status</span>
          <h2>No public opportunities are listed at present.</h2>
          <p>
            Some assignments are handled confidentially or directly through our
            specialist network. Joining the network allows us to consider your
            profile when a relevant requirement becomes available.
          </p>
          <div>
            <ButtonLink to="/contact?type=consultant">Share your profile</ButtonLink>
            <ButtonLink to="/for-consultants" variant="text">
              How we work with consultants
            </ButtonLink>
          </div>
        </div>
        <div className="shell opportunity-note">
          <Notice>
            All opportunities are subject to change, client confirmation and
            successful completion of applicable contracting and compliance
            requirements.
          </Notice>
        </div>
      </section>
    </>
  );
}

export function NotFoundPage() {
  return (
    <>
      <PageMeta path="/404" />
      <section className="not-found">
        <div className="shell">
          <p className="eyebrow">404 · Page not found</p>
          <h1>This route does not lead where you expected.</h1>
          <p>
            The page may have moved. Return home or go directly to the contact
            page.
          </p>
          <div className="hero-actions">
            <ButtonLink to="/">Return home</ButtonLink>
            <ButtonLink to="/contact" variant="secondary">
              Contact DeepBridge
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
