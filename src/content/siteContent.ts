export type Expertise = {
  code: string;
  title: string;
  summary: string;
  details: string[];
};

export const expertise: Expertise[] = [
  {
    code: "SAP",
    title: "SAP & ERP Transformation",
    summary:
      "Specialists supporting ERP modernisation, SAP S/4HANA programmes, process redesign, integration and reporting.",
    details: [
      "S/4HANA programme and workstream leadership",
      "Business process and solution alignment",
      "Integration, data, testing and cutover",
      "Operational reporting and adoption",
    ],
  },
  {
    code: "SCM",
    title: "Supply Chain & Manufacturing",
    summary:
      "Planning, logistics, production, warehousing and operational expertise for complex industrial environments.",
    details: [
      "Planning, S&OP and MRP",
      "Manufacturing and plant operations",
      "Warehouse and logistics transformation",
      "Inventory and operational performance",
    ],
  },
  {
    code: "DATA",
    title: "Data & Business Intelligence",
    summary:
      "Business analysts and BI specialists who turn fragmented operational information into clear reporting and actionable insight.",
    details: [
      "Power BI and reporting architecture",
      "Data modelling and SQL analysis",
      "Business analysis and requirements",
      "Executive and operational insight",
    ],
  },
  {
    code: "PMO",
    title: "Programme Leadership",
    summary:
      "Experienced project and workstream leaders who align business, technology and delivery teams.",
    details: [
      "Programme and project leadership",
      "PMO and delivery governance",
      "Workstream and product ownership",
      "Change, risk and stakeholder alignment",
    ],
  },
];

export const processSteps = [
  {
    number: "01",
    title: "Understand",
    text: "We clarify the programme context, deliverables, working model and expertise required.",
  },
  {
    number: "02",
    title: "Identify",
    text: "We search selectively across our European network and evaluate relevant experience.",
  },
  {
    number: "03",
    title: "Align",
    text: "We coordinate interviews, commercial expectations, availability and engagement requirements.",
  },
  {
    number: "04",
    title: "Support",
    text: "We remain involved through onboarding and throughout the assignment.",
  },
];

export const engagementModels = [
  {
    number: "01",
    title: "Individual specialist assignments",
    text: "A defined requirement for experienced independent expertise within a programme or workstream.",
  },
  {
    number: "02",
    title: "Multi-role programme support",
    text: "Several complementary specialists aligned around one transformation stage or delivery objective.",
  },
  {
    number: "03",
    title: "Advisory and delivery coordination",
    text: "Hands-on support shaping requirements, aligning engagement details and maintaining continuity.",
  },
];

export const industries = [
  "Manufacturing",
  "Consumer & packaged goods",
  "Industrial products",
  "Supply chain & logistics",
  "Technology-enabled transformation",
];

export const clientServices = [
  {
    title: "Specialist Search",
    text: "Targeted identification of independent consultants and project professionals for defined transformation requirements.",
  },
  {
    title: "Team Build-Out",
    text: "Coordinated support where programmes require several complementary roles across a workstream or delivery phase.",
  },
  {
    title: "Engagement Coordination",
    text: "Practical support across availability, interviews, commercial alignment, onboarding and assignment continuity.",
  },
  {
    title: "Advisory Support",
    text: "Structured input on role definition, European talent markets and realistic engagement models. This does not constitute legal, tax or immigration advice.",
  },
];

export const clientInputs = [
  "Programme context and required outcomes",
  "Expected duration and target start date",
  "Location, travel and working model",
  "Required languages and specialist experience",
  "Commercial parameters",
  "Compliance and onboarding requirements",
];

export const consultantExpectations = [
  "Clear assignment context",
  "Transparent commercial discussions",
  "Realistic travel and onsite expectations",
  "Direct communication during the process",
  "Support through onboarding",
  "Continued contact during the engagement",
];

export const consultantInformation = [
  "Current CV or professional profile",
  "Location, availability and languages",
  "Preferred working model",
  "Day-rate expectations",
  "Company and invoicing details at the appropriate stage",
  "Relevant work-authorisation and assignment-specific compliance information",
];

export const principles = [
  {
    title: "Relevance over volume",
    text: "A small number of well-aligned introductions is more useful than a large stack of CVs.",
  },
  {
    title: "Clarity from the beginning",
    text: "Location, travel, scope, commercial expectations and engagement structure should be discussed early.",
  },
  {
    title: "Relationships beyond placement",
    text: "Our role continues through onboarding and assignment delivery.",
  },
  {
    title: "International by design",
    text: "We support cross-border programmes while recognising that each engagement may carry its own contractual, tax, immigration and regulatory requirements.",
  },
];
