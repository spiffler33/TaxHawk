/**
 * Check 6: NPS 80CCD(1B) — Additional ₹50,000 Deduction.
 *
 * ADDITIONAL deduction OVER AND ABOVE the ₹1.5L 80C limit.
 * Available only under old regime. NPS locked until age 60.
 * This is a COMPONENT of the regime switch benefit.
 *
 * Ported from backend/tax_engine/checks/nps_check.py
 */

import { FindingStatus, Confidence, createFinding } from '../models.js';
import {
  getMarginalRate,
  computeOldRegimeTaxableIncome,
  LIMIT_80CCD_1B,
  CESS_RATE,
} from '../taxUtils.js';

/**
 * Check NPS 80CCD(1B) deduction opportunity.
 * @param {object} salary - SalaryProfile
 * @returns {object} Finding
 */
export function checkNps(salary) {
  const fy = salary.financial_year;
  const currentNps1b = salary.deduction_80ccd_1b;
  const gap = Math.max(LIMIT_80CCD_1B - currentNps1b, 0);

  if (gap <= 0) {
    return createFinding({
      check_id: 'nps_check',
      check_name: 'NPS Tax Benefit (80CCD(1B))',
      status: FindingStatus.OPTIMIZED,
      finding: `NPS 80CCD(1B) fully utilized at \u20b9${currentNps1b.toLocaleString('en-IN')}`,
      savings: 0,
      action: 'No action needed',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        current_nps_1b: currentNps1b,
        limit_1b: LIMIT_80CCD_1B,
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
    check_id: 'nps_check',
    check_name: 'NPS Tax Benefit (80CCD(1B))',
    status: FindingStatus.OPPORTUNITY,
    finding: `\u20b9${gap.toLocaleString('en-IN')} NPS contribution saves \u20b9${taxSaved.toLocaleString('en-IN')} in tax (additional to 80C)`,
    savings: taxSaved,
    action: (
      `Open NPS Tier 1 account and invest \u20b9${gap.toLocaleString('en-IN')}. ` +
      `This is ABOVE the \u20b91.5L 80C limit`
    ),
    deadline: `March 31 (for FY ${fy} deduction)`,
    confidence: Confidence.DEFINITE,
    explanation: (
      `Section 80CCD(1B) provides an additional \u20b9${LIMIT_80CCD_1B.toLocaleString('en-IN')} ` +
      `deduction over the 80C limit. At your ${(marginal * 100).toFixed(0)}% marginal rate, ` +
      `this saves \u20b9${taxSaved.toLocaleString('en-IN')} immediately. The trade-off: NPS is ` +
      `locked until age 60, but the tax saving is immediate.`
    ),
    details: {
      current_nps_1b: currentNps1b,
      limit_1b: LIMIT_80CCD_1B,
      gap,
      marginal_rate: marginal,
      tax_saved_component: taxSaved,
      note: 'Locked until age 60. Tax saving is immediate, but money is illiquid',
    },
  });
}
