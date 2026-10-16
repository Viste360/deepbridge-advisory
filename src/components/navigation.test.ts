import { afterEach, describe, expect, it, vi } from "vitest";
import { focusFragment, fragmentId } from "./navigation";

afterEach(() => vi.unstubAllGlobals());

describe("section navigation", () => {
  it("resolves encoded anchors and safely handles malformed URL fragments", () => {
    expect(fragmentId("#contact%2Dform")).toBe("contact-form");
    expect(fragmentId("#caf%C3%A9")).toBe("café");
    expect(fragmentId("#invalid%zz")).toBe("invalid%zz");
    expect(fragmentId("")).toBe("");
  });
  it("scrolls and focuses an encoded destination every time the link is followed", () => {
    const target = { hasAttribute: () => false, matches: () => false, setAttribute: vi.fn(), scrollIntoView: vi.fn(), focus: vi.fn() };
    const getElementById = vi.fn(() => target);
    vi.stubGlobal("document", { getElementById });
    expect(focusFragment("#contact%2Dform")).toBe(true);
    expect(focusFragment("#contact%2Dform")).toBe(true);
    expect(getElementById).toHaveBeenCalledWith("contact-form");
    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(target.setAttribute).toHaveBeenCalledWith("tabindex", "-1");
  });
  it("preserves normal input keyboard behaviour and ignores absent destinations", () => {
    const target = { hasAttribute: () => false, matches: () => true, setAttribute: vi.fn(), scrollIntoView: vi.fn(), focus: vi.fn() };
    vi.stubGlobal("document", { getElementById: (id: string) => id === "email" ? target : null });
    expect(focusFragment("#email")).toBe(true);
    expect(target.setAttribute).not.toHaveBeenCalled();
    expect(focusFragment("#missing")).toBe(false);
    expect(focusFragment("")).toBe(false);
  });
});
