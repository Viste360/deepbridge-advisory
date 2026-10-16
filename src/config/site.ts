import seo from "./seo.json";

export const company = {
  brandName: "DeepBridge Advisory",
  legalName: "DEEPBRIDGE ADVISORY LTD",
  companyNumber: "16775578",
  registeredIn: "England and Wales",
  registeredOffice:
    "71–75 Shelton Street, Covent Garden, London WC2H 9JQ, United Kingdom",
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
  { label: "Expertise", de: "Leistungen", es: "Especialidades", href: "/expertise" },
  { label: "How We Work", de: "Zusammenarbeit", es: "Cómo trabajamos", href: "/for-clients" },
  { label: "About", de: "Über uns", es: "Quiénes somos", href: "/about" },
  { label: "Insights", de: "Einblicke", es: "Perspectivas", href: "/insights" },
  { label: "Contact", de: "Kontakt", es: "Contacto", href: "/contact" },
] as const;

export const legalNavigation = [
  { label: "Legal", de: "Impressum", es: "Aviso legal", href: "/legal" },
  { label: "Privacy", de: "Datenschutz", es: "Privacidad", href: "/privacy" },
  { label: "Cookies", de: "Cookies", es: "Cookies", href: "/cookies" },
  { label: "Accessibility", de: "Barrierefreiheit", es: "Accesibilidad", href: "/accessibility" },
] as const;

export type MetaEntry = {
  title: string;
  description: string;
  type?: "website" | "article";
  published?: string;
  modified?: string;
  lastModified?: string;
};

export const pageMeta = seo.pages as Record<string, MetaEntry>;
