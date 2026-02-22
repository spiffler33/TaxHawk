import { useState } from 'react';
import { formatINR } from '../utils/format.js';
import {
  parseDeadline,
  downloadICS,
  generateGoogleCalendarURL,
} from '../utils/calendarGenerator.js';
import RedemptionExpand from './RedemptionExpand.jsx';

/**
 * Deduction check IDs -- their savings are components of the regime switch,
 * not additional savings. Labeled accordingly in the UI.
 */
const DEDUCTION_CHECK_IDS = new Set([
  '80c_gap',
  '80d_check',
  'hra_optimizer',
  'nps_check',
  'home_loan',
]);

/**
 * External action links for specific checks.
 * [ do it ] opens these platforms.
 */
const ACTION_LINKS = {
  '80c_gap': {
    url: 'https://groww.in/mutual-funds/category/elss-funds',
  },
  '80d_check': {
    url: 'https://www.policybazaar.com/health-insurance/',
  },
  nps_check: {
    url: 'https://zerodha.com/nps/',
  },
  capital_gains: {
    url: 'https://groww.in/stocks',
  },
};

/**
 * Parse deadline text and return urgency level based on days remaining.
 * Red: <30 days or past, Amber: <90 days, Green: >90 days.
 */
function getUrgencyColor(deadline) {
  if (!deadline || deadline === 'N/A') return null;

  const now = new Date();
  let target = null;

  if (/march\s*31/i.test(deadline)) {
    target =
      now.getMonth() < 3
        ? new Date(now.getFullYear(), 2, 31)
        : new Date(now.getFullYear() + 1, 2, 31);
  } else if (/july\s*31/i.test(deadline)) {
    target =
      now.getMonth() < 6
        ? new Date(now.getFullYear(), 6, 31)
        : new Date(now.getFullYear() + 1, 6, 31);
  }

  if (!target) return null;

  const days = Math.ceil((target - now) / 86_400_000);
  if (days < 30) return 'red';
  if (days < 90) return 'amber';
  return 'green';
}

const URGENCY_CLASSES = {
  red: 'text-(--color-red)',
  amber: 'text-(--color-amber)',
  green: 'text-(--color-green)',
};

/**
 * FindingCard -- compact 4-line card with fog-of-war expands.
 *
 * Layout:
 *   Line 1: CHECK NAME                    +16,120
 *   Line 2: invest 78K more in ELSS/PPF
 *   Line 3: deadline: march 31  ·  part of switch
 *   Line 4: [ do it ]  [ remind me ]  [ details ]
 *
 * Only one expand open at a time (reminder vs details).
 *
 * @param {object} props
 * @param {object} props.check - Finding from the orchestrator
 * @param {string} props.recommendedRegime - 'old' | 'new'
 */
export default function FindingCard({ check, recommendedRegime }) {
  // Mutually exclusive expand: null | 'reminder' | 'details'
  const [expand, setExpand] = useState(null);

  const isComponent =
    DEDUCTION_CHECK_IDS.has(check.check_id) && recommendedRegime === 'old';
  const urgency = getUrgencyColor(check.deadline);
  const urgencyClass = urgency ? URGENCY_CLASSES[urgency] : 'text-(--color-muted)';
  const link = ACTION_LINKS[check.check_id];
  const hasDeadline = check.deadline && check.deadline !== 'N/A';
  const deadlineDate = hasDeadline ? parseDeadline(check.deadline) : null;

  const toggle = (section) =>
    setExpand((prev) => (prev === section ? null : section));

  return (
    <div className="border border-(--color-line) bg-(--color-paper) mb-3 p-4">
      {/* Line 1: check name + savings */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-widest text-(--color-muted) uppercase mb-1">
            {check.check_name}
          </div>
          {/* Line 2: finding text */}
          <div className="text-sm leading-snug">{check.finding}</div>
        </div>
        {check.savings > 0 && (
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-(--color-green)">
              +{formatINR(check.savings).replace('\u20B9', '')}
            </div>
          </div>
        )}
      </div>

      {/* Line 3: deadline + badge (merged into one line) */}
      {(hasDeadline || isComponent) && (
        <div className="text-xs mt-2 text-(--color-muted)">
          {hasDeadline && (
            <>
              <span>deadline: </span>
              <span className={urgencyClass}>{check.deadline.split('\n')[0]}</span>
            </>
          )}
          {hasDeadline && isComponent && (
            <span className="mx-1">{'\u00B7'}</span>
          )}
          {isComponent && (
            <span>part of switch</span>
          )}
        </div>
      )}

      {/* Line 4: button row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {link && (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-(--color-green) hover:text-(--color-green-bright)
              underline cursor-pointer"
          >
            [ do it ]
          </a>
        )}
        {deadlineDate && (
          <button
            type="button"
            onClick={() => toggle('reminder')}
            aria-expanded={expand === 'reminder'}
            className="text-[10px] text-(--color-muted) hover:text-(--color-ink)
              bg-transparent border-0 font-[inherit] cursor-pointer p-0 underline"
          >
            [ {expand === 'reminder' ? 'hide' : 'remind me'} ]
          </button>
        )}
        {check.explanation && (
          <button
            type="button"
            onClick={() => toggle('details')}
            aria-expanded={expand === 'details'}
            className="text-[10px] text-(--color-muted) hover:text-(--color-ink)
              bg-transparent border-0 font-[inherit] cursor-pointer p-0 underline"
          >
            [ {expand === 'details' ? 'hide' : 'details'} ]
          </button>
        )}
        {check.check_id === 'capital_gains' && (
          <button
            type="button"
            onClick={() => toggle('planner')}
            aria-expanded={expand === 'planner'}
            className="text-[10px] text-(--color-muted) hover:text-(--color-ink)
              bg-transparent border-0 font-[inherit] cursor-pointer p-0 underline"
          >
            [ {expand === 'planner' ? 'hide' : 'plan a sale'} ]
          </button>
        )}
      </div>

      {/* Expand: calendar reminder */}
      {expand === 'reminder' && deadlineDate && (
        <div className="mt-2 text-xs text-(--color-muted) border-l-2 border-(--color-line) pl-3 animate-slide-in">
          <button
            type="button"
            onClick={() => downloadICS(check)}
            className="text-xs text-(--color-green) hover:text-(--color-green-bright)
              bg-transparent border-0 font-[inherit] cursor-pointer p-0 underline"
          >
            download .ics
          </button>
          <span className="mx-2">|</span>
          <a
            href={generateGoogleCalendarURL(check)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-(--color-green) hover:text-(--color-green-bright) underline"
          >
            add to google calendar
          </a>
          <div className="text-[10px] text-(--color-muted) mt-1">
            reminder set 15 days before deadline
          </div>
        </div>
      )}

      {/* Expand: explanation details */}
      {expand === 'details' && check.explanation && (
        <div className="mt-2 text-xs text-(--color-muted) leading-relaxed border-l-2 border-(--color-line) pl-3 animate-slide-in">
          {check.explanation}
        </div>
      )}

      {/* Expand: redemption planner (capital_gains only) */}
      {expand === 'planner' && (
        <RedemptionExpand
          exemptionRemaining={
            check.details?.exemption_remaining ?? 125_000
          }
        />
      )}
    </div>
  );
}
