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
    (path) =>
      `  <url><loc>${siteUrl}${path === "/" ? "/" : path}</loc></url>`,
  )
  .join("\n")}
</urlset>
`;

await writeFile(resolve(distDirectory, "sitemap.xml"), sitemap);
