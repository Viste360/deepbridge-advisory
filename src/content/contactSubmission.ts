export const CONTACT_SUBMISSION_TIMEOUT_MS = 20_000;

export class ContactSubmissionTimeoutError extends Error {
  constructor() {
    super("Contact submission timed out before delivery could be confirmed");
    this.name = "ContactSubmissionTimeoutError";
  }
}

/** Send one enquiry, keeping the existing Formspree multipart payload intact. */
export async function submitContactEnquiry(endpoint: string, data: FormData): Promise<void> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CONTACT_SUBMISSION_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Contact submission was not accepted");
  } catch (error) {
    if (timedOut) throw new ContactSubmissionTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
