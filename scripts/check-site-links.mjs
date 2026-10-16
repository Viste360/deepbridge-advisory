import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["en", "de", "es"];
const routeLocale = (path) => path.match(/^\/(de|es)(?:\/|$)/)?.[1] ?? "en";
const basePath = (path) => path.replace(/^\/(de|es)(?=\/|$)/, "") || "/";
const localizePath = (path, locale) => locale === "en" ? path : path === "/" ? `/${locale}` : `/${locale}${path}`;
const enquiryTypes = new Set(["client", "consultant", "general"]);

function decodeHtml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, entity) => {
    if (entity.startsWith("#")) {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code <= 0x10ffff ? String.fromCodePoint(code) : "\ufffd";
    }
    return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[entity.toLowerCase()];
  });
}

// The generator emits ordinary, quoted HTML. Ignore raw script/style contents so
// strings inside bundles or JSON-LD cannot be mistaken for actual DOM links.
function parseMarkup(html) {
  const markup = html.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(<(script|style)\b[^>]*>)[\s\S]*?<\/\2\s*>/gi, "$1");
  const tags = [];
  const ids = new Set();
  const duplicateIds = new Set();
  for (const match of markup.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const attrs = {};
    for (const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[attr[1].toLowerCase()] = decodeHtml(attr[2] ?? attr[3] ?? attr[4] ?? "");
    }
    if (attrs.id) {
      if (ids.has(attrs.id)) duplicateIds.add(attrs.id);
      ids.add(attrs.id);
    }
    tags.push({ name: match[1].toLowerCase(), attrs });
  }
  return { tags, ids, duplicateIds };
}

function describe(tag) {
  const identity = tag.attrs.id ? `#${tag.attrs.id}` : tag.attrs.name ? `[name="${tag.attrs.name}"]` : "";
  return `<${tag.name}${identity}>`;
}

/** Run while the build-time renderer is loaded. These URLs are rendered, never submitted. */
export function assertRenderedContactRoutes(renderPage) {
  const requiredFields = {
    client: ["name", "company", "email", "projectLocation", "expertiseRequired", "message"],
    consultant: ["name", "email", "currentLocation", "primaryExpertise", "languages", "availability"],
    general: ["name", "email", "message"],
  };
  const errors = [];
  for (const locale of locales) {
    for (const type of enquiryTypes) {
      const route = `${localizePath("/contact", locale)}?type=${type}#contact-form`;
      const { tags, ids } = parseMarkup(renderPage(route).html);
      const field = (name) => tags.find((tag) => ["input", "textarea", "select"].includes(tag.name) && tag.attrs.name === name);
      const form = tags.find((tag) => tag.name === "form" && tag.attrs.id === "contact-form");
      if (!form || !ids.has("contact-form")) errors.push(`${route}: missing target form #contact-form`);
      if (field("enquiryType")?.attrs.value !== type) errors.push(`${route}: rendered the wrong enquiry type`);
      if (field("language")?.attrs.value !== locale) errors.push(`${route}: rendered the wrong form language`);
      for (const name of requiredFields[type]) {
        if (!field(name) || !("required" in field(name).attrs)) errors.push(`${route}: missing required field ${name}`);
      }
      if (!tags.some((tag) => tag.name === "button" && tag.attrs.type === "submit")) errors.push(`${route}: missing submit button`);
      if (!tags.some((tag) => tag.name === "a" && tag.attrs.href === localizePath("/privacy", locale))) errors.push(`${route}: missing localized privacy link`);
      const languageLinks = tags.filter((item) => item.name === "a" && item.attrs.hreflang);
      for (const language of locales) {
        if (!languageLinks.some((tag) => tag.attrs.hreflang === language)) errors.push(`${route}: missing ${language} language switch`);
      }
      for (const tag of languageLinks) {
        const target = new URL(tag.attrs.href, "https://deepbridgeadvisory.com");
        const expectedPath = localizePath("/contact", tag.attrs.hreflang);
        if (target.pathname !== expectedPath || target.searchParams.get("type") !== type || target.hash !== "#contact-form") {
          errors.push(`${route}: language switch loses the selected enquiry type or form anchor: ${tag.attrs.href}`);
        }
      }
    }
  }
  if (errors.length) throw new Error(`Contact route validation failed:\n- ${errors.join("\n- ")}`);
  console.log("Verified all 9 localized contact form selections without submitting enquiries.");
}

