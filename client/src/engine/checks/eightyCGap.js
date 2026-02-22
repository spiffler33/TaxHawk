/**
 * Check 2: Section 80C Gap Analysis.
 *
 * Identifies gap between current 80C usage (usually just EPF) and ₹1.5L limit.
 * This is a COMPONENT of the regime switch — savings are already in regime_comparator.
 *
 * Ported from backend/tax_engine/checks/section_80c.py
 */

import { FindingStatus, Confidence, createFinding } from '../models.js';
import {
  getMarginalRate,
  computeOldRegimeTaxableIncome,
  LIMIT_80C,
  CESS_RATE,
} from '../taxUtils.js';

/**
 * Analyze the gap between current 80C claims and the ₹1.5L limit.
 * @param {object} salary - SalaryProfile
 * @returns {object} Finding
 */
export function check80c(salary) {
  const fy = salary.financial_year;

  // Current 80C usage (80C + 80CCC + 80CCD(1) share the ₹1.5L limit)
  let current80c = salary.deduction_80c + salary.deduction_80ccc + salary.deduction_80ccd_1;
  current80c = Math.min(current80c, LIMIT_80C);

  const epf = salary.epf_employee_contribution;
  const gap = Math.max(LIMIT_80C - current80c, 0);

  if (gap <= 0) {
    return createFinding({
      check_id: '80c_gap',
      check_name: 'Section 80C Gap',
      status: FindingStatus.OPTIMIZED,
      finding: `80C fully utilized at \u20b9${current80c.toLocaleString('en-IN')}`,
      savings: 0,
      action: 'No action needed \u2014 80C limit already maxed',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        epf_contribution: epf,
        current_80c_total: current80c,
        limit: LIMIT_80C,
        gap: 0,
      },
    });
  }

  // Marginal rate at old regime GTI
  const oldBreakdown = computeOldRegimeTaxableIncome(salary);
  const gti = oldBreakdown.gross_total_income;
  const marginal = getMarginalRate(gti, 'old', fy);
  const taxSaved = Math.round(gap * marginal * (1 + CESS_RATE));

  return createFinding({
    check_id: '80c_gap',
    check_name: 'Section 80C Gap',
    status: FindingStatus.OPPORTUNITY,
    finding: (
      `\u20b9${gap.toLocaleString('en-IN')} gap in 80C limit. ` +
      `EPF covers \u20b9${epf.toLocaleString('en-IN')} of \u20b9${(LIMIT_80C / 1000).toFixed(0)}K`
    ),
    savings: taxSaved,
    action: (
      `Invest \u20b9${gap.toLocaleString('en-IN')} in ELSS mutual fund ` +
      `(e.g., Mirae Asset ELSS, Axis ELSS) before March 31`
    ),
    deadline: `March 31 (for FY ${fy} deduction)`,
    confidence: Confidence.DEFINITE,
    explanation: (
      `Your EPF contribution of \u20b9${epf.toLocaleString('en-IN')} covers only ` +
      `${(epf / LIMIT_80C * 100).toFixed(0)}% of the \u20b9${LIMIT_80C.toLocaleString('en-IN')} limit. ` +
      `ELSS has the shortest lock-in (3 years) among 80C instruments ` +
      `and offers equity market returns.`
    ),
    details: {
      epf_contribution: epf,
      current_80c_total: current80c,
      limit: LIMIT_80C,
      gap,
      marginal_rate: marginal,
      tax_saved_component: taxSaved,
      recommended_instrument: 'ELSS (3-year lock-in, equity growth)',
    },
  });
}
