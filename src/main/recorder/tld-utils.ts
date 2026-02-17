/**
 * TLD extraction utilities for browser activity boundary detection.
 * Used to detect when a user navigates to a different domain within the same browser,
 * which should be treated as an activity boundary.
 */

/**
 * Extract the effective domain from a URL string.
 * Returns the hostname (e.g., "github.com" from "https://github.com/user/repo").
 * Returns null if the URL is invalid or empty.
 */
export function extractTld(url: string | undefined | null): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    return parsed.host || null
  } catch {
    return null
  }
}

/**
 * Check if two URLs have different effective domains.
 * Returns true if the TLDs differ, indicating an activity boundary.
 * Returns false if either URL is missing or they share the same domain.
 */
export function isTldChange(
  url1: string | undefined | null,
  url2: string | undefined | null,
): boolean {
  const tld1 = extractTld(url1)
  const tld2 = extractTld(url2)

  // If either is missing, don't treat as a TLD change
  if (!tld1 || !tld2) return false

  return tld1 !== tld2
}
