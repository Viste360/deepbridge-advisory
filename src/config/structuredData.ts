import { company, pageMeta, siteConfig } from "./site";
import type { Insight } from "../content/insights";

import type { Locale } from "../i18n";
const organisationId = `${siteConfig.siteUrl}/#organisation`;
const websiteId = `${siteConfig.siteUrl}/#website`;
const operatingAreas = ["Germany", "United Kingdom", "Spain", "Europe"];

const localizedPath = (path: string, locale: Locale) =>
  locale === "en" ? path : (path === "/" ? `/${locale}` : `/${locale}${path}`);
const language = (locale: Locale) => ({ en: "en-GB", de: "de-DE", es: "es-ES" })[locale];

export const services = [
  {
    name: "SAP & Business Transformation",
    description: "Specialist support for SAP S/4HANA programmes, business processes, operational data and reporting.",
  },
  {
    name: "Operations & Supply Chain",
    description: "Experienced professionals supporting planning, production, logistics and order-to-delivery improvement.",
  },
  {
    name: "Interim Leadership & Finance",
    description: "Senior capability for periods of change, delivery pressure and temporary leadership needs.",
  },
] as const;

const germanServices = [
  {
    name: "SAP & Unternehmenstransformation",
    description: "Spezialisierte Unterstützung für SAP-S/4HANA-Programme, Geschäftsprozesse, operative Daten und Reporting.",
  },
  {
    name: "Operations & Supply Chain",
    description: "Erfahrene Fachleute für Planung, Produktion, Logistik und die Verbesserung von Order-to-Delivery-Prozessen.",
  },
  {
    name: "Interim Management & Finance",
    description: "Erfahrene Führungskräfte und Spezialisten für Veränderungsphasen, anspruchsvolle Projekte und temporären Führungsbedarf.",
  },
] as const;

const spanishServices = [
  {
    name: "SAP y transformación empresarial",
    description: "Apoyo especializado para programas SAP S/4HANA, procesos de negocio, datos operativos e informes.",
  },
  {
    name: "Operaciones y cadena de suministro",
    description: "Profesionales con experiencia en planificación, producción, logística y mejora del proceso desde el pedido hasta la entrega.",
  },
  {
    name: "Dirección interina y finanzas",
    description: "Directivos y especialistas para etapas de cambio, proyectos exigentes y necesidades temporales de liderazgo.",
  },
] as const;

function organisation(locale: Locale) {
  return {
    "@type": "Organization",
    "@id": organisationId,
    name: company.brandName,
    alternateName: "DeepBridge",
    legalName: company.legalName,
    url: siteConfig.siteUrl,
    logo: `${siteConfig.siteUrl}/brand/deepbridge-monogram-512.png`,
    image: `${siteConfig.siteUrl}${siteConfig.socialImagePath}`,
    email: company.contactEmail,
    foundingDate: "2025-10-09",
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Companies House company number",
      value: company.companyNumber,
    },
    sameAs: [siteConfig.linkedInUrl],
    areaServed: operatingAreas,
    description: locale === "de"
      ? "DeepBridge unterstützt Industrieunternehmen bei SAP-Transformationen, operativen Verbesserungen und Interim-Management-Aufgaben. Europäischer Fokus: London, München und Madrid."
      : locale === "es"
        ? "DeepBridge apoya a empresas industriales en la transformación SAP, la mejora operativa y la dirección interina. Enfoque europeo: Londres, Múnich y Madrid."
        : "DeepBridge supports industrial businesses through SAP transformation, operational improvement and interim leadership. European focus: London, Munich and Madrid.",
    // This is the existing registered company address, not a claim of local offices.
    address: {
      "@type": "PostalAddress",
      streetAddress: "71–75 Shelton Street, Covent Garden",
      addressLocality: "London",
      postalCode: "WC2H 9JQ",
      addressCountry: "GB",
    },
  };
}

const website = {
  "@type": "WebSite",
  "@id": websiteId,
  url: siteConfig.siteUrl,
  name: company.brandName,
  inLanguage: ["en-GB", "de-DE", "es-ES"],
  publisher: { "@id": organisationId },
};

