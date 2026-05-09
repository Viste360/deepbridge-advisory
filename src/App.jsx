import React from "react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function Container({ children, className = "" }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function DeepBridgeLogo({ className = "" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="8" y="8" width="104" height="104" rx="28" fill="url(#bg)" />
      <path d="M38 32H60C76 32 86 42 86 58C86 74 76 84 60 84H38V32Z" fill="white" fillOpacity="0.96" />
      <path d="M54 46H63C71 46 76 50 76 58C76 66 71 70 63 70H54V46Z" fill="#67E8F9" />
      <path d="M42 92L84 28" stroke="#67E8F9" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.9" />
      <defs>
        <linearGradient id="bg" x1="12" y1="12" x2="108" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ArrowIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SimpleIcon({ label, className = "" }) {
  return <span className={`inline-flex items-center justify-center font-semibold ${className}`} aria-hidden="true">{label}</span>;
}

function Button({ children, href, variant = "primary", className = "" }) {
  const base = "inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2";
  const styles =
    variant === "outline"
      ? "border border-white/20 bg-white/5 text-white hover:bg-white/10"
      : variant === "dark"
        ? "bg-slate-950 text-white hover:bg-slate-800"
        : "bg-cyan-300 text-slate-950 hover:bg-cyan-200";

  return <a href={href} className={`${base} ${styles} ${className}`}>{children}</a>;
}

function SectionHeader({ eyebrow, title, description, align = "center", dark = false }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={`max-w-3xl ${align === "left" ? "text-left" : "mx-auto text-center"}`}
    >
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-600">{eyebrow}</p>
      <h2 className={`text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl ${dark ? "text-white" : "text-slate-950"}`}>{title}</h2>
      <p className={`mt-5 text-base leading-8 sm:text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}>{description}</p>
    </motion.div>
  );
}

function FeatureCard({ label, title, description, dark = false }) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.5, ease: "easeOut" }}>
      <div className={`h-full rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 ${dark ? "border-white/10 bg-white/[0.06] hover:bg-white/[0.09]" : "border-slate-200 bg-white shadow-sm hover:border-cyan-200 hover:shadow-xl hover:shadow-slate-200/70"}`}>
        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${dark ? "bg-cyan-300 text-slate-950" : "bg-slate-950 text-cyan-300"}`}>
          <SimpleIcon label={label} className="h-5 w-5 text-sm" />
        </div>
        <h3 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-950"}`}>{title}</h3>
        <p className={`mt-3 text-sm leading-7 ${dark ? "text-slate-300" : "text-slate-600"}`}>{description}</p>
      </div>
    </motion.div>
  );
}

function HeroVisual() {
  const nodes = [
    ["Project Need", "left-6 top-8"],
    ["Senior Profile", "right-6 top-16"],
    ["Business Fit", "left-10 bottom-12"],
    ["Delivery", "right-10 bottom-8"],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
      className="relative mx-auto mt-12 aspect-square w-full max-w-[520px] lg:mt-0"
      aria-label="Consultant matching workflow visual"
    >
      <div className="absolute inset-0 rounded-[2.5rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-cyan-950/40 backdrop-blur" />
      <div className="absolute inset-8 rounded-[2rem] border border-cyan-300/20 bg-slate-900/60" />
      <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 shadow-2xl shadow-cyan-400/20">
        <div className="h-10 w-10 rounded-full border border-cyan-200/70 p-2">
          <div className="h-full w-full rounded-full bg-cyan-200/70" />
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 h-[72%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-300/40 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
      {nodes.map(([label, position]) => (
        <div key={label} className={`absolute ${position} rounded-2xl border border-white/12 bg-slate-950/80 px-4 py-3 shadow-xl backdrop-blur`}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">{label}</p>
        </div>
      ))}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-cyan-300" /> Business-first matching
      </div>
    </motion.div>
  );
}

function Field({ id, label, type = "text", placeholder, autoComplete, required = false }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </div>
  );
}

const clientNeeds = [
  "BI, analytics and reporting consultants",
  "SAP / ERP reporting and data specialists",
  "Business Analysts and Product Owners",
  "Supply chain and manufacturing reporting profiles",
  "Finance transformation, controlling and FP&A specialists",
  "SQL, data modelling, KPI and operational reporting expertise",
];

