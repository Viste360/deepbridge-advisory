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
  return (
    <div className={`mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
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

function MailIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function MapIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function BriefcaseIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function ChartIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16V7" />
    </svg>
  );
}

function DatabaseIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function SettingsIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05a2.1 2.1 0 0 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21a2.1 2.1 0 0 1-4.2 0v-.07A1.8 1.8 0 0 0 8.4 19.3a1.8 1.8 0 0 0-2 .36l-.05.05a2.1 2.1 0 0 1-2.97-2.97l.05-.05a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.1H2a2.1 2.1 0 0 1 0-4.2h.07A1.8 1.8 0 0 0 3.7 8.4a1.8 1.8 0 0 0-.36-2l-.05-.05a2.1 2.1 0 0 1 2.97-2.97l.05.05a1.8 1.8 0 0 0 2 .36h.08A1.8 1.8 0 0 0 9.5 2.1V2a2.1 2.1 0 0 1 4.2 0v.07a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.05-.05a2.1 2.1 0 0 1 2.97 2.97l-.05.05a1.8 1.8 0 0 0-.36 2v.08A1.8 1.8 0 0 0 21.9 9.5H22a2.1 2.1 0 0 1 0 4.2h-.07A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  );
}

function ShieldIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  );
}

function UsersIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Button({ children, href, variant = "primary", className = "" }) {
  const base =
    "inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2";

  const styles =
    variant === "outline"
      ? "border border-white/20 bg-white/5 text-white hover:bg-white/10"
      : variant === "dark"
        ? "bg-slate-950 text-white hover:bg-slate-800"
        : "bg-cyan-300 text-slate-950 hover:bg-cyan-200";

  return (
    <a href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </a>
  );
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
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-600">
        {eyebrow}
      </p>

      <h2 className={`text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl ${dark ? "text-white" : "text-slate-950"}`}>
        {title}
      </h2>

      <p className={`mt-5 text-base leading-8 sm:text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}>
        {description}
      </p>
    </motion.div>
  );
}

function FeatureCard({ icon, label, title, description, dark = false }) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.5, ease: "easeOut" }}>
      <div
        className={`h-full rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 ${
          dark
            ? "border-white/10 bg-white/[0.06] hover:bg-white/[0.09]"
            : "border-slate-200 bg-white shadow-sm hover:border-cyan-200 hover:shadow-xl hover:shadow-slate-200/70"
        }`}
      >
        <div
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
            dark ? "bg-cyan-300 text-slate-950" : "bg-slate-950 text-cyan-300"
          }`}
        >
          {icon || <span className="text-sm font-bold">{label}</span>}
        </div>

        <h3 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-950"}`}>
          {title}
        </h3>

        <p className={`mt-3 text-sm leading-7 ${dark ? "text-slate-300" : "text-slate-600"}`}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}