function breadcrumb(path: string, label: string, locale: Locale) {
  const fullPath = localizedPath(path, locale);
  const items = [{
    "@type": "ListItem",
    position: 1,
    name: locale === "de" ? "Startseite" : locale === "es" ? "Inicio" : "Home",
    item: `${siteConfig.siteUrl}${localizedPath("/", locale)}`,
  }];
  if (path.startsWith("/insights/")) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: locale === "de" ? "Einblicke" : locale === "es" ? "Perspectivas" : "Insights",
      item: `${siteConfig.siteUrl}${localizedPath("/insights", locale)}`,
    });
  }
  if (path !== "/") {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: label,
      item: `${siteConfig.siteUrl}${fullPath}`,
    });
  }
  return {
    "@type": "BreadcrumbList",
    "@id": `${siteConfig.siteUrl}${fullPath}#breadcrumb`,
    itemListElement: items,
  };
}

export function buildPageSchema(path: string, locale: Locale = "en"): Record<string, unknown> {
  const fullPath = localizedPath(path, locale);
  const url = `${siteConfig.siteUrl}${fullPath}`;
  const meta = pageMeta[fullPath];
  const title = meta?.title ?? company.brandName;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organisation(locale),
      website,
      {
        "@type": path === "/insights" || path === "/expertise" ? "CollectionPage" : "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description: meta?.description,
        inLanguage: language(locale),
        isPartOf: { "@id": websiteId },
        about: { "@id": organisationId },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      breadcrumb(path, title.replace(/ \| DeepBridge(?: Advisory)?$/, ""), locale),
    ],
  };
}

export function buildHomeSchema(locale: Locale = "en"): Record<string, unknown> {
  return buildPageSchema("/", locale);
}
export const homeSchema = buildHomeSchema();

export function buildServiceSchema(locale: Locale = "en"): Record<string, unknown> {
  const schema = buildPageSchema("/expertise", locale);
  const graph = schema["@graph"] as Record<string, unknown>[];
  graph[2].mainEntity = {
    "@type": "ItemList",
    itemListElement: (locale === "de" ? germanServices : locale === "es" ? spanishServices : services).map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        ...service,
        provider: { "@id": organisationId },
        areaServed: operatingAreas,
      },
    })),
  };
  return schema;
}

export function buildInsightsSchema(insights: Insight[], locale: Locale = "en"): Record<string, unknown> {
  const schema = buildPageSchema("/insights", locale);
  const graph = schema["@graph"] as Record<string, unknown>[];
  graph[2].mainEntity = {
    "@type": "ItemList",
    itemListElement: insights.map((insight, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteConfig.siteUrl}${localizedPath(`/insights/${insight.slug}`, locale)}`,
      name: insight.title,
    })),
  };
  return schema;
}

export function buildArticleSchema(insight: Insight, locale: Locale = "en"): Record<string, unknown> {
  const path = `/insights/${insight.slug}`;
  const url = `${siteConfig.siteUrl}${localizedPath(path, locale)}`;
  const schema = buildPageSchema(path, locale);
  const graph = schema["@graph"] as Record<string, unknown>[];
  graph.push({
    "@type": "Article",
    "@id": `${url}#article`,
    headline: insight.title,
    description: insight.description,
    datePublished: insight.published,
    dateModified: insight.updated,
    inLanguage: language(locale),
    mainEntityOfPage: { "@id": `${url}#webpage` },
    author: { "@id": organisationId },
    publisher: { "@id": organisationId },
    image: `${siteConfig.siteUrl}${siteConfig.socialImagePath}`,
  });
  return schema;
}

// Kept as a content export for compatibility; no hidden FAQ structured data.
export const commonQuestions = [
  {
    question: "What is DeepBridge Advisory?",
    answer: "DeepBridge supports industrial businesses through SAP transformation, operational improvement and interim leadership.",
  },
  {
    question: "How does DeepBridge support delivery?",
    answer: "We define the assignment, bring together experienced professionals and agree our involvement through mobilisation, progress reviews, issue coordination and handover.",
  },
  {
    question: "Where is DeepBridge focused?",
    answer: "Our European focus centres on London, Munich and Madrid, with particular attention to industrial programmes in Germany.",
  },
] as const;
