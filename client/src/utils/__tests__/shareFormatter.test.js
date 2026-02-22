/**
 * Tests for shareFormatter.js
 *
 * Verifies privacy guarantees (no financial data in share text),
 * Web Share API integration, and clipboard fallback behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getShareText, shareResults } from '../shareFormatter.js';

// ═══════════════════════════════════════════════════════════════════════════════
// getShareText
// ═══════════════════════════════════════════════════════════════════════════════

describe('getShareText', () => {
  it('returns a string containing the app URL', () => {
    const text = getShareText('https://taxhawk.in');
    expect(text).toContain('https://taxhawk.in');
  });

  it('uses default URL when none provided', () => {
    const text = getShareText();
    expect(text).toContain('https://taxhawk.in');
  });

  it('never contains rupee symbol', () => {
    const text = getShareText('https://example.com');
    expect(text).not.toContain('\u20B9'); // ₹
  });

  it('never contains digits (no financial amounts leak)', () => {
    const text = getShareText('https://taxhawk.in');
    // Remove the URL portion before checking for digits
    const withoutUrl = text.replace(/https?:\/\/\S+/g, '');
    expect(withoutUrl).not.toMatch(/\d/);
  });

  it('does not contain emojis', () => {
    const text = getShareText();
    // Check for common emoji ranges
    expect(text).not.toMatch(/[\u{1F600}-\u{1F64F}]/u);
    expect(text).not.toMatch(/[\u{1F300}-\u{1F5FF}]/u);
    expect(text).not.toMatch(/[\u{1F680}-\u{1F6FF}]/u);
  });

  it('includes the curiosity-gap message', () => {
    const text = getShareText();
    expect(text).toContain('tax savings');
    expect(text).toContain('try yours');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// shareResults
// ═══════════════════════════════════════════════════════════════════════════════

describe('shareResults', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    globalThis.navigator = originalNavigator;
    vi.restoreAllMocks();
  });

  it('returns "shared" when navigator.share succeeds', async () => {
    globalThis.navigator = {
      share: vi.fn().mockResolvedValue(undefined),
    };

    const result = await shareResults('https://taxhawk.in');
    expect(result).toBe('shared');
    expect(globalThis.navigator.share).toHaveBeenCalledWith({
      text: expect.stringContaining('taxhawk.in'),
    });
  });

  it('returns "failed" when user dismisses share sheet (AbortError)', async () => {
    const abortErr = new Error('Share cancelled');
    abortErr.name = 'AbortError';
    globalThis.navigator = {
      share: vi.fn().mockRejectedValue(abortErr),
    };

    const result = await shareResults();
    expect(result).toBe('failed');
  });

  it('falls back to clipboard when share throws non-AbortError', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator = {
      share: vi.fn().mockRejectedValue(new Error('not supported')),
      clipboard: { writeText },
    };

    const result = await shareResults();
    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalled();
  });

  it('falls back to clipboard when navigator.share is undefined', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator = {
      clipboard: { writeText },
    };

    const result = await shareResults();
    expect(result).toBe('copied');
  });

  it('returns "failed" when both share and clipboard fail', async () => {
    globalThis.navigator = {};

    const result = await shareResults();
    expect(result).toBe('failed');
  });

  it('returns "failed" when clipboard.writeText throws', async () => {
    globalThis.navigator = {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('permission denied')),
      },
    };

    const result = await shareResults();
    expect(result).toBe('failed');
  });
});
