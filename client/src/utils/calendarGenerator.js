/**
 * Calendar generation utilities for tax deadline reminders.
 *
 * Generates .ics files (RFC 5545) and Google Calendar URLs so users can
 * set reminders 15 days before their tax deadlines. All dates are in IST.
 */

/**
 * Parse a finding's deadline string into a Date object.
 * Handles "March 31 ..." and "July 31 ..." patterns.
 * Returns null for unrecognized or N/A deadlines.
 *
 * @param {string} deadline - Deadline text from a finding
 * @param {Date} [now] - Reference date (defaults to current date)
 * @returns {Date|null}
 */
export function parseDeadline(deadline, now) {
  if (!deadline || deadline === 'N/A') return null;

  const ref = now || new Date();
  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0-indexed

  if (/march\s*31/i.test(deadline)) {
    // If we're already past March 31 this year, target next year
    return month < 3
      ? new Date(year, 2, 31)
      : new Date(year + 1, 2, 31);
  }

  if (/july\s*31/i.test(deadline)) {
    return month < 7
      ? new Date(year, 6, 31)
      : new Date(year + 1, 6, 31);
  }

  return null;
}

/**
 * Format a Date as an iCalendar date string (YYYYMMDD).
 * @param {Date} date
 * @returns {string}
 */
function formatICSDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Format a Date as YYYYMMDD for Google Calendar (hyphenated).
 * @param {Date} date
 * @returns {string}
 */
function formatGCalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Generate an RFC 5545 .ics string for a finding's deadline.
 * The event is an all-day event set 15 days before the deadline,
 * with a VALARM reminder on the day.
 *
 * @param {object} finding - Check result from orchestrator
 * @param {Date} [now] - Reference date for parseDeadline
 * @returns {string|null} .ics file content, or null if no parseable deadline
 */
export function generateICS(finding, now) {
  const deadlineDate = parseDeadline(finding.deadline, now);
  if (!deadlineDate) return null;

  // Reminder date: 15 days before deadline
  const reminderDate = new Date(deadlineDate);
  reminderDate.setDate(reminderDate.getDate() - 15);

  const summary = `TaxHawk: ${finding.check_name}`;
  const description = finding.action
    ? finding.action.split('\n')[0]
    : finding.finding;

  const dtStart = formatICSDate(reminderDate);
  // All-day event: DTEND is the next day
  const endDate = new Date(reminderDate);
  endDate.setDate(endDate.getDate() + 1);
  const dtEnd = formatICSDate(endDate);

  const uid = `taxhawk-${finding.check_id}-${deadlineDate.getFullYear()}@taxhawk`;
  const now_ = new Date();
  const dtstamp = formatICSDate(now_) + 'T000000Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaxHawk//Tax Reminder//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'TRIGGER:P0D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generate a Google Calendar add-event URL for a finding's deadline.
 * Event is set 15 days before the deadline as an all-day event.
 *
 * @param {object} finding - Check result from orchestrator
 * @param {Date} [now] - Reference date for parseDeadline
 * @returns {string|null} Google Calendar URL, or null if no parseable deadline
 */
export function generateGoogleCalendarURL(finding, now) {
  const deadlineDate = parseDeadline(finding.deadline, now);
  if (!deadlineDate) return null;

  const reminderDate = new Date(deadlineDate);
  reminderDate.setDate(reminderDate.getDate() - 15);

  const endDate = new Date(reminderDate);
  endDate.setDate(endDate.getDate() + 1);

  const title = `TaxHawk: ${finding.check_name}`;
  const details = finding.action
    ? finding.action.split('\n')[0]
    : finding.finding;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGCalDate(reminderDate)}/${formatGCalDate(endDate)}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Trigger a .ics file download for a finding's deadline.
 * Creates a Blob, attaches it to a temporary anchor, and clicks it.
 *
 * @param {object} finding - Check result from orchestrator
 * @param {Date} [now] - Reference date for parseDeadline
 * @returns {boolean} true if download triggered, false if no parseable deadline
 */
export function downloadICS(finding, now) {
  const ics = generateICS(finding, now);
  if (!ics) return false;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `taxhawk-${finding.check_id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}