const consultantBenefits = [
  "UK and European contract opportunities",
  "Remote, hybrid and London-based programmes",
  "Transformation-led assignments",
  "Transparent process and expectations",
  "Support before interviews",
  "Relevant projects, not volume outreach",
];

const steps = [
  ["01", "Understand the project", "We clarify the business context, reporting gaps, systems, stakeholders, timeline and delivery outcomes before searching."],
  ["02", "Identify senior profiles", "We focus on consultants with direct experience in the tools, industry setting and transformation challenge."],
  ["03", "Screen and qualify", "Profiles are checked for technical depth, communication, availability, rate fit and delivery credibility."],
  ["04", "Support delivery", "We support interviews, onboarding and early delivery alignment so both sides can move with confidence."],
];

const specialisms = [
  ["BI", "BI & Analytics", "Power BI, dashboards, reporting models, DAX, executive MI and operational decision support."],
  ["ERP", "SAP / ERP Reporting", "SAP data, S/4HANA reporting, BW, extraction logic and business reporting flows."],
  ["SC", "Supply Chain Analytics", "Manufacturing, planning, inventory, logistics and operational performance reporting."],
  ["FC", "Finance & Controlling", "FP&A, controlling, margin analysis, management reporting and finance transformation."],
  ["SQL", "SQL & Data Modelling", "Robust data models, SQL analysis, reporting foundations and governed BI layers."],
  ["PMO", "Transformation Delivery", "Product owners, business analysts, PMO reporting and programme visibility across complex change."],
];

const trustItems = [
  ["FS", "Fast shortlist", "A focused shortlist built around the real project need, not a long list of loosely matched CVs."],
  ["SO", "Senior-only screening", "Consultants are assessed for experience, autonomy, business communication and delivery maturity."],
  ["BF", "Business-first matching", "We match around transformation outcomes, stakeholders and operational context, not only keywords."],
  ["UK", "London-based network", "Access to specialist consultants across the UK and wider European transformation market."],
];

export default function DeepBridgeAdvisoryLandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.16),transparent_30%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-50 to-transparent" />

        <Container className="relative py-6 sm:py-8">
          <nav className="flex items-center justify-between" aria-label="Main navigation">
            <a href="#top" className="flex items-center gap-3" aria-label="DeepBridge Advisory home">
              <div className="h-11 w-11 overflow-hidden rounded-2xl shadow-lg shadow-cyan-500/20">
                <DeepBridgeLogo className="h-full w-full" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide">DeepBridge Advisory</p>
                <p className="text-xs text-slate-400">Reporting • Analytics • Transformation</p>
              </div>
            </a>

            <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
              <a href="#clients" className="transition hover:text-white">Clients</a>
              <a href="#consultants" className="transition hover:text-white">Consultants</a>
              <a href="#specialisms" className="transition hover:text-white">Specialisms</a>
              <a href="#contact" className="transition hover:text-white">Contact</a>
            </div>

            <Button href="#contact" variant="outline" className="hidden border-white bg-white text-slate-950 hover:bg-cyan-100 hover:text-slate-950 md:inline-flex">
              Discuss a project
            </Button>
          </nav>

          <div id="top" className="grid items-center gap-12 pb-24 pt-20 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32 lg:pt-28">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
              <motion.div variants={fadeUp} className="mb-7 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm text-slate-200 backdrop-blur">Senior contract consultants</span>
                <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm text-slate-200 backdrop-blur">Reporting • Analytics • ERP • Transformation</span>
              </motion.div>

              <motion.h1 variants={fadeUp} transition={{ duration: 0.6, ease: "easeOut" }} className="text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Specialist contract consultants for reporting, analytics and transformation delivery.
              </motion.h1>

              <motion.p variants={fadeUp} transition={{ duration: 0.6, ease: "easeOut" }} className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                We connect UK and European organisations with senior consultants across BI, ERP reporting, finance transformation, supply chain analytics and operational delivery programmes.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button href="#contact">Hire Consultants <ArrowIcon className="ml-2 h-4 w-4" /></Button>
                <Button href="#consultants" variant="outline">Join the Network</Button>
              </motion.div>
            </motion.div>

            <HeroVisual />
          </div>
        </Container>
      </section>

      <section id="clients" className="py-20 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <SectionHeader
              align="left"
              eyebrow="For clients"
              title="Find consultants who can contribute from day one."
              description="DeepBridge Advisory supports organisations that need specialist contract expertise for reporting, analytics and transformation programmes where delivery speed, stakeholder alignment and operational understanding matter."
            />

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid gap-4 sm:grid-cols-2">
              {clientNeeds.map((item) => (
                <motion.div key={item} variants={fadeUp} className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                  <p className="text-sm font-medium leading-7 text-slate-800">{item}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Container>
      </section>

      <section id="consultants" className="bg-white py-20 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid gap-4 sm:grid-cols-2">
              {consultantBenefits.map((item) => (
                <motion.div key={item} variants={fadeUp} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold leading-7 text-slate-900">{item}</p>
                </motion.div>
              ))}
            </motion.div>

            <SectionHeader
              align="left"
              eyebrow="For consultants"
              title="High-impact transformation programmes for experienced specialists."
              description="We work with experienced consultants who want serious UK and European transformation work, clear communication and a process built around long-term relationships."
            />
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="How we work"
            title="A focused process built for speed and fit."
            description="We keep the process practical: understand the work, qualify the people and support both sides through selection and delivery."
          />

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, description]) => (
              <motion.div key={title} variants={fadeUp} className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-sm font-bold text-cyan-700">{number}</div>
                <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      <section id="specialisms" className="bg-slate-950 py-20 text-white sm:py-24">
        <Container>
          <SectionHeader
            dark
            eyebrow="Specialisms"
            title="Depth where transformation depends on reporting clarity."
            description="Our network is strongest across BI, ERP, operations and finance environments where reporting must support real decisions."
          />

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {specialisms.map(([label, title, description]) => (
              <FeatureCard key={title} label={label} title={title} description={description} dark />
            ))}
          </motion.div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <SectionHeader
              align="left"
              eyebrow="Positioning"
              title="Boutique search for business-critical delivery."
              description="DeepBridge Advisory is designed for companies and consultants who value relevance, clarity and practical execution over volume-driven recruitment."
            />

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid gap-5 sm:grid-cols-2">
              {trustItems.map(([label, title, description]) => (
                <FeatureCard key={title} label={label} title={title} description={description} />
              ))}
            </motion.div>
          </div>
        </Container>
      </section>

      <section id="contact" className="bg-white py-20 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.55, ease: "easeOut" }} className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-200 lg:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Contact</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Let’s discuss your project.</h2>
              <p className="mt-5 text-base leading-8 text-slate-300">Tell us what you need to deliver, or share your consulting profile. We’ll respond with a clear next step.</p>

              <div className="mt-10 space-y-5 text-sm text-slate-300">
                <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-cyan-300" /><a href="mailto:hello@deepbridgeadvisory.co.uk" className="transition hover:text-white">hello@deepbridgeadvisory.co.uk</a></div>
                <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-cyan-300" /><span>London • United Kingdom</span></div>
                <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-cyan-300" /><span>Reporting • Analytics • ERP Transformation Talent</span></div>
              </div>
            </motion.div>

            <motion.form
              action="https://formspree.io/f/mlgzpyqv"
              method="POST"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-8"
              aria-label="Contact form"
            >
              <input type="hidden" name="_subject" value="New DeepBridge Advisory Website Inquiry" />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Name" placeholder="Your name" autoComplete="name" required />
                <Field id="email" label="Email" type="email" placeholder="you@company.com" autoComplete="email" required />
                <Field id="company" label="Company" placeholder="Company name" autoComplete="organization" />

                <div className="space-y-2">
                  <label htmlFor="profile-type" className="text-sm font-medium text-slate-800">I am</label>
                  <select
                    id="profile-type"
                    name="role"
                    required
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="">Select one</option>
                    <option value="client">A client</option>
                    <option value="consultant">A consultant</option>
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="message" className="text-sm font-medium text-slate-800">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    placeholder="Tell us about your project, hiring need or consulting profile."
                    className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </div>

              <button type="submit" className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 sm:w-auto">
                Let’s discuss your project <ArrowIcon className="ml-2 h-4 w-4" />
              </button>

              <p className="mt-4 text-xs leading-6 text-slate-500">We typically respond within 24 hours.</p>
            </motion.form>
          </div>
        </Container>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <Container>
          <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-950">DeepBridge Advisory</p>
              <p>Reporting • Analytics • ERP Transformation Talent</p>
            </div>
            <p>© 2026 DeepBridge Advisory</p>
          </div>
        </Container>
      </footer>
    </main>
  );
}