/** Oddiy HTML/injection tozalash */
export function sanitizeText(raw: string | null | undefined, maxLen = 5000): string | null {
  if (raw == null) return null;
  let s = String(raw).replace(/\r/g, "").trim();
  if (!s) return null;
  s = s.replace(/<script[\s\S]*?<\/script\s*>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style\s*>/gi, " ");
  s = s.replace(/<[^>]*>/g, " ");
  s = s.replace(/javascript\s*:/gi, " ");
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s.trim() ? s : null;
}

export function sanitizeSlug(raw: string | null | undefined): string {
  return (raw ?? "").toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").slice(0, 80);
}
