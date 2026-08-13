import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");
const seo = JSON.parse(
  await readFile(resolve(projectRoot, "src/config/seo.json"), "utf8"),
);
const sourceHtml = await readFile(resolve(distDirectory, "index.html"), "utf8");
const siteUrl = seo.siteUrl.replace(/\/$/, "");
const socialImageUrl = `${siteUrl}${seo.socialImagePath}`;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace("</head>", `    ${replacement}\n  </head>`);
}

function structuredData(path, meta, pageUrl) {
  const organisationId = `${siteUrl}/#organisation`;
  const websiteId = `${siteUrl}/#website`;
  const graph = [
    {
      "@type": "Organization",
      "@id": organisationId,
      name: seo.siteName,
      alternateName: "DeepBridge",
      legalName: "DUSTDEEP LTD",
      url: siteUrl,
      logo: `${siteUrl}/brand/deepbridge-monogram-512.png`,
      email: "hello@deepbridgeadvisory.co.uk",
      foundingDate: "2025-10-09",
      sameAs: ["https://www.linkedin.com/company/deepbridge-advisory"],
      areaServed: ["United Kingdom", "Europe"],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: siteUrl,
      name: seo.siteName,
      inLanguage: "en-GB",
      publisher: { "@id": organisationId },
    },
  ];

  if (meta.type === "article") {
    graph.push({
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      headline: meta.title.replace(/ \| DeepBridge(?: Advisory)?$/, ""),
      description: meta.description,
      datePublished: meta.published,
      dateModified: meta.modified,
      inLanguage: "en-GB",
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      author: { "@id": organisationId },
      publisher: { "@id": organisationId },
      image: socialImageUrl,
    });
  }

  graph.push({
    "@type": path === "/insights" ? "CollectionPage" : "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: meta.title,
    description: meta.description,
    inLanguage: "en-GB",
    isPartOf: { "@id": websiteId },
    about: { "@id": organisationId },
  });

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
    .replaceAll("<", "\\u003c");
}

function renderPage(path, meta) {
  const pageUrl = `${siteUrl}${path === "/" ? "/" : path}`;
  const robots =
    path === "/404"
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large";
  let html = sourceHtml;

  html = replaceTag(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(meta.title)}</title>`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  );

  const tags = [
    [
      /<link\s+rel="canonical"[\s\S]*?\/>/i,
      `<link rel="canonical" href="${pageUrl}" />`,
    ],
    [
      /<meta\s+name="robots"[\s\S]*?\/>/i,
      `<meta name="robots" content="${robots}" />`,
    ],
    [
      /<meta\s+property="og:title"[\s\S]*?\/>/i,
      `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    ],
    [
      /<meta\s+property="og:description"[\s\S]*?\/>/i,
      `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    ],
    [
      /<meta\s+property="og:url"[\s\S]*?\/>/i,
      `<meta property="og:url" content="${pageUrl}" />`,
    ],
    [
      /<meta\s+property="og:image"[\s\S]*?\/>/i,
      `<meta property="og:image" content="${socialImageUrl}" />`,
    ],
    [
      /<meta\s+property="og:type"[\s\S]*?\/>/i,
      `<meta property="og:type" content="${meta.type ?? "website"}" />`,
    ],
    [
      /<meta\s+name="twitter:title"[\s\S]*?\/>/i,
      `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    ],
    [
      /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
      `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    ],
    [
      /<meta\s+name="twitter:image"[\s\S]*?\/>/i,
      `<meta name="twitter:image" content="${socialImageUrl}" />`,
    ],
  ];

  for (const [pattern, replacement] of tags) {
    html = replaceTag(html, pattern, replacement);
  }

  html = html.replace(
    "</head>",
    `    <script id="deepbridge-structured-data" type="application/ld+json">${structuredData(path, meta, pageUrl)}</script>\n  </head>`,
  );

  if (meta.type === "article") {
    html = html.replace(
      "</head>",
      `    <meta property="article:published_time" content="${meta.published}" />\n    <meta property="article:modified_time" content="${meta.modified}" />\n  </head>`,
    );
  }

  return html;
}

for (const [path, meta] of Object.entries(seo.pages)) {
  const outputPath =
    path === "/"
      ? resolve(distDirectory, "index.html")
      : resolve(distDirectory, `${path.slice(1)}.html`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderPage(path, meta));
}

const publicPaths = Object.keys(seo.pages).filter((path) => path !== "/404");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPaths
  .map(
    (path) => {
      const meta = seo.pages[path];
      const lastModified = meta.lastModified
        ? `<lastmod>${meta.lastModified}</lastmod>`
        : "";
      return `  <url><loc>${siteUrl}${path === "/" ? "/" : path}</loc>${lastModified}</url>`;
    },
  )
  .join("\n")}
</urlset>
`;

await writeFile(resolve(distDirectory, "sitemap.xml"), sitemap);
