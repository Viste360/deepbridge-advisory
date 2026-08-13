import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const siteUrl = "https://www.deepbridgeadvisory.co.uk";
const key = "c1be7509de387bf20934402b1f506902";
const sitemap = await readFile(resolve("public/sitemap.xml"), "utf8");
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (match) => match[1],
);

if (urlList.length === 0) {
  throw new Error("No public URLs were found in public/sitemap.xml.");
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList,
  }),
});

if (!response.ok) {
  throw new Error(
    `IndexNow returned ${response.status}: ${await response.text()}`,
  );
}

console.log(`Submitted ${urlList.length} URLs to IndexNow (${response.status}).`);
