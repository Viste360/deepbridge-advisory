import { describe, expect, it } from "vitest";
import { consultantJourney, expertise, processSteps } from "./siteContent";
import { company, pageMeta, primaryNavigation } from "../config/site";
import seo from "../config/seo.json";

describe("site content integrity", () => {
  it("keeps the core operating details and journeys complete", () => {
    expect(company.legalName).toBe("DUSTDEEP LTD");
    expect(company.companyNumber).toBe("16775578");
    expect(expertise).toHaveLength(4);
    expect(processSteps).toHaveLength(4);
    expect(consultantJourney).toHaveLength(5);
    expect(primaryNavigation.some((item) => item.href === "/for-clients")).toBe(
      true,
    );
    expect(
      primaryNavigation.some((item) => item.href === "/for-consultants"),
    ).toBe(true);
  });

  it("provides metadata for every primary route", () => {
    primaryNavigation.forEach((item) => {
      expect(pageMeta[item.href]?.title).toBeTruthy();
      expect(pageMeta[item.href]?.description).toBeTruthy();
    });
    expect(pageMeta["/404"]?.title).toContain("Page Not Found");
    expect(seo.siteUrl).toBe("https://www.deepbridgeadvisory.co.uk");
  });
});
