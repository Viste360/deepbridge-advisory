import { describe, expect, it } from "vitest";
import { basePath, localizePath, routeLocale, locales } from "./i18n";

describe("public language routing", () => {
  it("preserves the professional route, enquiry type and focus anchor", () => {
    expect(localizePath("/contact?type=consultant#contact-form", "de")).toBe("/de/contact?type=consultant#contact-form");
    expect(localizePath("/de/contact?type=consultant#contact-form", "en")).toBe("/contact?type=consultant#contact-form");
  });
  it("keeps article slugs and expertise anchors stable across languages", () => {
    expect(localizePath("/insights/building-cross-border-transformation-teams-uk-europe", "de")).toBe("/de/insights/building-cross-border-transformation-teams-uk-europe");
    expect(localizePath("/de/expertise#leadership", "en")).toBe("/expertise#leadership");
  });
  it("uses the existing English home URL and a clean German home URL", () => {
    expect(localizePath("/", "de")).toBe("/de");
    expect(localizePath("/de", "en")).toBe("/");
    expect(localizePath("/de/about", "de")).toBe("/de/about");
  });
  it("does not misidentify unrelated routes or alter external links", () => {
    expect(routeLocale("/demo")).toBe("en");
    expect(basePath("/details")).toBe("/details");
    expect(routeLocale("/estimates")).toBe("en");
    expect(basePath("/escalation")).toBe("/escalation");
    expect(localizePath("https://portal.deepbridgeadvisory.com/login", "de")).toBe("https://portal.deepbridgeadvisory.com/login");
    expect(localizePath("mailto:hello@deepbridgeadvisory.co.uk", "de")).toBe("mailto:hello@deepbridgeadvisory.co.uk");
  });

  it.each(locales)("switches from %s to every language without losing the enquiry or anchor", (source) => {
    const origin = localizePath("/contact?type=consultant#contact-form", source);
    for (const target of locales) {
      const translated = localizePath(origin, target);
      expect(translated).toBe(`${target === "en" ? "" : `/${target}`}/contact?type=consultant#contact-form`);
      expect(routeLocale(translated.split("?")[0])).toBe(target);
    }
  });

  it("keeps Spanish home and article routes stable through language changes", () => {
    expect(localizePath("/de", "es")).toBe("/es");
    expect(localizePath("/es", "en")).toBe("/");
    expect(basePath("/es/expertise")).toBe("/expertise");
    expect(localizePath("/es/insights/defining-transformation-consultant-requirement", "de")).toBe("/de/insights/defining-transformation-consultant-requirement");
  });
});
