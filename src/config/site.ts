export const company = {
  tradingName: "DeepBridge Advisory",
  legalName: "DUSTDEEP LTD",
  companyNumber: "16775578",
  registeredIn: "England and Wales",
  registeredOffice:
    "Kemp House, 152-160 City Road, London, United Kingdom, EC1V 2NX",
  contactEmail: "hello@deepbridgeadvisory.co.uk",
  privacyEmail: "hello@deepbridgeadvisory.co.uk",
  incorporated: "9 October 2025",
} as const;

export const siteConfig = {
  siteUrl:
    import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") ||
    "https://deepbridgeadvisory.co.uk",
  formEndpoint:
    import.meta.env.VITE_FORMSPREE_ENDPOINT ||
    "https://formspree.io/f/mlgzpyqv",
  linkedInUrl: "https://www.linkedin.com/company/deepbridge-advisory",
  privacyVersion: "1.0",
  privacyUpdated: "26 July 2026",
} as const;

export const primaryNavigation = [
  { label: "Home", href: "/" },
  { label: "Expertise", href: "/expertise" },
  { label: "For Clients", href: "/for-clients" },
  { label: "For Consultants", href: "/for-consultants" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const legalNavigation = [
  { label: "Privacy", href: "/privacy" },
  { label: "Cookies", href: "/cookies" },
  { label: "Legal", href: "/legal" },
  { label: "Accessibility", href: "/accessibility" },
] as const;

export type MetaEntry = {
  title: string;
  description: string;
};

export const pageMeta: Record<string, MetaEntry> = {
  "/": {
    title:
      "DeepBridge Advisory | SAP, Supply Chain & Transformation Consultants",
    description:
      "DeepBridge helps organisations across the UK and Europe build experienced project teams for SAP, supply chain, data and business transformation programmes.",
  },
  "/expertise": {
    title: "Transformation Expertise | DeepBridge Advisory",
    description:
      "Specialist independent consultants across SAP and ERP, supply chain, data and business intelligence, and programme leadership.",
  },
  "/for-clients": {
    title: "For Clients | DeepBridge Advisory",
    description:
      "Focused specialist search, team build-out and engagement coordination for demanding transformation programmes.",
  },
  "/for-consultants": {
    title: "For Independent Consultants | DeepBridge Advisory",
    description:
      "Join the DeepBridge network for relevant transformation opportunities across the UK and Europe.",
  },
  "/about": {
    title: "About DeepBridge Advisory",
    description:
      "A focused advisory and delivery partner connecting organisations with experienced independent transformation specialists.",
  },
  "/opportunities": {
    title: "Current Opportunities | DeepBridge Advisory",
    description:
      "View current independent consulting opportunities managed by DeepBridge Advisory.",
  },
  "/contact": {
    title: "Contact DeepBridge Advisory",
    description:
      "Discuss a transformation requirement, join our consultant network or make a general enquiry.",
  },
  "/privacy": {
    title: "Privacy Notice | DeepBridge Advisory",
    description:
      "How DeepBridge Advisory collects, uses, retains and protects personal information.",
  },
  "/cookies": {
    title: "Cookie Information | DeepBridge Advisory",
    description:
      "Information about the essential technologies used by the DeepBridge Advisory website.",
  },
  "/legal": {
    title: "Legal Notice | DeepBridge Advisory",
    description:
      "Corporate details and legal information for the DeepBridge Advisory website.",
  },
  "/accessibility": {
    title: "Accessibility | DeepBridge Advisory",
    description:
      "Our approach to making the DeepBridge Advisory website accessible.",
  },
};
