const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;

export function sanitizePlainText(value: string, maxLength = 255): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(ZERO_WIDTH_CHARS, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: string): string {
  return sanitizePlainText(value, 254).toLowerCase();
}

export function sanitizePhoneNumber(value: string): string {
  return value.replace(/[^0-9+]/g, "").slice(0, 20);
}

export function sanitizeNumericText(value: string, maxLength = 32): string {
  return value.replace(/[^0-9.-]/g, "").slice(0, maxLength);
}

export function sanitizeUrl(value: string): string {
  const trimmed = sanitizePlainText(value, 2048);
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

export function sanitizeUrlList(values: string[], maxItems = 4): string[] {
  return values.map((value) => sanitizeUrl(value)).filter(Boolean).slice(0, maxItems);
}