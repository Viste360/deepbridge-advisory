import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { assertRenderedContactRoutes } from "./check-site-links.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");
const seo = JSON.parse(await readFile(resolve(projectRoot, "src/config/seo.json"), "utf8"));
const sourceHtml = await readFile(resolve(distDirectory, "index.html"), "utf8");
const siteUrl = seo.siteUrl.replace(/\/$/, "");
const socialImageUrl = `${siteUrl}${seo.socialImagePath}`;

const locales = ["en", "de", "es"];
const routeLocale = (path) => path.match(/^\/(de|es)(?:\/|$)/)?.[1] ?? "en";
const basePath = (path) => path.replace(/^\/(de|es)(?=\/|$)/, "") || "/";
const localizePath = (path, locale) => locale === "en" ? path : path === "/" ? `/${locale}` : `/${locale}${path}`;
const openGraphLocale = { en: "en_GB", de: "de_DE", es: "es_ES" };
const imageAlt = {
  en: "DeepBridge Advisory — Industrial transformation and project delivery",
  de: "DeepBridge Advisory — Industrielle Transformation und Projektumsetzung",
  es: "DeepBridge Advisory — Transformación industrial y ejecución de proyectos",
};
const canonical = (path) => `${siteUrl}${path}`;

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html)
    ? html.replace(pattern, () => replacement)
    : html.replace("</head>", () => `    ${replacement}\n  </head>`);
}

function renderDocument(path, meta, rendered) {
  const locale = routeLocale(path);
  const route = basePath(path);
  const pageUrl = canonical(path);
  const robots = route === "/404" ? "noindex, nofollow" : "index, follow, max-image-preview:large";
  let html = sourceHtml.replace(/<html[^>]*>/i, `<html lang="${locale}">`);
  // Vite may remove the optional slash from void tags in production output.
  const metaTag = (attribute, key, value) => [
    new RegExp(`<meta\\s+${attribute}="${key}"[^>]*>`, "i"),
    `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`,
  ];
  const tags = [
    [/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`],
    metaTag("name", "description", meta.description),
    [/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${pageUrl}" />`],
    metaTag("name", "robots", robots),
    metaTag("property", "og:title", meta.title),
    metaTag("property", "og:description", meta.description),
    metaTag("property", "og:url", pageUrl),
    metaTag("property", "og:image", socialImageUrl),
    metaTag("property", "og:type", meta.type ?? "website"),
    metaTag("property", "og:locale", openGraphLocale[locale]),
    metaTag("name", "twitter:title", meta.title),
    metaTag("name", "twitter:description", meta.description),
    metaTag("name", "twitter:image", socialImageUrl),
    metaTag("property", "og:image:alt", imageAlt[locale]),
    metaTag("name", "twitter:image:alt", imageAlt[locale]),
  ];
  for (const [pattern, replacement] of tags) html = replaceTag(html, pattern, replacement);
  html = html.replace(/\s*<link\b[^>]*hreflang=[^>]*>/gi, "");
  html = html.replace(/\s*<meta\s+property="og:locale:alternate"[^>]*>/gi, "");
  const alternateLocales = locales.filter((other) => other !== locale)
    .map((other) => `<meta property="og:locale:alternate" content="${openGraphLocale[other]}" />`).join("\n    ");
  const alternates = route === "/404" ? "" : [
    ...locales.map((other) => `<link rel="alternate" hreflang="${other}" href="${canonical(localizePath(route, other))}" />`),
    `<link rel="alternate" hreflang="x-default" href="${canonical(route)}" />`,
  ].join("\n    ");
  const articleTags = meta.type === "article"
    ? `<meta property="article:published_time" content="${escapeHtml(meta.published)}" />\n    <meta property="article:modified_time" content="${escapeHtml(meta.modified)}" />`
    : "";
  const json = JSON.stringify(rendered.schema).replaceAll("<", "\\u003c");
  html = html.replace("</head>", () => `    ${alternates}\n    ${alternateLocales}\n    ${articleTags}\n    <script id="deepbridge-structured-data" type="application/ld+json">${json}</script>\n  </head>`);
  // The real page content is searchable and readable before JavaScript runs.
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>\s*/i, "");
  html = html.replace('<div id="root"></div>', () => `<div id="root" data-prerendered="${escapeHtml(path)}">${rendered.html}</div>`);
  return html;
}

// Keep server bundles outside dist, so only public client assets are deployed.
const ssrDirectory = await mkdtemp(resolve(projectRoot, ".deepbridge-prerender-"));
try {
  await build({
    root: projectRoot,
    logLevel: "warn",
    build: {
      ssr: resolve(projectRoot, "src/entry-server.tsx"),
      outDir: ssrDirectory,
      emptyOutDir: false,
      copyPublicDir: false,
      rollupOptions: { output: { entryFileNames: "entry-server.mjs" } },
    },
  });
  const { renderPage } = await import(pathToFileURL(resolve(ssrDirectory, "entry-server.mjs")).href);
  assertRenderedContactRoutes(renderPage);
  for (const [path, meta] of Object.entries(seo.pages)) {
    const outputPath = path === "/" ? resolve(distDirectory, "index.html") : resolve(distDirectory, `${path.slice(1)}.html`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, renderDocument(path, meta, renderPage(path)));
  }
} finally {
  await rm(ssrDirectory, { recursive: true, force: true });
}

const publicPaths = Object.keys(seo.pages).filter((path) => basePath(path) !== "/404");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${publicPaths.map((path) => {
  const meta = seo.pages[path];
  const route = basePath(path);
  const lastModified = meta.lastModified ? `<lastmod>${meta.lastModified}</lastmod>` : "";
  const alternates = locales.map((locale) => `<xhtml:link rel="alternate" hreflang="${locale}" href="${canonical(localizePath(route, locale))}"/>`).join("");
  return `  <url><loc>${canonical(path)}</loc>${lastModified}${alternates}<xhtml:link rel="alternate" hreflang="x-default" href="${canonical(route)}"/></url>`;
}).join("\n")}
</urlset>
`;
await writeFile(resolve(distDirectory, "sitemap.xml"), sitemap);
console.log(`Prerendered ${Object.keys(seo.pages).length} public English, German and Spanish routes.`);
