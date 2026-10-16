import { describe, expect, it } from "vitest";
import { parseMarkup } from "./check-site-links.mjs";

describe("site link markup parsing", () => {
  it("does not join an attribute name across a removed comment", () => {
    const { tags } = parseMarkup('<a hr<!-- ignored -->ef="/invented">Link</a>');
    expect(tags[0].attrs).not.toHaveProperty("href");
  });

  it("does not join a tag name across a removed comment", () => {
    const { tags } = parseMarkup('<im<!-- ignored -->g src="/invented.png">');
    expect(tags.some((tag) => tag.name === "img")).toBe(false);
  });

  it("keeps real links while ignoring tags inside comments and raw content", () => {
    const { tags, ids } = parseMarkup(`
      <!-- <a id="commented" href="/hidden">Hidden</a> -->
      <script type="application/ld+json">{"example":"<a href='/script'>"}</script>
      <style>.example::after { content: '<a href="/style">'; }</style>
      <a id="real" href="/contact?type=client&amp;source=footer">Contact</a>
    `);
    expect(tags.filter((tag) => tag.name === "a")).toEqual([
      { name: "a", attrs: { id: "real", href: "/contact?type=client&source=footer" } },
    ]);
    expect([...ids]).toEqual(["real"]);
  });
});
