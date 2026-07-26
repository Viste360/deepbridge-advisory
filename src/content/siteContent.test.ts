import { describe, expect, it } from "vitest";
import { expertise, processSteps } from "./siteContent";
import { company, pageMeta, primaryNavigation } from "../config/site";

describe("site content integrity", () => {
  it("keeps the core operating details and journeys complete", () => {
    expect(company.legalName).toBe("DUSTDEEP LTD");
    expect(company.companyNumber).toBe("16775578");
    expect(expertise).toHaveLength(4);
    expect(processSteps).toHaveLength(4);
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
  });
});