function HeaderBrand() {
  return (
    <a href="#top" className="group flex items-center gap-4" aria-label="DeepBridge Advisory home">
      <img
  src="/db-logo.png"
  alt=""
  className="h-10 w-10 object-contain transition duration-300 group-hover:scale-105"
/>

      <div className="leading-none">
        <p className="text-base font-bold tracking-[0.18em] text-white">
          DEEPBRIDGE
        </p>

        <p className="mt-1 text-xs font-semibold tracking-[0.42em] text-cyan-300">
          ADVISORY
        </p>

        <p className="mt-2 hidden text-[10px] uppercase tracking-[0.24em] text-slate-300 sm:block">
          Reporting <span className="mx-1.5 text-cyan-400">•</span>
          Analytics <span className="mx-1.5 text-cyan-400">•</span>
          ERP <span className="mx-1.5 text-cyan-400">•</span>
          Transformation
        </p>
      </div>
    </a>
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
      <div className="absolute left-[24%] top-[24%] h-px w-[52%] rotate-45 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="absolute left-[24%] top-[76%] h-px w-[52%] -rotate-45 bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {nodes.map(([label, position]) => (
        <div
          key={label}
          className={`absolute ${position} rounded-2xl border border-white/[0.12] bg-slate-950/80 px-4 py-3 shadow-xl backdrop-blur`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
            {label}
          </p>
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
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>

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
  ["BI", "BI & Analytics", "Power BI, dashboards, reporting models, DAX, executive MI and operational decision support.", <ChartIcon className="h-6 w-6" />],
  ["ERP", "SAP / ERP Reporting", "SAP data, S/4HANA reporting, BW, extraction logic and business reporting flows.", <SettingsIcon className="h-6 w-6" />],
  ["SC", "Supply Chain Analytics", "Manufacturing, planning, inventory, logistics and operational performance reporting.", <BriefcaseIcon className="h-6 w-6" />],
  ["FC", "Finance & Controlling", "FP&A, controlling, margin analysis, management reporting and finance transformation.", <ShieldIcon className="h-6 w-6" />],
  ["SQL", "SQL & Data Modelling", "Robust data models, SQL analysis, reporting foundations and governed BI layers.", <DatabaseIcon className="h-6 w-6" />],
  ["PMO", "Transformation Delivery", "Product owners, business analysts, PMO reporting and programme visibility across complex change.", <UsersIcon className="h-6 w-6" />],
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.12),transparent_30%)]" />

        <div className="pointer-events-none absolute right-0 top-20 hidden h-[520px] w-[72%] overflow-hidden lg:block">
          <img
            src="/bridge-header.png"
            alt=""
            className="h-full w-full object-cover object-right-bottom opacity-[0.43]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/58 to-slate-950/5" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/72 via-slate-950/26 to-slate-950/84" />
        </div>

        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-50 via-slate-950/80 to-transparent" />

        <Container className="relative py-7 sm:py-9">
          <nav className="flex items-center justify-between" aria-label="Main navigation">
            <HeaderBrand />

            <div className="hidden items-center gap-8 text-sm text-slate-200 md:flex">
              <a href="#clients" className="transition hover:text-white">Clients</a>
              <a href="#consultants" className="transition hover:text-white">Consultants</a>
              <a href="#specialisms" className="transition hover:text-white">Specialisms</a>
              <a href="#contact" className="transition hover:text-white">Contact</a>
            </div>

            <Button
              href="#contact"
              variant="outline"
              className="hidden border-cyan-400/50 bg-slate-950/30 text-white hover:bg-cyan-300 hover:text-slate-950 md:inline-flex"
            >
              Discuss a project
            </Button>
          </nav>

          <div id="top" className="grid items-center gap-12 pb-24 pt-20 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32 lg:pt-28">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
              <motion.div variants={fadeUp} className="mb-7 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-sm text-slate-200 backdrop-blur">
                  Senior contract consultants
                </span>

                <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-sm text-slate-200 backdrop-blur">
                  Reporting • Analytics • ERP • Transformation
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl"
              >
                Specialist contract consultants for reporting, analytics and transformation delivery.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl"
              >
                We connect UK and European organisations with senior consultants across BI, ERP reporting, finance transformation, supply chain analytics and operational delivery programmes.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button href="#contact">
                  Hire Consultants <ArrowIcon className="ml-2 h-4 w-4" />
                </Button>

                <Button href="#consultants" variant="outline">
                  Join the Network
                </Button>
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

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {clientNeeds.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex min-h-[88px] items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-slate-200/70"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50">
                    <CheckIcon className="h-4 w-4 text-cyan-600" />
                  </div>

                  <p className="text-sm font-medium leading-7 text-slate-800">
                    {item}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Container>
      </section>

      <section id="consultants" className="bg-white py-20 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {consultantBenefits.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex min-h-[82px] items-center rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:bg-white hover:shadow-lg"
                >
                  <p className="text-sm font-semibold leading-7 text-slate-900">
                    {item}
                  </p>
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

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.18 }}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map(([number, title, description]) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-slate-200/70"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-sm font-bold text-cyan-700">
                  {number}
                </div>

                <h3 className="text-lg font-semibold text-slate-950">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {description}
                </p>
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

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.18 }}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {specialisms.map(([label, title, description, icon]) => (
              <FeatureCard
                key={title}
                label={label}
                title={title}
                description={description}
                icon={icon}
                dark
              />
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

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-5 sm:grid-cols-2"
            >
              {trustItems.map(([label, title, description]) => (
                <FeatureCard
                  key={title}
                  label={label}
                  title={title}
                  description={description}
                />
              ))}
            </motion.div>
          </div>
        </Container>
      </section>

      <section id="contact" className="bg-white py-20 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-200 lg:p-10"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Contact
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Let’s discuss your project.
              </h2>

              <p className="mt-5 text-base leading-8 text-slate-300">
                Tell us what you need to deliver, or share your consulting profile. We’ll respond with a clear next step.
              </p>

              <div className="mt-10 space-y-5 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <MailIcon className="h-5 w-5 text-cyan-300" />
                  <a href="mailto:hello@deepbridgeadvisory.co.uk" className="transition hover:text-white">
                    hello@deepbridgeadvisory.co.uk
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <MapIcon className="h-5 w-5 text-cyan-300" />
                  <span>London • United Kingdom</span>
                </div>

                <div className="flex items-center gap-3">
                  <BriefcaseIcon className="h-5 w-5 text-cyan-300" />
                  <span>Reporting • Analytics • ERP Transformation Talent</span>
                </div>
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
              <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Name" placeholder="Your name" autoComplete="name" required />
                <Field id="email" label="Email" type="email" placeholder="you@company.com" autoComplete="email" required />
                <Field id="company" label="Company" placeholder="Company name" autoComplete="organization" />

                <div className="space-y-2">
                  <label htmlFor="profile-type" className="text-sm font-medium text-slate-800">
                    I am
                  </label>

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
                  <label htmlFor="message" className="text-sm font-medium text-slate-800">
                    Message
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    required
                    placeholder="Tell us about your project, hiring need or consulting profile."
                    className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 sm:w-auto"
              >
                Let’s discuss your project <ArrowIcon className="ml-2 h-4 w-4" />
              </button>

              <p className="mt-4 text-xs leading-6 text-slate-500">
                We typically respond within 24 hours.
              </p>
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