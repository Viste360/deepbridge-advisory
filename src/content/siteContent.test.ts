import { describe, expect, it } from "vitest";
import { getExpertise, getProcessSteps, getSiteContent } from "./siteContent";
import { company, pageMeta, primaryNavigation } from "../config/site";

describe("site content integrity", () => {
  it("preserves verified company identity and existing client and professional routes", () => {
    expect(company.legalName).toBe("DEEPBRIDGE ADVISORY LTD");
    expect(company.companyNumber).toBe("16775578");
    expect(pageMeta["/for-clients"]?.title).toBeTruthy();
    expect(pageMeta["/for-consultants"]?.title).toBeTruthy();
    expect(pageMeta["/opportunities"]?.title).toBeTruthy();
    expect(primaryNavigation.some((item) => item.href === "/for-clients")).toBe(true);
  });

  it.each(["en", "de", "es"] as const)("explains the three expertise groups and full delivery process in %s", (locale) => {
    const expertise = getExpertise(locale);
    expect(expertise).toHaveLength(3);
    expertise.forEach((service) => {
      expect(service.title).toBeTruthy();
      expect(service.summary).toBeTruthy();
      expect(service.details).toHaveLength(5);
      expect(service.situation).toBeTruthy();
      expect(service.assignment).toBeTruthy();
      expect(service.outputs).toBeTruthy();
      expect(service.start).toBeTruthy();
    });
    expect(getProcessSteps(locale).map((step) => step.number)).toEqual(["01", "02", "03", "04", "05"]);
    expect(getSiteContent(locale).engagementModels).toHaveLength(3);
    expect(getSiteContent(locale).consultantJourney).toHaveLength(5);
  });

  it.each(["de", "es"] as const)("provides complete %s content for every shared journey", (locale) => {
    expect(getExpertise(locale).map((service) => service.title)).not.toEqual(getExpertise("en").map((service) => service.title));
    expect(getProcessSteps(locale).every((step, index) => step.title !== getProcessSteps("en")[index].title)).toBe(true);
    const english = getSiteContent("en");
    const translated = getSiteContent(locale);
    for (const key of Object.keys(english) as (keyof typeof english)[]) {
      expect(translated[key]).toHaveLength(english[key].length);
      expect(translated[key]).not.toEqual(english[key]);
    }
  });

  it("keeps the European cities as strategic focus without inventing physical offices", () => {
    expect(getSiteContent("en").operatingRegions.map((region) => region.name)).toEqual(["London", "Munich", "Madrid"]);
    expect(getSiteContent("de").operatingRegions.map((region) => region.name)).toEqual(["London", "München", "Madrid"]);
    expect(getSiteContent("es").operatingRegions.map((region) => region.name)).toEqual(["Londres", "Múnich", "Madrid"]);
    expect(getSiteContent("en").operatingRegions.slice(1).every((region) => region.detail.includes("strategic focus"))).toBe(true);
  });

  it("provides metadata for every primary route", () => {
    primaryNavigation.forEach((item) => {
      expect(pageMeta[item.href]?.title).toBeTruthy();
      expect(pageMeta[item.href]?.description).toBeTruthy();
    });
    expect(pageMeta["/404"]?.title).toContain("Page Not Found");
  });
});
