const PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email]"],
  [/\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)\d{3}[\s-]?\d{4}\b/g, "[phone]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[card]"],
  [/\bsk-[A-Za-z0-9_\-]{16,}\b/g, "[api-key]"],
  [/\bBearer\s+[A-Za-z0-9_\-.=]+/gi, "Bearer [redacted]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[jwt]"],
];

export function redactPii(input: string): string {
  if (!input) return input;
  let out = input;
  for (const [re, replacement] of PATTERNS) {
    out = out.replace(re, replacement);
  }
  return out;
}
