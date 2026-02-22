/**
 * Redemption Planner — compute tax on planned LTCG redemption.
 *
 * Two scenarios:
 *   1. Sell all in one FY → tax on gains exceeding this FY's exemption
 *   2. Split across two FYs → use both FYs' exemptions to minimize tax
 *
 * Pure deterministic function. No UI, no side effects.
 */

import { LTCG_RATE, CESS_RATE, LTCG_EXEMPTION } from './taxUtils.js';

/**
 * Compute tax for a planned LTCG sale under two scenarios.
 *
 * @param {number} plannedLtcg - Total long-term capital gain to redeem (₹)
 * @param {object} [opts]
 * @param {number} [opts.exemptionRemaining] - This FY's remaining exemption (default: full ₹1.25L)
 * @param {number} [opts.exemptionNextFy] - Next FY's exemption (default: full ₹1.25L)
 * @returns {object} Tax breakdown for both scenarios
 */
export function computeRedemptionTax(plannedLtcg, opts = {}) {
  const ltcg = Math.max(plannedLtcg || 0, 0);
  const exemptionRemaining = opts.exemptionRemaining ?? LTCG_EXEMPTION;
  const exemptionNextFy = opts.exemptionNextFy ?? LTCG_EXEMPTION;

  const taxRate = LTCG_RATE * (1 + CESS_RATE); // 12.5% × 1.04 = 13%

  // ── Scenario 1: Sell all in one FY ──────────────────────────────────
  const oneFyTaxable = Math.max(ltcg - exemptionRemaining, 0);
  const oneFyTax = Math.round(oneFyTaxable * taxRate);
  const oneFyEffective = ltcg > 0 ? oneFyTax / ltcg : 0;

  // ── Scenario 2: Split across two FYs ───────────────────────────────
  // FY1: sell up to this FY's remaining exemption (₹0 tax)
  const sellFy1 = Math.min(ltcg, exemptionRemaining);
  const taxFy1 = 0; // all within exemption

  // FY2: sell the rest, using next FY's full exemption
  const remainingAfterFy1 = ltcg - sellFy1;
  const taxableFy2 = Math.max(remainingAfterFy1 - exemptionNextFy, 0);
  const taxFy2 = Math.round(taxableFy2 * taxRate);

  const splitTotalTax = taxFy1 + taxFy2;
  const splitEffective = ltcg > 0 ? splitTotalTax / ltcg : 0;

  const splitSavings = oneFyTax - splitTotalTax;

  return {
    planned_ltcg: ltcg,
    one_fy: {
      taxable: oneFyTaxable,
      tax: oneFyTax,
      effective_rate: oneFyEffective,
      exemption_used: Math.min(ltcg, exemptionRemaining),
    },
    split_fy: {
      sell_fy1: sellFy1,
      tax_fy1: taxFy1,
      sell_fy2: remainingAfterFy1,
      taxable_fy2: taxableFy2,
      tax_fy2: taxFy2,
      total_tax: splitTotalTax,
      effective_rate: splitEffective,
    },
    split_beneficial: splitSavings > 0,
    split_savings: splitSavings,
    exemption_remaining: exemptionRemaining,
    exemption_next_fy: exemptionNextFy,
  };
}
