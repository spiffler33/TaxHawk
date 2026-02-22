/**
 * Check 7: Home Loan Interest — Section 24b Display Check.
 *
 * Savings reported as 0 — already captured in regime_comparator's total.
 * This check exists to EXPLAIN the Section 24b component.
 *
 * Only fires when deduction_24b > 0 (user has a home loan).
 * Cap: ₹2,00,000 for self-occupied property.
 * Only available under old regime.
 */

import { FindingStatus, Confidence, createFinding } from '../models.js';
import {
  getMarginalRate,
  computeOldRegimeTaxableIncome,
  LIMIT_24B_SELF_OCCUPIED,
  CESS_RATE,
} from '../taxUtils.js';

/**
 * Display home loan interest benefit under old regime.
 * @param {object} salary - SalaryProfile
 * @returns {object} Finding (savings always 0)
 */
export function checkHomeLoan(salary) {
  const interestPaid = salary.deduction_24b;

  // No home loan → not applicable
  if (!interestPaid || interestPaid <= 0) {
    return createFinding({
      check_id: 'home_loan_check',
      check_name: 'Home Loan Interest (Section 24b)',
      status: FindingStatus.NOT_APPLICABLE,
      finding: 'No home loan interest declared',
      savings: 0,
      action: 'N/A',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        home_loan_interest: 0,
      },
    });
  }

  const fy = salary.financial_year;
  const capped = Math.min(interestPaid, LIMIT_24B_SELF_OCCUPIED);

  // Marginal rate at old regime GTI for display savings
  const oldBreakdown = computeOldRegimeTaxableIncome(salary);
  const gti = oldBreakdown.gross_total_income;
  const marginal = getMarginalRate(gti, 'old', fy);
  const displaySaving = Math.round(capped * marginal * (1 + CESS_RATE));

  return createFinding({
    check_id: 'home_loan_check',
    check_name: 'Home Loan Interest (Section 24b)',
    status: FindingStatus.OPPORTUNITY,
    finding: (
      `Your \u20b9${capped.toLocaleString('en-IN')} home loan interest deduction ` +
      `saves you \u20b9${displaySaving.toLocaleString('en-IN')} under old regime`
    ),
    savings: 0, // Captured in regime_comparator
    action: (
      'Ensure you have the home loan interest certificate from your bank. ' +
      'This benefit is captured in the regime switch recommendation'
    ),
    deadline: `Include in ITR filing by July 31 (FY ${fy})`,
    confidence: Confidence.DEFINITE,
    explanation: (
      `Section 24b allows deduction of home loan interest up to ` +
      `\u20b9${LIMIT_24B_SELF_OCCUPIED.toLocaleString('en-IN')} per year for self-occupied property.\n` +
      `Your interest: \u20b9${interestPaid.toLocaleString('en-IN')}` +
      (interestPaid > LIMIT_24B_SELF_OCCUPIED
        ? ` (capped at \u20b9${LIMIT_24B_SELF_OCCUPIED.toLocaleString('en-IN')})`
        : '') +
      `\n` +
      `At ${(marginal * 100).toFixed(0)}% marginal rate: saves \u20b9${displaySaving.toLocaleString('en-IN')} in tax.\n` +
      `This deduction is only available under the old regime.`
    ),
    details: {
      home_loan_interest: interestPaid,
      capped_amount: capped,
      limit: LIMIT_24B_SELF_OCCUPIED,
      marginal_rate: marginal,
      display_saving: displaySaving,
      note: 'Savings included in regime arbitrage check',
    },
  });
}
