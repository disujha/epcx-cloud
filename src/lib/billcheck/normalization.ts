/** Increment this value whenever the deterministic rules change. */
export const LINE_NORMALIZATION_VERSION = "v1";

export interface NormalizedLineNumber {
  original: string;
  normalized: string;
  version: typeof LINE_NORMALIZATION_VERSION;
  /** Kept separately so diameter information is never lost during matching. */
  sizeQualifier: string | null;
}

/**
 * Normalizes common formatting differences while preserving identifier tokens.
 * A leading pipe diameter is removed from the comparison key only for the
 * specific size-prefix form, and is retained as a separate qualifier.
 */
export function normalizeLineNumber(value: unknown): NormalizedLineNumber {
  const original = value == null ? "" : String(value);
  let normalized = original
    .normalize("NFKC")
    .replace(/[“”″]/g, '"')
    .replace(/[‘’′]/g, "'")
    .trim()
    .toUpperCase();

  let sizeQualifier: string | null = null;
  const sizePrefix = normalized.match(/^\s*(\d+(?:\.\d+)?)\s*"\s*[-_/ ]+\s*(?=[A-Z])/);
  if (sizePrefix) {
    sizeQualifier = `${sizePrefix[1]}"`;
    normalized = normalized.slice(sizePrefix[0].length);
  }

  normalized = normalized
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[\s_\/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return { original, normalized, version: LINE_NORMALIZATION_VERSION, sizeQualifier };
}

/** Numeric zero-padding is useful as a suggestion signal, never an auto-match. */
export function looseLineKey(value: string): string {
  return value.replace(/\d+/g, (digits) => String(Number(digits)));
}

/** Keeps a stripped diameter inside persisted alias identity. */
export function lineAliasKey(value: unknown): string {
  const normalized = normalizeLineNumber(value);
  return normalized.sizeQualifier
    ? `${normalized.sizeQualifier}|${normalized.normalized}`
    : normalized.normalized;
}
