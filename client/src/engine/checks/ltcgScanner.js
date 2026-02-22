/**
 * Check 5: Capital Gains Optimization.
 *
 * REGIME-INDEPENDENT — applies in both regimes.
 *   5a) LTCG Harvesting — use the ₹1.25L annual exemption
 *   5b) Holding Period Alerts — don't sell STCG when LTCG is weeks away
 *   5c) Tax-Loss Harvesting — offset gains with losses
 *
 * India has NO wash sale rule.
 *
 * Ported from backend/tax_engine/checks/capital_gains.py
 */

import { FindingStatus, Confidence, createFinding } from '../models.js';
import { LTCG_EXEMPTION, LTCG_RATE, STCG_RATE, CESS_RATE } from '../taxUtils.js';

/**
 * Analyze capital gains optimization opportunities.
 * @param {object} holdings - Holdings object
 * @param {object} [opts]
 * @param {Date} [opts.asOf] - Reference date for holding period (default: March 31 of current FY)
 * @returns {object} Finding
 */
export function checkCapitalGains(holdings, opts = {}) {
  let asOf = opts.asOf || null;

  if (!asOf) {
    const today = new Date();
    if (today.getMonth() < 3) { // Jan-Mar (0-indexed: 0=Jan, 1=Feb, 2=Mar)
      asOf = new Date(today.getFullYear(), 2, 31); // March 31 this year
    } else {
      asOf = new Date(today.getFullYear() + 1, 2, 31); // March 31 next year
    }
  }

  if (!holdings.holdings || holdings.holdings.length === 0) {
    return createFinding({
      check_id: 'capital_gains',
      check_name: 'Capital Gains Optimization',
      status: FindingStatus.NOT_APPLICABLE,
      finding: 'No investment holdings to analyze',
      savings: 0,
      action: 'N/A',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {},
    });
  }

  // ── 5a: LTCG Harvesting ────────────────────────────────────────────
  const ltcgHoldings = [];
  const stcgHoldings = [];
  const holdingPeriodAlerts = [];

  for (const h of holdings.holdings) {
    const months = h.holdingMonths(asOf);
    const gain = h.unrealized_gain;
    const isLt = h.isLongTerm(asOf);

    if (isLt && gain > 0) {
      ltcgHoldings.push({
        name: h.security_name,
        gain,
        months,
        cost: h.total_cost,
        value: h.current_value,
      });
    } else if (!isLt) {
      stcgHoldings.push({
        name: h.security_name,
        gain,
        months,
        months_to_ltcg: months < 13 ? 13 - months : 0,
        cost: h.total_cost,
        value: h.current_value,
      });
      // Holding period alert: close to LTCG threshold
      if (months >= 10 && months <= 12 && gain > 0) {
        holdingPeriodAlerts.push({
          security: h.security_name,
          months_held: months,
          months_to_ltcg: 13 - months,
          gain,
          stcg_tax: Math.round(gain * STCG_RATE * (1 + CESS_RATE)),
          advice: (
            `Wait ${13 - months} month(s) before selling to ` +
            `qualify for LTCG rate (12.5% vs 20%)`
          ),
        });
      }
    }
  }

  const totalUnrealizedLtcg = ltcgHoldings.reduce((sum, h) => sum + h.gain, 0);
  const totalUnrealizedStcg = stcgHoldings
    .filter(h => h.gain > 0)
    .reduce((sum, h) => sum + h.gain, 0);

  // Include already realized LTCG this FY
  const exemptionRemaining = Math.max(LTCG_EXEMPTION - holdings.realized_ltcg_this_fy, 0);

  // How much can be harvested tax-free?
  const harvestableLtcg = Math.min(totalUnrealizedLtcg, exemptionRemaining);
  const futureTaxSaved = Math.round(harvestableLtcg * LTCG_RATE * (1 + CESS_RATE));

  const holdingsToHarvest = ltcgHoldings.filter(h => h.gain > 0).map(h => h.name);

  // ── 5c: Tax-Loss Harvesting ─────────────────────────────────────────
  const unrealizedLosses = [];
  for (const h of holdings.holdings) {
    if (h.unrealized_gain < 0) {
      unrealizedLosses.push({
        name: h.security_name,
        loss: Math.abs(h.unrealized_gain),
        is_long_term: h.isLongTerm(asOf),
      });
    }
  }

  // ── Build result ────────────────────────────────────────────────────
  if (harvestableLtcg <= 0 && holdingPeriodAlerts.length === 0) {
    return createFinding({
      check_id: 'capital_gains',
      check_name: 'Capital Gains Optimization',
      status: FindingStatus.OPTIMIZED,
      finding: 'No harvestable LTCG or holding period optimizations found',
      savings: 0,
      action: 'No action needed',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        unrealized_ltcg: totalUnrealizedLtcg,
        unrealized_stcg: totalUnrealizedStcg,
        ltcg_exemption_limit: LTCG_EXEMPTION,
      },
    });
  }

  // Build action text
  let action;
  if (holdingsToHarvest.length > 0) {
    const harvestNames = holdingsToHarvest.join(', ');
    action = (
      `Before March 31: Sell ${harvestNames}. ` +
      `Immediately repurchase. This resets cost basis and uses ` +
      `your \u20b9${(LTCG_EXEMPTION / 1000).toFixed(0)}K annual LTCG exemption`
    );
  } else {
    action = 'Monitor holdings for LTCG harvesting opportunity';
  }

  const details = {
    unrealized_ltcg: totalUnrealizedLtcg,
    unrealized_stcg: totalUnrealizedStcg,
    realized_ltcg_this_fy: holdings.realized_ltcg_this_fy,
    ltcg_exemption_limit: LTCG_EXEMPTION,
    exemption_used: harvestableLtcg,
    exemption_remaining: exemptionRemaining - harvestableLtcg,
    future_tax_saved: futureTaxSaved,
    holdings_to_harvest: holdingsToHarvest,
  };

  if (holdingPeriodAlerts.length > 0) {
    details.holding_period_alerts = holdingPeriodAlerts;
  }

  if (unrealizedLosses.length > 0) {
    details.unrealized_losses = unrealizedLosses;
  }

  return createFinding({
    check_id: 'capital_gains',
    check_name: 'Capital Gains Optimization',
    status: FindingStatus.OPPORTUNITY,
    finding: (
      `\u20b9${totalUnrealizedLtcg.toLocaleString('en-IN')} unrealized LTCG can be ` +
      `harvested tax-free. Saves \u20b9${futureTaxSaved.toLocaleString('en-IN')} in future taxes`
    ),
    savings: futureTaxSaved,
    action,
    deadline: 'March 31 (end of financial year)',
    confidence: Confidence.DEFINITE,
    explanation: (
      `You have \u20b9${totalUnrealizedLtcg.toLocaleString('en-IN')} in unrealized long-term ` +
      `capital gains, well under the \u20b9${LTCG_EXEMPTION.toLocaleString('en-IN')} annual exemption. ` +
      `By selling and immediately repurchasing (legal in India \u2014 no wash sale rule), ` +
      `you reset your cost basis higher and avoid 12.5% tax on these gains in the future.`
    ),
    details,
  });
}
