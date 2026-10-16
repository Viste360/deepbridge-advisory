export type ContactValidationError = "required" | "email" | "url" | "tooLong";

export type ContactFieldRule = {
  required?: boolean;
  type?: string;
  maxLength?: number;
};

/** Validate the public enquiry fields without sending data to the form provider. */
export function validateContactValue(
  value: string,
  rule: ContactFieldRule,
): ContactValidationError | undefined {
  const trimmed = value.trim();
  if (!trimmed) return rule.required ? "required" : undefined;
  if (rule.maxLength && value.length > rule.maxLength) return "tooLong";
  if (rule.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "email";
  }
  if (rule.type === "url") {
    try {
      const url = new URL(trimmed);
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".")) {
        return "url";
      }
    } catch {
      return "url";
    }
  }
  return undefined;
}
