/**
 * LTCG Estimator — converts gain range selection into synthetic Holdings.
 *
 * Creates a single representative holding that models the user's total
 * equity portfolio unrealized long-term capital gains. The LTCG scanner
 * then evaluates whether harvesting (sell + immediately repurchase)
 * saves future taxes by using the ₹1.25L annual exemption.
 *
 * Purchase date is set >12 months in the past so the holding qualifies
 * as long-term for equity. Purchase price is 0, current price equals
 * the estimated gain — so unrealized_gain = estimatedGain exactly.
 */

import { createHoldings } from './models.js';

/**
 * Range selection → representative LTCG amount.
 * Values are midpoints of each range (or conservative for open-ended).
 */
export const RANGE_MAP = {
  under_50k: 35_000,
  '50k_to_125k': 87_500,
  over_125k: 175_000,
  skip: null,
};

export const RANGE_OPTIONS = [
  { key: 'under_50k', label: 'Under ₹50,000', representative: 35_000 },
  { key: '50k_to_125k', label: '₹50,000 – ₹1,25,000', representative: 87_500 },
  { key: 'over_125k', label: 'Over ₹1,25,000', representative: 175_000 },
  { key: 'skip', label: 'Not sure — skip', representative: null },
];

/**
 * Convert investment question answers into Holdings for the LTCG scanner.
 *
 * @param {object} answers
 * @param {boolean} [answers.hasInvestments=false] - Q9: has stocks/MFs?
 * @param {string}  [answers.ltcgRange='skip']     - Q10: gain range key
 * @returns {object|null} Holdings for orchestrator, or null if no investments
 */
export function estimateLTCG(answers) {
  if (!answers.hasInvestments) return null;

  const estimatedGain = RANGE_MAP[answers.ltcgRange];
  if (estimatedGain == null) return null;

  // Synthetic holding: buy_price=0, current_price=gain.
  // Purchase date >12 months ago ensures it qualifies as long-term equity.
  return createHoldings({
    holdings: [
      {
        security_name: 'Your stock/MF portfolio (estimated)',
        security_type: 'equity_mf',
        purchase_date: '2023-01-01', // well over 12 months ago
        purchase_price: 0,
        quantity: 1,
        current_price: estimatedGain,
      },
    ],
    realized_stcg_this_fy: 0,
    realized_ltcg_this_fy: 0,
  });
}
