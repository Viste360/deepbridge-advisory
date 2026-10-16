import { describe, expect, it } from "vitest";
import { validateContactValue } from "./contactValidation";

describe("public enquiry validation", () => {
  it("rejects whitespace-only required fields and accepts omitted optional fields", () => {
    expect(validateContactValue("  ", { required: true })).toBe("required");
    expect(validateContactValue("  ", { type: "url" })).toBeUndefined();
    expect(validateContactValue(" SAP S/4HANA ", { required: true })).toBeUndefined();
  });

  it("accepts valid email addresses without restricting company domains", () => {
    expect(validateContactValue("person+project@example.de", { type: "email" })).toBeUndefined();
    expect(validateContactValue("name@example", { type: "email" })).toBe("email");
    expect(validateContactValue("name with space@example.de", { type: "email" })).toBe("email");
  });

  it("requires full web URLs and rejects non-web schemes", () => {
    expect(validateContactValue("https://www.linkedin.com/in/example", { type: "url" })).toBeUndefined();
    expect(validateContactValue("www.linkedin.com/in/example", { type: "url" })).toBe("url");
    expect(validateContactValue("javascript:alert(1)", { type: "url" })).toBe("url");
  });

  it("checks the configured length without altering user input", () => {
    expect(validateContactValue("abcd", { maxLength: 3 })).toBe("tooLong");
    expect(validateContactValue("abc", { maxLength: 3 })).toBeUndefined();
  });
});
