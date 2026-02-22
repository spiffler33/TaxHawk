/**
 * Check 3: Section 80D — Health Insurance Premium Deduction.
 *
 * This is a COMPONENT of the regime switch benefit.
 * Ported from backend/tax_engine/checks/section_80d.py
 */

import { FindingStatus, Confidence, createFinding } from '../models.js';
import {
  getMarginalRate,
  computeOldRegimeTaxableIncome,
  LIMIT_80D_SELF_BELOW_60,
  LIMIT_80D_SELF_SENIOR,
  LIMIT_80D_PARENTS_BELOW_60,
  LIMIT_80D_PARENTS_SENIOR,
  CESS_RATE,
} from '../taxUtils.js';

/**
 * Analyze health insurance deduction opportunity under Section 80D.
 * @param {object} salary - SalaryProfile
 * @param {object} [opts]
 * @param {boolean} [opts.parentsSenior=false]
 * @param {boolean} [opts.selfSenior=false]
 * @returns {object} Finding
 */
export function check80d(salary, opts = {}) {
  const parentsSenior = opts.parentsSenior || false;
  const selfSenior = opts.selfSenior || false;
  const fy = salary.financial_year;
  const current80d = salary.deduction_80d;

  // Limits
  const selfLimit = selfSenior ? LIMIT_80D_SELF_SENIOR : LIMIT_80D_SELF_BELOW_60;
  const parentsLimit = parentsSenior ? LIMIT_80D_PARENTS_SENIOR : LIMIT_80D_PARENTS_BELOW_60;
  const totalLimit = selfLimit + parentsLimit;

  if (current80d >= totalLimit) {
    return createFinding({
      check_id: '80d_check',
      check_name: 'Health Insurance (Section 80D)',
      status: FindingStatus.OPTIMIZED,
      finding: `80D fully utilized at \u20b9${current80d.toLocaleString('en-IN')}`,
      savings: 0,
      action: 'No action needed',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        self_family_claimed: current80d,
        self_family_limit: selfLimit,
        parents_limit: parentsLimit,
        total_limit: totalLimit,
      },
    });
  }

  const additional80d = totalLimit - current80d;
  let recommendedPremium;
  let opportunityType;

  if (current80d === 0) {
    recommendedPremium = parentsLimit;
    opportunityType = 'parents';
  } else {
    recommendedPremium = additional80d;
    opportunityType = 'additional';
  }

  // Marginal rate at old regime GTI
  const oldBreakdown = computeOldRegimeTaxableIncome(salary);
  const gti = oldBreakdown.gross_total_income;
  const marginal = getMarginalRate(gti, 'old', fy);
  const taxSaved = Math.round(recommendedPremium * marginal * (1 + CESS_RATE));

  let findingText;
  let actionText;

  if (opportunityType === 'parents') {
    findingText = (
      `Parents have no health insurance. ` +
      `\u20b9${recommendedPremium.toLocaleString('en-IN')} policy = \u20b9${taxSaved.toLocaleString('en-IN')} tax saving`
    );
    actionText = (
      `Buy a \u20b95-10L family floater health insurance for parents ` +
      `(annual premium ~\u20b920-25K). Claim under Section 80D`
    );
  } else {
    findingText = `\u20b9${additional80d.toLocaleString('en-IN')} additional 80D deduction available`;
    actionText = (
      `Increase health insurance coverage to claim additional ` +
      `\u20b9${additional80d.toLocaleString('en-IN')} under 80D`
    );
  }

  return createFinding({
    check_id: '80d_check',
    check_name: 'Health Insurance (Section 80D)',
    status: FindingStatus.OPPORTUNITY,
    finding: findingText,
    savings: taxSaved,
    action: actionText,
    deadline: `March 31 (for FY ${fy} deduction)`,
    confidence: Confidence.DEFINITE,
    explanation: (
      `Section 80D allows deduction for health insurance premiums: ` +
      `up to \u20b9${selfLimit.toLocaleString('en-IN')} for self/family and ` +
      `\u20b9${parentsLimit.toLocaleString('en-IN')} for parents. ` +
      `A family floater for parents costs ~\u20b925K/year and the effective ` +
      `cost after tax saving is only \u20b9${(recommendedPremium - taxSaved).toLocaleString('en-IN')}.`
    ),
    details: {
      self_family_claimed: current80d,
      self_family_limit: selfLimit,
      parents_claimed: 0,
      parents_limit: parentsLimit,
      parents_senior: parentsSenior,
      recommended_premium: recommendedPremium,
      marginal_rate: marginal,
      tax_saved_component: taxSaved,
    },
  });
}
