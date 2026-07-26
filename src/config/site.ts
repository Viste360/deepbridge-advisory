import seo from "./seo.json";

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
  siteUrl: seo.siteUrl,
  formEndpoint:
    import.meta.env.VITE_FORMSPREE_ENDPOINT ||
    "https://formspree.io/f/mlgzpyqv",
  linkedInUrl: "https://www.linkedin.com/company/deepbridge-advisory",
  socialImagePath: seo.socialImagePath,
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

export const pageMeta = seo.pages as Record<string, MetaEntry>;
