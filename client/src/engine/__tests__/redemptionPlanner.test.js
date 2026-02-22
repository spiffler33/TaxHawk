import { describe, it, expect } from 'vitest';
import { computeRedemptionTax } from '../redemptionPlanner.js';
import { LTCG_EXEMPTION } from '../taxUtils.js';

const TAX_RATE = 0.125 * 1.04; // 13% effective

describe('computeRedemptionTax', () => {
  // ── Zero / boundary inputs ──────────────────────────────────────────
  describe('zero and boundary inputs', () => {
    it('returns zero tax for ₹0 LTCG', () => {
      const r = computeRedemptionTax(0);
      expect(r.planned_ltcg).toBe(0);
      expect(r.one_fy.tax).toBe(0);
      expect(r.split_fy.total_tax).toBe(0);
      expect(r.split_beneficial).toBe(false);
      expect(r.split_savings).toBe(0);
    });

    it('clamps negative input to zero', () => {
      const r = computeRedemptionTax(-50_000);
      expect(r.planned_ltcg).toBe(0);
      expect(r.one_fy.tax).toBe(0);
      expect(r.split_fy.total_tax).toBe(0);
    });

    it('handles null/undefined input as zero', () => {
      expect(computeRedemptionTax(null).planned_ltcg).toBe(0);
      expect(computeRedemptionTax(undefined).planned_ltcg).toBe(0);
    });

    it('returns zero tax at exactly ₹1.25L (full exemption)', () => {
      const r = computeRedemptionTax(LTCG_EXEMPTION);
      expect(r.one_fy.taxable).toBe(0);
      expect(r.one_fy.tax).toBe(0);
      expect(r.one_fy.effective_rate).toBe(0);
      expect(r.split_beneficial).toBe(false);
    });
  });

  // ── Single FY tax calculation ───────────────────────────────────────
  describe('single FY (sell all now)', () => {
    it('computes tax on ₹3L LTCG (demo verification)', () => {
      const r = computeRedemptionTax(300_000);
      expect(r.one_fy.taxable).toBe(175_000);
      expect(r.one_fy.tax).toBe(Math.round(175_000 * TAX_RATE)); // ₹22,750
      expect(r.one_fy.tax).toBe(22_750);
      expect(r.one_fy.exemption_used).toBe(125_000);
    });

    it('computes tax on ₹10L LTCG', () => {
      const r = computeRedemptionTax(1_000_000);
      expect(r.one_fy.taxable).toBe(875_000);
      expect(r.one_fy.tax).toBe(Math.round(875_000 * TAX_RATE)); // ₹1,13,750
    });

    it('computes effective rate correctly', () => {
      const r = computeRedemptionTax(300_000);
      expect(r.one_fy.effective_rate).toBeCloseTo(22_750 / 300_000, 6);
    });

    it('effective rate approaches 13% for very large amounts', () => {
      const r = computeRedemptionTax(100_000_000); // ₹10Cr
      expect(r.one_fy.effective_rate).toBeGreaterThan(0.129);
      expect(r.one_fy.effective_rate).toBeLessThan(TAX_RATE);
    });
  });

  // ── FY split strategy ──────────────────────────────────────────────
  describe('FY split strategy', () => {
    it('₹2.5L fully exempt across 2 FYs (1.25L + 1.25L)', () => {
      const r = computeRedemptionTax(250_000);
      expect(r.split_fy.sell_fy1).toBe(125_000);
      expect(r.split_fy.sell_fy2).toBe(125_000);
      expect(r.split_fy.taxable_fy2).toBe(0);
      expect(r.split_fy.total_tax).toBe(0);
      expect(r.split_beneficial).toBe(true);
      // One-FY tax should be > 0 on the same amount
      expect(r.one_fy.tax).toBeGreaterThan(0);
    });

    it('₹3L split: ₹50K taxable in FY2 (demo verification)', () => {
      const r = computeRedemptionTax(300_000);
      expect(r.split_fy.sell_fy1).toBe(125_000);
      expect(r.split_fy.tax_fy1).toBe(0);
      expect(r.split_fy.sell_fy2).toBe(175_000);
      expect(r.split_fy.taxable_fy2).toBe(50_000);
      expect(r.split_fy.tax_fy2).toBe(Math.round(50_000 * TAX_RATE)); // ₹6,500
      expect(r.split_fy.tax_fy2).toBe(6_500);
      expect(r.split_fy.total_tax).toBe(6_500);
    });

    it('split savings = one_fy tax - split total tax', () => {
      const r = computeRedemptionTax(300_000);
      expect(r.split_savings).toBe(r.one_fy.tax - r.split_fy.total_tax);
      expect(r.split_savings).toBe(22_750 - 6_500); // ₹16,250
      expect(r.split_savings).toBe(16_250);
    });

    it('split_beneficial is true when there are savings', () => {
      // Any amount > ₹1.25L benefits from splitting
      expect(computeRedemptionTax(200_000).split_beneficial).toBe(true);
      // Amount <= exemption: no benefit (both are ₹0 tax)
      expect(computeRedemptionTax(125_000).split_beneficial).toBe(false);
      expect(computeRedemptionTax(100_000).split_beneficial).toBe(false);
    });

    it('split effective rate is lower than one-FY rate', () => {
      const r = computeRedemptionTax(500_000);
      expect(r.split_fy.effective_rate).toBeLessThan(r.one_fy.effective_rate);
    });
  });

  // ── Partial exemption (already used some this FY) ──────────────────
  describe('partial exemption remaining', () => {
    it('half-used exemption (₹62.5K remaining)', () => {
      const r = computeRedemptionTax(300_000, { exemptionRemaining: 62_500 });
      // One-FY: taxable = 300K - 62.5K = 237.5K
      expect(r.one_fy.taxable).toBe(237_500);
      expect(r.one_fy.tax).toBe(Math.round(237_500 * TAX_RATE));
      // Split: FY1 sells 62.5K (₹0 tax), FY2 sells 237.5K, taxable = 237.5K - 125K = 112.5K
      expect(r.split_fy.sell_fy1).toBe(62_500);
      expect(r.split_fy.sell_fy2).toBe(237_500);
      expect(r.split_fy.taxable_fy2).toBe(112_500);
    });

    it('zero exemption remaining (fully used this FY)', () => {
      const r = computeRedemptionTax(200_000, { exemptionRemaining: 0 });
      // One-FY: full amount taxable
      expect(r.one_fy.taxable).toBe(200_000);
      // Split: FY1 sells ₹0, FY2 sells 200K with full 125K exemption
      expect(r.split_fy.sell_fy1).toBe(0);
      expect(r.split_fy.sell_fy2).toBe(200_000);
      expect(r.split_fy.taxable_fy2).toBe(75_000);
      expect(r.split_beneficial).toBe(true);
    });

    it('custom next-FY exemption', () => {
      const r = computeRedemptionTax(300_000, {
        exemptionRemaining: 125_000,
        exemptionNextFy: 0, // hypothetical: already allocated next FY exemption
      });
      // Split FY2 has no exemption, so full FY2 amount is taxable
      expect(r.split_fy.sell_fy2).toBe(175_000);
      expect(r.split_fy.taxable_fy2).toBe(175_000);
      // Same as one-FY since next FY exemption is 0
      expect(r.split_fy.total_tax).toBe(r.one_fy.tax);
      expect(r.split_beneficial).toBe(false);
    });
  });

  // ── Effective rate behavior ────────────────────────────────────────
  describe('effective rate', () => {
    it('0% at or below exemption', () => {
      expect(computeRedemptionTax(50_000).one_fy.effective_rate).toBe(0);
      expect(computeRedemptionTax(125_000).one_fy.effective_rate).toBe(0);
    });

    it('increases with amount but never reaches 13%', () => {
      const rates = [200_000, 500_000, 1_000_000, 5_000_000].map(
        (a) => computeRedemptionTax(a).one_fy.effective_rate
      );
      // Each should be higher than the previous
      for (let i = 1; i < rates.length; i++) {
        expect(rates[i]).toBeGreaterThan(rates[i - 1]);
      }
      // All below 13%
      for (const rate of rates) {
        expect(rate).toBeLessThan(TAX_RATE);
      }
    });
  });

  // ── Default values ─────────────────────────────────────────────────
  describe('defaults', () => {
    it('uses full LTCG_EXEMPTION when opts not provided', () => {
      const r = computeRedemptionTax(200_000);
      expect(r.exemption_remaining).toBe(LTCG_EXEMPTION);
      expect(r.exemption_next_fy).toBe(LTCG_EXEMPTION);
    });
  });
});
