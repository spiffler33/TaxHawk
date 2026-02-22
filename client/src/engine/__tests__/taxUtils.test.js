/**
 * Unit tests for engine/taxUtils.js
 *
 * Ported from Python tests/test_tax_utils.py — verifies slab math,
 * cess, Section 87A rebate, marginal rates, HRA exemption, and
 * taxable income derivation all match the Python reference.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTaxOnSlabs,
  applyCess,
  apply87aRebate,
  getMarginalRate,
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  computeNewRegimeTaxableIncome,
  computeOldRegimeTaxableIncome,
  calculateHraExemption,
  NEW_REGIME_SLABS_FY2024_25,
  NEW_REGIME_SLABS_FY2025_26,
  OLD_REGIME_SLABS_BELOW_60,
  OLD_REGIME_SLABS_SENIOR,
  OLD_REGIME_SLABS_SUPER_SENIOR,
  CESS_RATE,
  LIMIT_80C,
  LIMIT_80CCD_1B,
  STANDARD_DEDUCTION,
} from '../taxUtils.js';
import { createSalaryProfile } from '../models.js';
import { PRIYA_PROFILE } from '../../data/demoProfile.js';


// Helper: create Priya's salary profile
const priyaSalary = () => createSalaryProfile(PRIYA_PROFILE);


// ═══════════════════════════════════════════════════════════════════════════════
// computeTaxOnSlabs — progressive slab calculation
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeTaxOnSlabs', () => {
  it('zero income → zero tax', () => {
    expect(computeTaxOnSlabs(0, NEW_REGIME_SLABS_FY2024_25)).toBe(0);
  });

  it('income within first slab (≤₹3L) → 0% tax', () => {
    expect(computeTaxOnSlabs(200_000, NEW_REGIME_SLABS_FY2024_25)).toBe(0);
    expect(computeTaxOnSlabs(300_000, NEW_REGIME_SLABS_FY2024_25)).toBe(0);
  });

  it('income in second slab → 5% on amount above ₹3L', () => {
    expect(computeTaxOnSlabs(500_000, NEW_REGIME_SLABS_FY2024_25)).toBe(10_000);
    expect(computeTaxOnSlabs(700_000, NEW_REGIME_SLABS_FY2024_25)).toBe(20_000);
  });

  it('exact slab boundary ₹10L', () => {
    expect(computeTaxOnSlabs(1_000_000, NEW_REGIME_SLABS_FY2024_25)).toBe(50_000);
  });

  it('high income ₹23,22,600 new regime', () => {
    expect(computeTaxOnSlabs(2_322_600, NEW_REGIME_SLABS_FY2024_25)).toBe(386_780);
  });

  it('Priya old regime ₹9,82,600', () => {
    expect(computeTaxOnSlabs(982_600, OLD_REGIME_SLABS_BELOW_60)).toBe(109_020);
  });

  it('senior citizen ₹4L', () => {
    expect(computeTaxOnSlabs(400_000, OLD_REGIME_SLABS_SENIOR)).toBe(5_000);
    expect(computeTaxOnSlabs(400_000, OLD_REGIME_SLABS_BELOW_60)).toBe(7_500);
  });

  it('super senior ₹5L and ₹8L', () => {
    expect(computeTaxOnSlabs(500_000, OLD_REGIME_SLABS_SUPER_SENIOR)).toBe(0);
    expect(computeTaxOnSlabs(800_000, OLD_REGIME_SLABS_SUPER_SENIOR)).toBe(60_000);
  });

  it('FY 2025-26 new regime ₹12L', () => {
    expect(computeTaxOnSlabs(1_200_000, NEW_REGIME_SLABS_FY2025_26)).toBe(60_000);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// applyCess
// ═══════════════════════════════════════════════════════════════════════════════

describe('applyCess', () => {
  it('cess on zero', () => {
    expect(applyCess(0)).toBe(0);
  });

  it('standard 4% cess', () => {
    expect(applyCess(100_000)).toBe(4_000);
  });

  it('cess rounding: 109020 * 0.04 = 4360.8 → 4361', () => {
    expect(applyCess(109_020)).toBe(4_361);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// apply87aRebate
// ═══════════════════════════════════════════════════════════════════════════════

describe('apply87aRebate', () => {
  it('new regime eligible (≤₹7L) → full rebate', () => {
    expect(apply87aRebate(15_000, 600_000, 'new', '2024-25')).toBe(0);
  });

  it('new regime at ₹7L limit → eligible', () => {
    expect(apply87aRebate(20_000, 700_000, 'new', '2024-25')).toBe(0);
  });

  it('new regime above limit → no rebate (cliff)', () => {
    expect(apply87aRebate(20_001, 700_001, 'new', '2024-25')).toBe(20_001);
  });

  it('old regime eligible (≤₹5L)', () => {
    expect(apply87aRebate(12_500, 500_000, 'old', '2024-25')).toBe(0);
  });

  it('old regime above limit', () => {
    expect(apply87aRebate(12_500, 500_001, 'old', '2024-25')).toBe(12_500);
  });

  it('rebate capped at max (new ₹25K)', () => {
    expect(apply87aRebate(30_000, 700_000, 'new', '2024-25')).toBe(5_000);
  });

  it('FY 2025-26 new regime higher limit', () => {
    expect(apply87aRebate(60_000, 1_200_000, 'new', '2025-26')).toBe(0);
    expect(apply87aRebate(60_000, 1_200_001, 'new', '2025-26')).toBe(60_000);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// getMarginalRate
// ═══════════════════════════════════════════════════════════════════════════════

describe('getMarginalRate', () => {
  it('zero income → 0%', () => {
    expect(getMarginalRate(0, 'old')).toBe(0.0);
  });

  it('old regime 5% slab', () => {
    expect(getMarginalRate(400_000, 'old')).toBe(0.05);
  });

  it('old regime 20% slab', () => {
    expect(getMarginalRate(800_000, 'old')).toBe(0.20);
  });

  it('Priya GTI ₹12,07,600 → 30%', () => {
    expect(getMarginalRate(1_207_600, 'old')).toBe(0.30);
  });

  it('new regime 15% slab', () => {
    expect(getMarginalRate(1_100_000, 'new', '2024-25')).toBe(0.15);
  });

  it('new regime 30% slab', () => {
    expect(getMarginalRate(2_000_000, 'new', '2024-25')).toBe(0.30);
  });

  it('exactly at ₹10L → 20% (old)', () => {
    expect(getMarginalRate(1_000_000, 'old')).toBe(0.20);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// calculateNewRegimeTax — full pipeline
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateNewRegimeTax', () => {
  it('Priya ₹14,22,600 → ₹1,29,501', () => {
    const result = calculateNewRegimeTax(1_422_600, '2024-25');
    expect(result.total_tax).toBe(129_501);
  });

  it('Priya breakdown components', () => {
    const result = calculateNewRegimeTax(1_422_600, '2024-25');
    expect(result.base_tax).toBe(124_520);
    expect(result.rebate_87a).toBe(0);
    expect(result.surcharge).toBe(0);
    expect(result.cess).toBe(applyCess(124_520));
    expect(result.total_tax).toBe(124_520 + applyCess(124_520));
  });

  it('DEMO_SCENARIO ₹24L profile → ₹4,02,251', () => {
    expect(calculateNewRegimeTax(2_322_600, '2024-25').total_tax).toBe(402_251);
  });

  it('below rebate threshold → zero', () => {
    expect(calculateNewRegimeTax(600_000, '2024-25').total_tax).toBe(0);
  });

  it('zero income → zero', () => {
    expect(calculateNewRegimeTax(0, '2024-25').total_tax).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// calculateOldRegimeTax — full pipeline
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateOldRegimeTax', () => {
  it('Priya optimized ₹9,82,600 → ₹1,13,381', () => {
    expect(calculateOldRegimeTax(982_600, '2024-25').total_tax).toBe(113_381);
  });

  it('Priya breakdown', () => {
    const result = calculateOldRegimeTax(982_600, '2024-25');
    expect(result.base_tax).toBe(109_020);
    expect(result.rebate_87a).toBe(0);
    expect(result.surcharge).toBe(0);
    expect(result.cess).toBe(applyCess(109_020));
  });

  it('DEMO_SCENARIO ₹24L old regime → ₹3,79,891', () => {
    expect(calculateOldRegimeTax(1_842_600, '2024-25').total_tax).toBe(379_891);
  });

  it('below rebate → zero', () => {
    expect(calculateOldRegimeTax(400_000, '2024-25').total_tax).toBe(0);
  });

  it('senior citizen base_tax differs', () => {
    const regular = calculateOldRegimeTax(400_000, '2024-25', 'below_60');
    const senior = calculateOldRegimeTax(400_000, '2024-25', 'senior');
    expect(regular.total_tax).toBe(0);
    expect(senior.total_tax).toBe(0);
    expect(regular.base_tax).toBe(7_500);
    expect(senior.base_tax).toBe(5_000);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// computeNewRegimeTaxableIncome
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeNewRegimeTaxableIncome', () => {
  it('Priya: 15L - 75K - 2400 = ₹14,22,600', () => {
    expect(computeNewRegimeTaxableIncome(priyaSalary())).toBe(1_422_600);
  });

  it('with employer NPS (80CCD(2))', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'Test',
      gross_salary: 1_500_000,
      basic_salary: 600_000,
      professional_tax: 2_400,
      deduction_80ccd_2: 60_000,
    });
    expect(computeNewRegimeTaxableIncome(salary)).toBe(1_500_000 - 75_000 - 2_400 - 60_000);
  });

  it('minimum zero', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'Test',
      gross_salary: 50_000,
      basic_salary: 50_000,
    });
    expect(computeNewRegimeTaxableIncome(salary)).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// computeOldRegimeTaxableIncome
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeOldRegimeTaxableIncome', () => {
  it('Priya optimized → taxable ₹9,82,600', () => {
    const result = computeOldRegimeTaxableIncome(priyaSalary(), {
      hraExemption: 240_000,
      total80c: 150_000,
      total80d: 25_000,
      total80ccd1b: 50_000,
    });
    expect(result.taxable_income).toBe(982_600);
  });

  it('Priya full breakdown', () => {
    const result = computeOldRegimeTaxableIncome(priyaSalary(), {
      hraExemption: 240_000,
      total80c: 150_000,
      total80d: 25_000,
      total80ccd1b: 50_000,
    });
    expect(result.gross_salary).toBe(1_500_000);
    expect(result.hra_exemption).toBe(240_000);
    expect(result.net_salary).toBe(1_260_000);
    expect(result.standard_deduction).toBe(50_000); // Old regime FY 2024-25
    expect(result.professional_tax).toBe(2_400);
    expect(result.gross_total_income).toBe(1_207_600);
    expect(result.deduction_80c).toBe(150_000);
    expect(result.deduction_80d).toBe(25_000);
    expect(result.deduction_80ccd_1b).toBe(50_000);
    expect(result.total_vi_a).toBe(225_000);
    expect(result.taxable_income).toBe(982_600);
  });

  it('defaults use Form 16 values', () => {
    const result = computeOldRegimeTaxableIncome(priyaSalary());
    expect(result.hra_exemption).toBe(0);
    expect(result.deduction_80c).toBe(72_000);
    expect(result.deduction_80d).toBe(0);
    expect(result.deduction_80ccd_1b).toBe(0);
  });

  it('standard deduction old vs new', () => {
    expect(STANDARD_DEDUCTION['2024-25'].old).toBe(50_000);
    expect(STANDARD_DEDUCTION['2024-25'].new).toBe(75_000);
    expect(STANDARD_DEDUCTION['2025-26'].old).toBe(75_000);
    expect(STANDARD_DEDUCTION['2025-26'].new).toBe(75_000);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// calculateHraExemption
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateHraExemption', () => {
  it('Priya metro: min(3L, 2.4L, 3L) = ₹2,40,000', () => {
    expect(calculateHraExemption(600_000, 300_000, 300_000, true)).toBe(240_000);
  });

  it('DEMO_SCENARIO non-metro: min(4L, 2.8L, 3.2L) = ₹2,80,000', () => {
    expect(calculateHraExemption(800_000, 400_000, 360_000, false)).toBe(280_000);
  });

  it('zero rent → 0', () => {
    expect(calculateHraExemption(600_000, 300_000, 0, true)).toBe(0);
  });

  it('very low rent → 0 (option B negative)', () => {
    expect(calculateHraExemption(600_000, 300_000, 50_000, true)).toBe(0);
  });

  it('metro vs non-metro same rent', () => {
    expect(calculateHraExemption(600_000, 300_000, 300_000, true)).toBe(240_000);
    expect(calculateHraExemption(600_000, 300_000, 300_000, false)).toBe(240_000);
  });

  it('HRA limited by actual HRA received (option A)', () => {
    expect(calculateHraExemption(1_000_000, 100_000, 500_000, true)).toBe(100_000);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Surcharge + Marginal Relief — high earners
// ═══════════════════════════════════════════════════════════════════════════════

describe('surcharge and marginal relief (old regime)', () => {
  it('₹50L exactly → no surcharge', () => {
    const r = calculateOldRegimeTax(5_000_000, '2024-25');
    expect(r.base_tax).toBe(1_312_500);
    expect(r.surcharge).toBe(0);
    expect(r.cess).toBe(52_500);
    expect(r.total_tax).toBe(1_365_000);
  });

  it('₹51L → 10% surcharge with marginal relief', () => {
    const r = calculateOldRegimeTax(5_100_000, '2024-25');
    expect(r.base_tax).toBe(1_342_500);
    // Raw surcharge would be ₹1,34,250 but marginal relief caps it at ₹70,000
    expect(r.surcharge).toBe(70_000);
    expect(r.cess).toBe(56_500);
    expect(r.total_tax).toBe(1_469_000);
  });

  it('₹75L → 10% surcharge, no marginal relief needed', () => {
    const r = calculateOldRegimeTax(7_500_000, '2024-25');
    expect(r.base_tax).toBe(2_062_500);
    expect(r.surcharge).toBe(206_250);
    expect(r.cess).toBe(90_750);
    expect(r.total_tax).toBe(2_359_500);
  });

  it('₹1Cr exactly → 10% surcharge (top of slab)', () => {
    const r = calculateOldRegimeTax(10_000_000, '2024-25');
    expect(r.base_tax).toBe(2_812_500);
    expect(r.surcharge).toBe(281_250);
    expect(r.cess).toBe(123_750);
    expect(r.total_tax).toBe(3_217_500);
  });

  it('₹1.01Cr → 15% surcharge with marginal relief', () => {
    const r = calculateOldRegimeTax(10_100_000, '2024-25');
    expect(r.base_tax).toBe(2_842_500);
    // Raw 15% = ₹4,26,375 → marginal relief caps at ₹3,51,250
    expect(r.surcharge).toBe(351_250);
    expect(r.cess).toBe(127_750);
    expect(r.total_tax).toBe(3_321_500);
  });

  it('surcharge cannot make (tax+surcharge) exceed threshold + excess income', () => {
    // Marginal relief caps (tax + surcharge) BEFORE cess.
    // (tax+surcharge at ₹51L) ≤ (tax+surcharge at ₹50L) + ₹1L excess
    const at50L = calculateOldRegimeTax(5_000_000, '2024-25');
    const at51L = calculateOldRegimeTax(5_100_000, '2024-25');
    const preCess50L = at50L.tax_after_rebate + at50L.surcharge;
    const preCess51L = at51L.tax_after_rebate + at51L.surcharge;
    expect(preCess51L).toBeLessThanOrEqual(preCess50L + 100_000);
  });
});

describe('surcharge and marginal relief (new regime)', () => {
  it('₹55L CTC → taxable ₹50,52,780 → marginal relief', () => {
    // CTC=55L: basic=22L, EPF_employer=2,64,000, gratuity=1,05,820
    // gross=51,30,180, taxable=51,30,180-75,000-2,400=50,52,780
    const r = calculateNewRegimeTax(5_052_780, '2024-25');
    expect(r.base_tax).toBe(1_205_834);
    // Raw 10% = ₹1,20,583 → marginal relief caps at ₹36,946
    expect(r.surcharge).toBe(36_946);
    expect(r.cess).toBe(49_711);
    expect(r.total_tax).toBe(1_292_491);
  });

  it('₹4Cr CTC → taxable ₹3,72,33,000 → 25% surcharge, no relief', () => {
    // CTC=4Cr: basic=1.6Cr, EPF=19,20,000, gratuity=7,69,600
    // gross=3,73,10,400, taxable=3,73,10,400-75,000-2,400=3,72,33,000
    const r = calculateNewRegimeTax(37_233_000, '2024-25');
    expect(r.base_tax).toBe(10_859_900);
    expect(r.surcharge).toBe(2_714_975);
    expect(r.cess).toBe(542_995);
    expect(r.total_tax).toBe(14_117_870);
  });

  it('new regime surcharge capped at 25% even above ₹5Cr', () => {
    // ₹6Cr taxable income: should use 25%, NOT 37%
    const r = calculateNewRegimeTax(60_000_000, '2024-25');
    const expectedBase = computeTaxOnSlabs(60_000_000, NEW_REGIME_SLABS_FY2024_25);
    // Verify surcharge is at most 25% of base (not 37%)
    expect(r.surcharge).toBeLessThanOrEqual(Math.round(expectedBase * 0.25));
  });

  it('marginal relief invariant: (tax+surcharge) at ₹50,52,780 ≤ threshold + excess', () => {
    // Marginal relief caps (tax + surcharge) BEFORE cess
    const at50L = calculateNewRegimeTax(5_000_000, '2024-25');
    const at5052780 = calculateNewRegimeTax(5_052_780, '2024-25');
    const preCess50L = at50L.tax_after_rebate + at50L.surcharge;
    const preCess5052780 = at5052780.tax_after_rebate + at5052780.surcharge;
    expect(preCess5052780).toBeLessThanOrEqual(preCess50L + 52_780);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Constants validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('constants', () => {
  it('80C limit is 1.5L', () => {
    expect(LIMIT_80C).toBe(150_000);
  });

  it('80CCD(1B) limit is 50K', () => {
    expect(LIMIT_80CCD_1B).toBe(50_000);
  });

  it('cess rate is 4%', () => {
    expect(CESS_RATE).toBe(0.04);
  });
});
