// Input sanitization utility for Witness R.E.P
// Strips HTML tags, control characters, and normalizes whitespace.
// Use for all user-facing text inputs before storage or display.

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const TAG_RE = /<[^>]*>/g;
const WHITESPACE_RE = /\s+/g;

/**
 * Sanitize a plain-text string: strip HTML tags, control chars,
 * trim whitespace, and limit length.
 */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(CONTROL_RE, "")
    .replace(TAG_RE, "")
    .replace(WHITESPACE_RE, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a phone number: remove everything except digits and leading +.
 */
export function sanitizePhone(input: string): string {
  if (typeof input !== "string") return "";
  const stripped = input.replace(/[^\d+]/g, "");
  // Keep at most one leading +
  const plus = stripped.startsWith("+") ? "+" : "";
  const digits = stripped.replace(/\+/g, "");
  return plus + digits.slice(0, 15);
}

/**
 * Sanitize an email address: trim, lowercase, basic validation.
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase().slice(0, 320);
}

/**
 * Sanitize for safe HTML display: escape & < > " ' characters.
 */
export function escapeHtml(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a URL: only allow http and https schemes.
 */
export function sanitizeUrl(input: string): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return trimmed.slice(0, 2048);
    }
  } catch {
    // Not a valid URL
  }
  return "";
}
