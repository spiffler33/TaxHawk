/**
 * Check 1: Tax Regime Arbitrage — Old vs New regime comparison.
 *
 * HIGHEST-IMPACT check. Computes fully-optimized old regime tax
 * (with HRA, 80C, 80D, NPS) and compares to new regime tax.
 *
 * Ported from backend/tax_engine/checks/regime_comparator.py
 */

import { FindingStatus, Confidence, createFinding } from '../models.js';
import {
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  computeNewRegimeTaxableIncome,
  computeOldRegimeTaxableIncome,
  calculateHraExemption,
  LIMIT_80C,
  LIMIT_80CCD_1B,
  LIMIT_80D_SELF_BELOW_60,
  LIMIT_80D_SELF_SENIOR,
  LIMIT_80D_PARENTS_BELOW_60,
  LIMIT_80D_PARENTS_SENIOR,
  LIMIT_24B_SELF_OCCUPIED,
} from '../taxUtils.js';

/**
 * Compare old vs new regime with fully optimized deductions.
 * @param {object} salary - SalaryProfile
 * @param {object} [opts]
 * @param {boolean} [opts.parentsSenior=false]
 * @param {boolean} [opts.selfSenior=false]
 * @returns {object} Finding
 */
export function checkRegime(salary, opts = {}) {
  const parentsSenior = opts.parentsSenior || false;
  const selfSenior = opts.selfSenior || false;
  const ageCategory = selfSenior ? 'senior' : 'below_60';
  const fy = salary.financial_year;

  // ── New Regime Tax ──────────────────────────────────────────────────
  const newTaxable = computeNewRegimeTaxableIncome(salary);
  const newTaxResult = calculateNewRegimeTax(newTaxable, fy);
  const newTax = newTaxResult.total_tax;

  // ── Optimized Old Regime Tax ────────────────────────────────────────
  // Calculate optimal HRA exemption
  let optimalHra = 0;
  if (salary.hra_received > 0 && salary.monthly_rent > 0) {
    optimalHra = calculateHraExemption(
      salary.basic_salary,
      salary.hra_received,
      salary.monthly_rent * 12,
      salary.is_metro,
    );
  }

  // Calculate optimal 80C (assume user will fill the gap)
  const optimal80c = LIMIT_80C;

  // Calculate optimal 80D (self + parents insurance)
  // For non-seniors, assume employer group cover handles self — only optimize parents.
  // For seniors (60+), no employer group cover — optimize both self and parents.
  const selfLimit = selfSenior ? LIMIT_80D_SELF_SENIOR : LIMIT_80D_SELF_BELOW_60;
  const parentsLimit = parentsSenior ? LIMIT_80D_PARENTS_SENIOR : LIMIT_80D_PARENTS_BELOW_60;
  const optimal80dTarget = selfSenior ? selfLimit + parentsLimit : parentsLimit;
  const optimal80d = Math.max(salary.deduction_80d, optimal80dTarget);

  // Calculate optimal NPS 80CCD(1B)
  const optimalNps1b = LIMIT_80CCD_1B;

  // Home loan interest (Section 24b) — use actual amount, capped at ₹2L
  const optimal24b = Math.min(salary.deduction_24b, LIMIT_24B_SELF_OCCUPIED);

  // Compute old regime taxable income with optimized deductions
  const oldBreakdown = computeOldRegimeTaxableIncome(salary, {
    hraExemption: optimalHra,
    total80c: optimal80c,
    total80d: optimal80d,
    total80ccd1b: optimalNps1b,
    total24b: optimal24b,
  });
  const oldTaxable = oldBreakdown.taxable_income;
  const oldTaxResult = calculateOldRegimeTax(oldTaxable, fy, ageCategory);
  const oldTax = oldTaxResult.total_tax;

  // ── Compare ─────────────────────────────────────────────────────────
  const savings = newTax - oldTax;
  const recommended = savings > 0 ? 'old' : 'new';

  // Build deductions_needed dict
  const deductionsNeeded = {};
  const current80c = salary.deduction_80c + salary.deduction_80ccc + salary.deduction_80ccd_1;
  if (optimalHra > salary.hra_exemption) {
    deductionsNeeded.hra_exemption = optimalHra;
  }
  const gap80c = LIMIT_80C - current80c;
  if (gap80c > 0) {
    deductionsNeeded.section_80c = optimal80c;
    deductionsNeeded.section_80c_gap = gap80c;
  }
  if (optimal80d > salary.deduction_80d) {
    deductionsNeeded.section_80d = optimal80d;
  }
  if (optimalNps1b > salary.deduction_80ccd_1b) {
    deductionsNeeded.section_80ccd_1b = optimalNps1b;
  }
  if (optimal24b > 0) {
    deductionsNeeded.section_24b = optimal24b;
  }

  if (savings > 0) {
    return createFinding({
      check_id: 'regime_arbitrage',
      check_name: 'Tax Regime Optimization',
      status: FindingStatus.OPPORTUNITY,
      finding: `Switching to old regime with full deductions saves \u20b9${savings.toLocaleString('en-IN')}`,
      savings,
      action: (
        `File ITR under old tax regime for FY ${fy}. ` +
        `Invest in ELSS/PPF for 80C, get parents' health insurance for 80D, ` +
        `and open NPS for 80CCD(1B) before March 31`
      ),
      deadline: 'July 31 (ITR filing) \u2014 but investments needed before March 31',
      confidence: Confidence.DEFINITE,
      explanation: (
        `Your employer applied the new regime (default), resulting in tax of ` +
        `\u20b9${newTax.toLocaleString('en-IN')}. Under the old regime with optimized deductions ` +
        `(HRA \u20b9${optimalHra.toLocaleString('en-IN')} + 80C \u20b9${optimal80c.toLocaleString('en-IN')} + ` +
        `80D \u20b9${optimal80d.toLocaleString('en-IN')} + NPS \u20b9${optimalNps1b.toLocaleString('en-IN')}` +
        (optimal24b > 0 ? ` + Home Loan \u20b9${optimal24b.toLocaleString('en-IN')}` : '') +
        `), your tax drops to \u20b9${oldTax.toLocaleString('en-IN')}.`
      ),
      details: {
        new_regime_tax: newTax,
        new_regime_taxable: newTaxable,
        old_regime_tax: oldTax,
        old_regime_taxable: oldTaxable,
        recommended_regime: recommended,
        old_regime_breakdown: oldBreakdown,
        deductions_needed: deductionsNeeded,
      },
    });
  } else {
    return createFinding({
      check_id: 'regime_arbitrage',
      check_name: 'Tax Regime Optimization',
      status: FindingStatus.OPTIMIZED,
      finding: `New regime is already optimal (saves \u20b9${(-savings).toLocaleString('en-IN')} vs old)`,
      savings: 0,
      action: 'No action needed \u2014 continue with new regime',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      explanation: (
        `New regime tax: \u20b9${newTax.toLocaleString('en-IN')}. ` +
        `Old regime tax (even with optimized deductions): \u20b9${oldTax.toLocaleString('en-IN')}. ` +
        `New regime is better by \u20b9${(-savings).toLocaleString('en-IN')}.`
      ),
      details: {
        new_regime_tax: newTax,
        new_regime_taxable: newTaxable,
        old_regime_tax: oldTax,
        old_regime_taxable: oldTaxable,
        recommended_regime: recommended,
        old_regime_breakdown: oldBreakdown,
      },
    });
  }
}
