/**
 * Share utilities for TaxHawk results.
 *
 * Privacy-first: the share text NEVER includes financial amounts, salary,
 * or any personal data. It uses a curiosity-gap approach to drive clicks.
 */

const DEFAULT_URL = 'https://spiffler33.github.io/TaxHawk/';

/**
 * Get the privacy-safe share text. No financials, no emojis.
 *
 * @param {string} [appUrl] - URL to share (defaults to GitHub Pages URL)
 * @returns {string}
 */
export function getShareText(appUrl) {
  const url = appUrl || DEFAULT_URL;
  return `i just found tax savings i was leaving on the table. took thirty seconds.\ntry yours -> ${url}`;
}

/**
 * Share results using Web Share API with clipboard fallback.
 *
 * Returns 'shared' if Web Share succeeded, 'copied' if clipboard fallback
 * was used, or 'failed' if both failed.
 *
 * @param {string} [appUrl] - URL to share
 * @returns {Promise<'shared'|'copied'|'failed'>}
 */
export async function shareResults(appUrl) {
  const text = getShareText(appUrl);

  // Try native share (requires HTTPS + user gesture)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      // AbortError = user dismissed the share sheet — not a failure
      if (err.name === 'AbortError') return 'failed';
      // Fall through to clipboard
    }
  }

  // Clipboard fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
