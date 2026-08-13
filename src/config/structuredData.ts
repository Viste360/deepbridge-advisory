import { company, siteConfig } from "./site";
import type { Insight } from "../content/insights";

const organisationId = `${siteConfig.siteUrl}/#organisation`;
const websiteId = `${siteConfig.siteUrl}/#website`;

export const services = [
  {
    name: "SAP and ERP transformation consulting",
    description:
      "Independent specialists supporting SAP S/4HANA and enterprise resource planning programmes.",
  },
  {
    name: "Supply chain transformation consulting",
    description:
      "Specialist capability across planning, procurement, logistics, manufacturing and operating-model change.",
  },
  {
    name: "Data and business intelligence consulting",
    description:
      "Independent expertise spanning data strategy, governance, migration, analytics and business intelligence.",
  },
  {
    name: "Programme leadership and delivery consulting",
    description:
      "Experienced programme, workstream and change leadership for complex transformation delivery.",
  },
] as const;

const organisation = {
  "@type": ["Organization", "ProfessionalService"],
  "@id": organisationId,
  name: company.tradingName,
  alternateName: "DeepBridge",
  legalName: company.legalName,
  url: siteConfig.siteUrl,
  logo: {
    "@type": "ImageObject",
    url: `${siteConfig.siteUrl}/brand/deepbridge-monogram-512.png`,
    width: 512,
    height: 512,
  },
  image: `${siteConfig.siteUrl}${siteConfig.socialImagePath}`,
  email: company.contactEmail,
  foundingDate: "2025-10-09",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "Companies House company number",
    value: company.companyNumber,
  },
  sameAs: [siteConfig.linkedInUrl],
  areaServed: [
    { "@type": "Country", name: "United Kingdom" },
    { "@type": "Place", name: "Europe" },
  ],
  knowsAbout: [
    "SAP S/4HANA transformation",
    "Enterprise resource planning",
    "Supply chain transformation",
    "Data and business intelligence",
    "Programme leadership",
    "Business transformation",
  ],
  slogan: "Specialist consultants for complex transformation programmes.",
  description:
    "A specialist advisory and delivery partner helping organisations build experienced independent project teams for complex transformation programmes across the UK and Europe.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Kemp House, 152-160 City Road",
    addressLocality: "London",
    postalCode: "EC1V 2NX",
    addressCountry: "GB",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "client and consultant enquiries",
    email: company.contactEmail,
    availableLanguage: "English",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Transformation consulting services",
    itemListElement: services.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        ...service,
        provider: { "@id": organisationId },
        areaServed: ["United Kingdom", "Europe"],
      },
    })),
  },
};

const website = {
  "@type": "WebSite",
  "@id": websiteId,
  url: siteConfig.siteUrl,
  name: company.tradingName,
  inLanguage: "en-GB",
  publisher: { "@id": organisationId },
};

const commonQuestions = [
  {
    question: "What is DeepBridge Advisory?",
    answer:
      "DeepBridge Advisory is a UK-based specialist advisory and delivery partner that helps organisations build experienced independent teams for complex transformation programmes.",
  },
  {
    question: "Which transformation programmes does DeepBridge support?",
    answer:
      "DeepBridge focuses on SAP and ERP, supply chain, data and business intelligence, programme leadership and wider business transformation.",
  },
  {
    question: "Where does DeepBridge Advisory operate?",
    answer:
      "DeepBridge supports programmes and independent consultants across the United Kingdom and Europe from its base in London.",
  },
  {
    question: "How does DeepBridge engage consultants?",
    answer:
      "DeepBridge clarifies the delivery requirement, identifies a focused group of relevant independent specialists and supports contracting, onboarding and delivery coordination.",
  },
] as const;

function breadcrumb(path: string, label: string) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${siteConfig.siteUrl}/`,
    },
  ];

  if (path.startsWith("/insights/") && path !== "/insights") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "Insights",
      item: `${siteConfig.siteUrl}/insights`,
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: label,
    item: `${siteConfig.siteUrl}${path}`,
  });

  return {
    "@type": "BreadcrumbList",
    "@id": `${siteConfig.siteUrl}${path}#breadcrumb`,
    itemListElement: items,
  };
}

export const homeSchema: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@graph": [
    organisation,
    website,
    {
      "@type": "WebPage",
      "@id": `${siteConfig.siteUrl}/#webpage`,
      url: `${siteConfig.siteUrl}/`,
      name: "DeepBridge Advisory",
      isPartOf: { "@id": websiteId },
      about: { "@id": organisationId },
      inLanguage: "en-GB",
      mainEntity: { "@id": organisationId },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteConfig.siteUrl}/#common-questions`,
      mainEntity: commonQuestions.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export function buildServiceSchema(): Record<string, unknown> {
  const path = "/expertise";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organisation,
      website,
      {
        "@type": "CollectionPage",
        "@id": `${siteConfig.siteUrl}${path}#webpage`,
        url: `${siteConfig.siteUrl}${path}`,
        name: "Transformation expertise",
        isPartOf: { "@id": websiteId },
        about: { "@id": organisationId },
        breadcrumb: { "@id": `${siteConfig.siteUrl}${path}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: services.map((service, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Service",
              ...service,
              provider: { "@id": organisationId },
              areaServed: ["United Kingdom", "Europe"],
            },
          })),
        },
      },
      breadcrumb(path, "Expertise"),
    ],
  };
}

export function buildInsightsSchema(insights: Insight[]): Record<string, unknown> {
  const path = "/insights";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organisation,
      website,
      {
        "@type": "CollectionPage",
        "@id": `${siteConfig.siteUrl}${path}#webpage`,
        url: `${siteConfig.siteUrl}${path}`,
        name: "Transformation insights",
        isPartOf: { "@id": websiteId },
        about: { "@id": organisationId },
        breadcrumb: { "@id": `${siteConfig.siteUrl}${path}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: insights.map((insight, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${siteConfig.siteUrl}/insights/${insight.slug}`,
            name: insight.title,
          })),
        },
      },
      breadcrumb(path, "Insights"),
    ],
  };
}

export function buildArticleSchema(insight: Insight): Record<string, unknown> {
  const path = `/insights/${insight.slug}`;
  const url = `${siteConfig.siteUrl}${path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organisation,
      website,
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: insight.title,
        description: insight.description,
        datePublished: insight.published,
        dateModified: insight.updated,
        inLanguage: "en-GB",
        mainEntityOfPage: { "@id": `${url}#webpage` },
        author: { "@id": organisationId },
        publisher: { "@id": organisationId },
        image: `${siteConfig.siteUrl}${siteConfig.socialImagePath}`,
        about: services.map((service) => service.name),
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: insight.title,
        isPartOf: { "@id": websiteId },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteConfig.siteUrl}${siteConfig.socialImagePath}`,
        },
      },
      breadcrumb(path, insight.title),
    ],
  };
}

export { commonQuestions };
