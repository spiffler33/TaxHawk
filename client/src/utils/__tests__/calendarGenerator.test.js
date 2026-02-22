/**
 * Tests for calendarGenerator.js
 *
 * Uses vi.useFakeTimers() to control the current date for deterministic
 * deadline parsing and year rollover logic.
 */

import { describe, it, expect } from 'vitest';
import {
  parseDeadline,
  generateICS,
  generateGoogleCalendarURL,
} from '../calendarGenerator.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeFinding = (overrides = {}) => ({
  check_id: '80c_gap',
  check_name: '80C Gap Analysis',
  finding: 'invest 78K more in ELSS/PPF',
  action: 'Invest in ELSS mutual funds via Groww',
  deadline: 'March 31 of this financial year',
  savings: 16120,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseDeadline
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseDeadline', () => {
  it('returns null for null/undefined/N/A', () => {
    expect(parseDeadline(null)).toBeNull();
    expect(parseDeadline(undefined)).toBeNull();
    expect(parseDeadline('N/A')).toBeNull();
    expect(parseDeadline('')).toBeNull();
  });

  it('returns null for unrecognized deadline text', () => {
    expect(parseDeadline('some random text')).toBeNull();
    expect(parseDeadline('December 31')).toBeNull();
  });

  it('parses "March 31..." when before March', () => {
    const jan = new Date(2026, 0, 15); // Jan 15, 2026
    const result = parseDeadline('March 31 of this financial year', jan);
    expect(result).toEqual(new Date(2026, 2, 31));
  });

  it('rolls over to next year when past March', () => {
    const apr = new Date(2026, 3, 15); // Apr 15, 2026
    const result = parseDeadline('March 31 of this financial year', apr);
    expect(result).toEqual(new Date(2027, 2, 31));
  });

  it('parses "July 31..." when before July', () => {
    const may = new Date(2026, 4, 1); // May 1, 2026
    const result = parseDeadline('July 31 (ITR filing deadline)', may);
    expect(result).toEqual(new Date(2026, 6, 31));
  });

  it('rolls over to next year when past July', () => {
    const aug = new Date(2026, 7, 1); // Aug 1, 2026
    const result = parseDeadline('July 31', aug);
    expect(result).toEqual(new Date(2027, 6, 31));
  });

  it('handles case-insensitive matching', () => {
    const jan = new Date(2026, 0, 1);
    expect(parseDeadline('MARCH 31', jan)).toEqual(new Date(2026, 2, 31));
    expect(parseDeadline('march31', jan)).toEqual(new Date(2026, 2, 31));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateICS
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateICS', () => {
  it('returns null for findings with no parseable deadline', () => {
    expect(generateICS(makeFinding({ deadline: 'N/A' }))).toBeNull();
    expect(generateICS(makeFinding({ deadline: null }))).toBeNull();
  });

  it('generates valid iCalendar format', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//TaxHawk//Tax Reminder//EN');
  });

  it('sets event 15 days before deadline', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);

    // March 31 - 15 days = March 16
    expect(ics).toContain('DTSTART;VALUE=DATE:20260316');
    // All-day event ends next day
    expect(ics).toContain('DTEND;VALUE=DATE:20260317');
  });

  it('includes finding name in summary', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);
    expect(ics).toContain('SUMMARY:TaxHawk: 80C Gap Analysis');
  });

  it('includes action as description', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);
    expect(ics).toContain('DESCRIPTION:Invest in ELSS mutual funds via Groww');
  });

  it('falls back to finding text when no action', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding({ action: null }), jan);
    expect(ics).toContain('DESCRIPTION:invest 78K more in ELSS/PPF');
  });

  it('includes VALARM reminder block', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);

    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:P0D');
    expect(ics).toContain('ACTION:DISPLAY');
    expect(ics).toContain('END:VALARM');
  });

  it('uses CRLF line endings per RFC 5545', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);
    expect(ics).toContain('\r\n');
    // Should not have bare LF
    const lines = ics.split('\r\n');
    lines.forEach((line) => {
      expect(line).not.toContain('\n');
    });
  });

  it('includes unique UID per finding', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);
    expect(ics).toContain('UID:taxhawk-80c_gap-2026@taxhawk');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateGoogleCalendarURL
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateGoogleCalendarURL', () => {
  it('returns null for findings with no parseable deadline', () => {
    expect(generateGoogleCalendarURL(makeFinding({ deadline: 'N/A' }))).toBeNull();
  });

  it('generates a Google Calendar URL', () => {
    const jan = new Date(2026, 0, 15);
    const url = generateGoogleCalendarURL(makeFinding(), jan);

    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
  });

  it('sets dates 15 days before deadline', () => {
    const jan = new Date(2026, 0, 15);
    const url = generateGoogleCalendarURL(makeFinding(), jan);

    // March 16 / March 17
    expect(url).toContain('20260316');
    expect(url).toContain('20260317');
  });

  it('includes finding name in title', () => {
    const jan = new Date(2026, 0, 15);
    const url = generateGoogleCalendarURL(makeFinding(), jan);
    // URLSearchParams encodes spaces as '+', not '%20'
    expect(url).toContain('text=TaxHawk');
    expect(url).toContain('80C+Gap+Analysis');
  });

  it('includes action in details', () => {
    const jan = new Date(2026, 0, 15);
    const url = generateGoogleCalendarURL(makeFinding(), jan);
    expect(url).toContain('details=Invest+in+ELSS+mutual+funds+via+Groww');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// downloadICS
// ═══════════════════════════════════════════════════════════════════════════════
// downloadICS is a thin DOM wrapper (Blob + anchor click). We test its logic
// path via generateICS (which it calls internally). Full DOM behavior is
// verified visually in the browser.

describe('downloadICS', () => {
  it('would return false for findings with no parseable deadline (via generateICS)', () => {
    // downloadICS returns false when generateICS returns null
    const ics = generateICS(makeFinding({ deadline: 'N/A' }));
    expect(ics).toBeNull();
  });

  it('would return true for findings with valid deadline (via generateICS)', () => {
    const jan = new Date(2026, 0, 15);
    const ics = generateICS(makeFinding(), jan);
    expect(ics).not.toBeNull();
    expect(ics).toContain('BEGIN:VCALENDAR');
  });
});