async function auditSite(distDirectory) {
  const seo = JSON.parse(await readFile(resolve(projectRoot, "src/config/seo.json"), "utf8"));
  const vercel = JSON.parse(await readFile(resolve(projectRoot, "vercel.json"), "utf8"));
  const siteUrl = seo.siteUrl.replace(/\/$/, "");
  const origin = new URL(siteUrl).origin;
  const errors = new Set();
  const pages = new Map();
  const external = new Map();
  const assetPaths = new Set();
  const localTargets = new Set();
  const fileCache = new Map();
  let linkCount = 0;
  let anchorCount = 0;
  let assetCount = 0;
  const fail = (source, detail) => errors.add(`${source}: ${detail}`);

  if (vercel.cleanUrls !== true) fail("vercel.json", "cleanUrls must be true for the extensionless public routes");
  if (vercel.trailingSlash !== false) fail("vercel.json", "trailingSlash must be false to match public canonical URLs");

  const read = async (file) => {
    if (!fileCache.has(file)) fileCache.set(file, readFile(file, "utf8").catch(() => null));
    return fileCache.get(file);
  };
  const existingFile = async (path) => {
    const file = resolve(distDirectory, `.${path}`);
    const rel = relative(distDirectory, file);
    if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) return null;
    try { return (await stat(file)).isFile() ? file : null; } catch { return null; }
  };
  const routeFile = (route) => resolve(distDirectory, route === "/" ? "index.html" : `${route.slice(1)}.html`);

  for (const route of Object.keys(seo.pages)) {
    const file = routeFile(route);
    const html = await read(file);
    if (html === null) { fail(route, `missing generated clean-URL page ${relative(projectRoot, file)}; run npm run build`); continue; }
    pages.set(route, { route, html, ...parseMarkup(html) });
  }

  async function checkReference(value, source, { page, kind = "link", tag, baseUrl } = {}) {
    if (kind === "asset") assetCount += 1;
    else linkCount += 1;
    if (typeof value !== "string" || !value.trim() || value.trim() === "#") { fail(source, `empty or placeholder ${kind}`); return; }
    const href = value.trim();
    if (/^(data|blob):/i.test(href)) {
      if (kind !== "asset") fail(source, `unsupported navigation URL ${href.slice(0, 60)}`);
      return;
    }
    let url;
    try { url = new URL(href, baseUrl ?? `${siteUrl}${page?.route ?? "/"}`); } catch { fail(source, `invalid URL ${href}`); return; }
    if (["mailto:", "tel:"].includes(url.protocol)) {
      if (url.protocol === "mailto:" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname)) fail(source, `invalid email link ${href}`);
      if (url.protocol === "tel:" && !/^[+\d(). -]+$/.test(url.pathname)) fail(source, `invalid telephone link ${href}`);
    } else if (!["http:", "https:"].includes(url.protocol)) { fail(source, `unsupported URL protocol ${href}`); return; }
    if (url.origin !== origin) {
      if (/^(www\.)?deepbridgeadvisory\.co\.uk$/.test(url.hostname)) fail(source, `stale website domain ${href}`);
      if (!external.has(href)) external.set(href, new Set());
      external.get(href).add(kind);
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { fail(source, `invalid encoded path ${href}`); return; }
    if (pathname !== "/" && pathname.endsWith("/")) fail(source, `unnecessary trailing-slash redirect: ${href}`);
    if (pathname.endsWith(".html")) fail(source, `use the extensionless clean URL: ${href}`);
    const target = pages.get(pathname);
    if (target && kind !== "asset") {
      localTargets.add(`${pathname}${url.search}${url.hash}`);
      if (tag?.name === "a" && page) {
        if (tag.attrs.hreflang) {
          const lang = tag.attrs.hreflang;
          const expected = localizePath(basePath(page.route), lang);
          if (!locales.includes(lang) || pathname !== expected) fail(source, `language switch must preserve the equivalent page: ${href}`);
        } else if (routeLocale(pathname) !== routeLocale(page.route)) {
          fail(source, `internal navigation changes language without a language switch: ${href}`);
        }
      }
      if (url.searchParams.has("type")) {
        const types = url.searchParams.getAll("type");
        if (basePath(pathname) !== "/contact" || types.length !== 1 || !enquiryTypes.has(types[0])) fail(source, `invalid contact form selector: ${href}`);
        if (!target.tags.some((item) => item.name === "form" && item.attrs.id === "contact-form")) fail(source, `contact destination has no form: ${href}`);
      }
      if (url.hash) {
        anchorCount += 1;
        let id;
        try { id = decodeURIComponent(url.hash.slice(1)); } catch { fail(source, `invalid encoded anchor ${href}`); return; }
        if (!target.ids.has(id)) fail(source, `missing anchor #${id} on ${pathname} (linked as ${href})`);
      }
      return;
    }
    const file = await existingFile(pathname);
    if (!file) { fail(source, `missing ${kind === "asset" ? "asset" : "route or file"} ${href}`); return; }
    assetPaths.add(pathname);
    if (kind === "asset" && extname(pathname) === ".html") fail(source, `asset resolves to an HTML page: ${href}`);
  }

  for (const page of pages.values()) {
    const { route, tags } = page;
    const sourceFor = (tag) => `${route} ${describe(tag)}`;
    for (const duplicate of page.duplicateIds) fail(route, `duplicate id #${duplicate} makes anchors ambiguous`);
    const html = tags.find((tag) => tag.name === "html");
    if (html?.attrs.lang !== routeLocale(route)) fail(route, "incorrect document language");
    if (tags.filter((tag) => tag.name === "h1").length !== 1) fail(route, "expected exactly one H1");
    const canonical = tags.filter((tag) => tag.name === "link" && tag.attrs.rel === "canonical");
    if (canonical.length !== 1 || canonical[0].attrs.href !== `${siteUrl}${route}`) fail(route, "canonical URL must exactly match its generated route");
    const alternates = tags.filter((tag) => tag.name === "link" && tag.attrs.hreflang);
    const expectedAlternates = { ...Object.fromEntries(locales.map((locale) => [locale, `${siteUrl}${localizePath(basePath(route), locale)}`])), "x-default": `${siteUrl}${basePath(route)}` };
    if (basePath(route) !== "/404") {
      if (alternates.length !== 4) fail(route, "expected one en, de, es and x-default hreflang link");
      for (const [lang, href] of Object.entries(expectedAlternates)) {
        if (alternates.filter((tag) => tag.attrs.hreflang === lang && tag.attrs.href === href).length !== 1) fail(route, `incorrect or missing ${lang} hreflang ${href}`);
      }
    }
    for (const locale of locales) {
      if (!tags.some((tag) => tag.name === "a" && tag.attrs.hreflang === locale)) fail(route, `missing ${locale} navigation language switch`);
    }
    for (const tag of tags) {
      if (tag.name === "a" && !("href" in tag.attrs)) fail(sourceFor(tag), "anchor has no href; use a button for an action");
      if ("href" in tag.attrs) {
        const asset = tag.name === "link" && ["stylesheet", "icon", "apple-touch-icon", "preload", "modulepreload"].includes(tag.attrs.rel);
        await checkReference(tag.attrs.href, sourceFor(tag), { page, kind: asset ? "asset" : "link", tag });
      }
      for (const attribute of ["src", "poster"]) {
        if (attribute in tag.attrs) await checkReference(tag.attrs[attribute], `${sourceFor(tag)} ${attribute}`, { page, kind: "asset", tag });
      }
      for (const attribute of ["srcset", "imagesrcset"]) {
        if (tag.attrs[attribute] && !tag.attrs[attribute].startsWith("data:")) {
          for (const candidate of tag.attrs[attribute].split(",")) await checkReference(candidate.trim().split(/\s+/)[0], `${sourceFor(tag)} ${attribute}`, { page, kind: "asset", tag });
        }
      }
      if (tag.name === "form") {
        if (!tag.attrs.action) fail(sourceFor(tag), "form has no submission action");
        else await checkReference(tag.attrs.action, `${sourceFor(tag)} action`, { page, kind: "form action", tag });
      }
      if (tag.name === "meta" && ["og:image", "twitter:image"].includes(tag.attrs.property ?? tag.attrs.name)) await checkReference(tag.attrs.content, sourceFor(tag), { page, kind: "asset", tag });
      for (const attribute of ["for", "aria-labelledby", "aria-describedby", "aria-controls"]) {
        for (const id of (tag.attrs[attribute] ?? "").split(/\s+/).filter(Boolean)) {
          if (!page.ids.has(id)) fail(sourceFor(tag), `${attribute} references missing #${id}`);
        }
      }
    }
  }

  // Check referenced CSS recursively, including fonts and images that do not
  // appear as image tags. CSS URLs resolve relative to the stylesheet itself.
  const cssQueue = [...assetPaths].filter((path) => path.endsWith(".css"));
  const checkedCss = new Set();
  for (let index = 0; index < cssQueue.length; index += 1) {
    const path = cssQueue[index];
    if (checkedCss.has(path)) continue;
    checkedCss.add(path);
    const css = await read(await existingFile(path));
    for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)|@import\s+["']([^"']+)["']/g)) {
      const href = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (href.startsWith("#")) continue;
      await checkReference(href, path, { kind: "asset", baseUrl: `${siteUrl}${path}` });
      const target = new URL(href, `${siteUrl}${path}`);
      if (target.origin === origin && target.pathname.endsWith(".css") && await existingFile(target.pathname)) cssQueue.push(target.pathname);
    }
  }

  // Vite's generated module-preload maps and worker URLs also contain asset
  // references. Check those local assets without requesting the secure portal.
  const assetDirectory = resolve(distDirectory, "assets");
  const emittedAssets = await readdir(assetDirectory).catch(() => []);
  for (const filename of emittedAssets.filter((name) => name.endsWith(".js"))) {
    const js = await read(resolve(assetDirectory, filename));
    for (const match of js.matchAll(/["'`]((?:\/assets\/|\.\/|assets\/)[^"'`\s]+\.(?:js|css|woff2?|png|webp|svg))(?:["'`])(?!\s*:)/g)) {
      const href = match[1].startsWith("assets/") ? `/${match[1]}` : match[1];
      await checkReference(href, `/assets/${filename}`, { kind: "asset", baseUrl: `${siteUrl}/assets/${filename}` });
    }
  }

  const sitemap = await read(resolve(distDirectory, "sitemap.xml"));
  if (sitemap === null) fail("sitemap.xml", "missing sitemap");
  else {
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]));
    const expected = Object.keys(seo.pages).filter((route) => basePath(route) !== "/404").map((route) => `${siteUrl}${route}`);
    for (const url of expected) if (locations.filter((item) => item === url).length !== 1) fail("sitemap.xml", `missing or duplicated route ${url}`);
    for (const url of locations) {
      if (!expected.includes(url)) fail("sitemap.xml", `unexpected or unindexable route ${url}`);
      await checkReference(url, "sitemap.xml <loc>");
    }
    for (const entry of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const location = entry[1].match(/<loc>([^<]+)<\/loc>/)?.[1];
      if (!location) { fail("sitemap.xml", "entry has no location"); continue; }
      const route = basePath(new URL(decodeHtml(location)).pathname);
      const links = parseMarkup(entry[1]).tags.filter((tag) => tag.name === "xhtml:link");
      const expectedLinks = { ...Object.fromEntries(locales.map((locale) => [locale, `${siteUrl}${localizePath(route, locale)}`])), "x-default": `${siteUrl}${route}` };
      if (links.length !== 4) fail("sitemap.xml", `${location} must have four language alternatives`);
      for (const [locale, href] of Object.entries(expectedLinks)) {
        if (links.filter((tag) => tag.attrs.hreflang === locale && tag.attrs.href === href).length !== 1) fail("sitemap.xml", `${location} has incorrect or missing ${locale} alternate`);
      }
      for (const tag of links) await checkReference(tag.attrs.href, "sitemap.xml hreflang");
    }
  }
  for (const filename of ["robots.txt", "llms.txt", "llms-full.txt"]) {
    const text = await read(resolve(distDirectory, filename));
    if (text === null) { fail(filename, "missing public file"); continue; }
    for (const match of text.matchAll(/https?:\/\/[^\s<>\])]+/g)) await checkReference(match[0].replace(/[.,;]+$/, ""), filename);
  }

  if (errors.size) {
    console.error(`Site link validation failed (${errors.size} issue${errors.size === 1 ? "" : "s"}):\n${[...errors].map((error) => `  - ${error}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Site links passed: ${pages.size} public routes, ${linkCount} link references, ${localTargets.size} distinct internal destinations, ${anchorCount} anchors, ${assetCount} asset references (${assetPaths.size} distinct files).`);
  console.log("Vercel clean URLs, localized navigation, canonical/hreflang, form selectors, sitemap and accessibility references passed.");
  console.log("External destinations inventoried; no external requests or form submissions made:");
  for (const [url, kinds] of [...external].sort(([a], [b]) => a.localeCompare(b))) console.log(`  - ${url} [${[...kinds].join(", ")}]`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--dist-dir")) {
    console.error("Usage: node scripts/check-site-links.mjs [--dist-dir path]");
    process.exitCode = 1;
  } else {
    await auditSite(resolve(args[1] ?? resolve(projectRoot, "dist"))).catch((error) => {
      console.error(`Site link validation could not complete: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
