import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_SUBMISSION_TIMEOUT_MS,
  ContactSubmissionTimeoutError,
  submitContactEnquiry,
} from "./contactSubmission";

const endpoint = "https://forms.example.invalid/enquiry";
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("public enquiry submission", () => {
  it("sends the original multipart payload once and accepts a successful provider response", async () => {
    const data = new FormData();
    data.set("enquiryType", "consultant");
    data.set("email", "professional@example.invalid");
    data.set("language", "de");
    data.set("_subject", "New consultant enquiry — DeepBridge Advisory");
    data.set("_gotcha", "");
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    await expect(submitContactEnquiry(endpoint, data)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(endpoint, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
      signal: expect.any(AbortSignal),
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
  });

  it("rejects a provider error without silently retrying or changing the enquiry", async () => {
    const data = new FormData();
    data.set("message", "An enquiry retained for a manual retry");
    fetchMock.mockResolvedValue(new Response('{"errors":[]}', { status: 422 }));

    await expect(submitContactEnquiry(endpoint, data)).rejects.toThrow("not accepted");

    expect(data.get("message")).toBe("An enquiry retained for a manual retry");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("surfaces network failure and permits a later explicit retry", async () => {
    const data = new FormData();
    const networkError = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValueOnce(networkError);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(submitContactEnquiry(endpoint, data)).rejects.toBe(networkError);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    await expect(submitContactEnquiry(endpoint, data)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts a stalled request after 20 seconds without automatically resubmitting", async () => {
    fetchMock.mockImplementation((_input, options) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The request was aborted", "AbortError"));
      }, { once: true });
    }));
    const pending = submitContactEnquiry(endpoint, new FormData());
    const assertion = expect(pending).rejects.toBeInstanceOf(ContactSubmissionTimeoutError);

    await vi.advanceTimersByTimeAsync(CONTACT_SUBMISSION_TIMEOUT_MS - 1);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;

    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
