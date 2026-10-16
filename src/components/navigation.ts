/** Resolve encoded URL fragments without allowing malformed links to break navigation. */
export function fragmentId(hash: string): string {
  const raw = hash.replace(/^#/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Bring a linked section into view and make its content reachable by keyboard. */
export function focusFragment(hash: string): boolean {
  const id = fragmentId(hash);
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;
  if (!target.hasAttribute("tabindex") && !target.matches("a[href], button, input, select, textarea, summary, [contenteditable='true']")) {
    target.setAttribute("tabindex", "-1");
  }
  target.scrollIntoView({ behavior: "instant", block: "start" });
  target.focus({ preventScroll: true });
  return true;
}
