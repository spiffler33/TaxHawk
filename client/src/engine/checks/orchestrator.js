/**
 * Orchestrator — runs all 6 checks and produces the final TaxHawkResult.
 *
 * CRITICAL interdependency logic:
 *   - If regime_comparator recommends OLD → individual checks show component savings
 *   - If regime_comparator recommends NEW → zero out deduction-based savings
 *   - Capital gains check applies in BOTH regimes
 *   - Total savings = regime_switch_savings + capital_gains_savings
 *     (NOT the sum of all individual checks)
 *
 * Ported from backend/tax_engine/checks/orchestrator.py
 */

import {
  FindingStatus,
  createHoldings,
  createTaxHawkResult,
} from '../models.js';
import { checkRegime } from './regimeComparator.js';
import { check80c } from './eightyCGap.js';
import { check80d } from './eightyDCheck.js';
import { checkHra } from './hraOptimizer.js';
import { checkCapitalGains } from './ltcgScanner.js';
import { checkNps } from './npsCheck.js';
import { checkHomeLoan } from './homeLoanCheck.js';

/**
 * Run all 6 optimization checks and produce the final report.
 * @param {object} salary - SalaryProfile
 * @param {object} [holdings] - Holdings (optional)
 * @param {object} [opts]
 * @param {boolean} [opts.parentsSenior=false]
 * @param {Date} [opts.cgAsOf] - Reference date for capital gains
 * @returns {object} TaxHawkResult
 */
export function runAllChecks(salary, holdings, opts = {}) {
  const parentsSenior = opts.parentsSenior || false;
  const cgAsOf = opts.cgAsOf || null;

  if (!holdings) {
    holdings = createHoldings({});
  }

  // ── Step 1: Run all checks ──────────────────────────────────────────
  const regimeResult = checkRegime(salary, { parentsSenior });
  const result80c = check80c(salary);
  const result80d = check80d(salary, { parentsSenior });
  const resultHra = checkHra(salary);
  const resultCg = checkCapitalGains(holdings, { asOf: cgAsOf });
  const resultNps = checkNps(salary);
  const resultHomeLoan = checkHomeLoan(salary);

  // ── Step 2: Handle regime interdependency ───────────────────────────
  const recommendedRegime = regimeResult.details.recommended_regime || 'new';

  const allChecks = [regimeResult, result80c, result80d, resultHra, resultCg, resultNps, resultHomeLoan];

  if (recommendedRegime === 'new') {
    // Deduction-based savings don't apply under new regime
    const deductionChecks = [result80c, result80d, resultHra, resultNps, resultHomeLoan];
    for (const check of deductionChecks) {
      const oldSavings = check.savings;
      check.savings = 0;
      check.status = FindingStatus.NOT_APPLICABLE;
      if (oldSavings > 0) {
        check.finding = (
          `Not applicable under new regime ` +
          `(would save \u20b9${oldSavings.toLocaleString('en-IN')} under old regime)`
        );
      }
    }
  }

  // ── Step 3: Calculate total savings ─────────────────────────────────
  // CRITICAL: NO DOUBLE-COUNTING.
  //   regime_result.savings already includes HRA + 80C + 80D + NPS combined effect.
  //   Capital gains is the only independent, additive savings.
  const totalSavings = regimeResult.savings + resultCg.savings;

  // ── Step 4: Sort by savings (descending) ────────────────────────────
  allChecks.sort((a, b) => b.savings - a.savings);

  // ── Step 5: Generate summary ────────────────────────────────────────
  const summary = generateSummary(salary, allChecks, totalSavings, recommendedRegime);

  return createTaxHawkResult({
    user_name: salary.employee_name,
    financial_year: salary.financial_year,
    current_regime: salary.regime,
    recommended_regime: recommendedRegime,
    total_savings: totalSavings,
    checks: allChecks,
    summary,
  });
}

/**
 * Generate a plain-English summary of all findings.
 */
function generateSummary(salary, checks, totalSavings, recommendedRegime) {
  const opportunities = checks.filter(c => c.status === FindingStatus.OPPORTUNITY);
  const lines = [];

  if (totalSavings > 0) {
    lines.push(
      `TaxHawk found \u20b9${totalSavings.toLocaleString('en-IN')} in potential tax savings ` +
      `for ${salary.employee_name} (FY ${salary.financial_year}).`
    );

    if (recommendedRegime === 'old' && salary.regime === 'new') {
      lines.push(
        `The biggest opportunity: switching from the new tax regime ` +
        `(employer default) to the old regime with optimized deductions.`
      );
    }

    if (opportunities.length > 0) {
      lines.push(`\n${opportunities.length} optimization(s) found:`);
      for (const opp of opportunities) {
        if (opp.savings > 0) {
          lines.push(`  - ${opp.check_name}: \u20b9${opp.savings.toLocaleString('en-IN')}`);
        }
      }
    }
  } else {
    lines.push(
      `Your tax setup is already well-optimized for FY ${salary.financial_year}. ` +
      `No significant savings opportunities found.`
    );
  }

  return lines.join('\n');
}
