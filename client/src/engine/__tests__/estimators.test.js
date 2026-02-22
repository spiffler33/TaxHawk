/**
 * Tests for CTC Estimator and LTCG Estimator.
 *
 * Verifies that user questionnaire answers produce valid SalaryProfiles
 * and Holdings that the orchestrator can process with correct results.
 *
 * Key test: ₹18L CTC + ₹25K rent + metro → positive savings.
 */

import { describe, it, expect } from 'vitest';
import { estimateFromCTC, getEstimateBreakdown, CITY_OPTIONS } from '../ctcEstimator.js';
import { estimateLTCG, RANGE_MAP } from '../ltcgEstimator.js';
import { createSalaryProfile, createHoldings, FindingStatus } from '../models.js';
import { runAllChecks } from '../checks/orchestrator.js';
import { LTCG_RATE, CESS_RATE, LTCG_EXEMPTION } from '../taxUtils.js';


// ═══════════════════════════════════════════════════════════════════════════════
// CTC ESTIMATOR — Salary Structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('CTC Estimator — salary structure', () => {
  it('₹18L CTC produces correct breakdown', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000 });

    // Basic = 40% of CTC
    expect(profile.basic_salary).toBe(720_000);
    // HRA = 50% of basic
    expect(profile.hra_received).toBe(360_000);
    // EPF = 12% of basic
    expect(profile.epf_employee_contribution).toBe(86_400);

    // Employer costs (not in gross)
    const employerEpf = 86_400;
    const gratuity = Math.round(720_000 * 0.0481); // 34,632
    expect(profile.gross_salary).toBe(1_800_000 - employerEpf - gratuity);

    // Special = gross - basic - HRA
    expect(profile.special_allowance).toBe(
      profile.gross_salary - profile.basic_salary - profile.hra_received
    );
  });

  it('gross salary = CTC - employer EPF - gratuity', () => {
    const ctc = 1_800_000;
    const basic = Math.round(ctc * 0.40);
    const employerEpf = Math.round(basic * 0.12);
    const gratuity = Math.round(basic * 0.0481);
    const expectedGross = ctc - employerEpf - gratuity;

    const profile = estimateFromCTC({ ctc });
    expect(profile.gross_salary).toBe(expectedGross);
  });

  it('components sum correctly: basic + HRA + special = gross', () => {
    for (const ctc of [800_000, 1_200_000, 1_800_000, 2_500_000, 5_000_000]) {
      const profile = estimateFromCTC({ ctc });
      expect(profile.basic_salary + profile.hra_received + profile.special_allowance)
        .toBe(profile.gross_salary);
    }
  });

  it('defaults: regime=new, FY=2024-25, professional_tax=2400', () => {
    const profile = estimateFromCTC({ ctc: 1_500_000 });
    expect(profile.regime).toBe('new');
    expect(profile.financial_year).toBe('2024-25');
    expect(profile.professional_tax).toBe(2_400);
    expect(profile.standard_deduction).toBe(75_000);
  });

  it('no extra answers → zeroed deductions', () => {
    const profile = estimateFromCTC({ ctc: 1_500_000 });
    // 80C = just EPF (12% of basic = 12% of 600K = 72K)
    expect(profile.deduction_80c).toBe(72_000);
    expect(profile.deduction_80d).toBe(0);
    expect(profile.deduction_80ccd_1b).toBe(0);
    expect(profile.deduction_24b).toBe(0);
    expect(profile.monthly_rent).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CTC ESTIMATOR — User Answers Mapping
// ═══════════════════════════════════════════════════════════════════════════════

describe('CTC Estimator — answer mapping', () => {
  it('rent passes through to monthly_rent', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, monthlyRent: 25_000 });
    expect(profile.monthly_rent).toBe(25_000);
  });

  it('city passes through (lowercase)', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, city: 'Mumbai' });
    expect(profile.city).toBe('mumbai');
  });

  it('metro cities: Mumbai is metro', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, city: 'mumbai' });
    expect(profile.is_metro).toBe(true);
  });

  it('non-metro cities: Bangalore is non-metro (legal classification)', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, city: 'bangalore' });
    expect(profile.is_metro).toBe(false);
  });

  it('unknown city defaults to other (non-metro)', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, city: 'lucknow' });
    expect(profile.city).toBe('lucknow');
    expect(profile.is_metro).toBe(false);
  });

  it('home loan interest maps to deduction_24b', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, homeLoanInterest: 200_000 });
    expect(profile.deduction_24b).toBe(200_000);
  });

  it('health premiums map to deduction_80d', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      healthPremiumSelf: 15_000,
      healthPremiumParents: 25_000,
    });
    expect(profile.deduction_80d).toBe(40_000);
  });

  it('extra 80C adds to EPF in deduction_80c', () => {
    // ₹18L → basic 720K → EPF 86,400
    const profile = estimateFromCTC({ ctc: 1_800_000, extra80C: 30_000 });
    expect(profile.deduction_80c).toBe(86_400 + 30_000);
    expect(profile.epf_employee_contribution).toBe(86_400);
  });

  it('80C caps at ₹1.5L even if EPF + extra exceeds it', () => {
    // Large extra80C that would push past 1.5L
    const profile = estimateFromCTC({ ctc: 1_800_000, extra80C: 100_000 });
    expect(profile.deduction_80c).toBe(150_000); // capped
  });

  it('high CTC: EPF alone exceeds ₹1.5L → 80C capped', () => {
    // ₹50L CTC → basic 20L → EPF 2.4L > 1.5L limit
    const profile = estimateFromCTC({ ctc: 5_000_000 });
    expect(profile.epf_employee_contribution).toBe(240_000);
    expect(profile.deduction_80c).toBe(150_000); // capped
  });

  it('NPS contribution maps to deduction_80ccd_1b', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, npsContribution: 50_000 });
    expect(profile.deduction_80ccd_1b).toBe(50_000);
  });

  it('name passes through to employee_name', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, name: 'Priya' });
    expect(profile.employee_name).toBe('Priya');
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CTC ESTIMATOR → ORCHESTRATOR — End-to-End
// ═══════════════════════════════════════════════════════════════════════════════

describe('CTC Estimator → Orchestrator E2E', () => {
  it('₹18L CTC + ₹25K rent + Mumbai → positive total savings', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    expect(result.total_savings).toBeGreaterThan(0);
  });

  it('₹18L CTC + rent → recommends old regime', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    expect(result.recommended_regime).toBe('old');
  });

  it('₹18L CTC + rent → 7 checks returned', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    expect(result.checks).toHaveLength(7);
  });

  it('₹18L CTC + rent → checks sorted by savings descending', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    const savings = result.checks.map(c => c.savings);
    const sorted = [...savings].sort((a, b) => b - a);
    expect(savings).toEqual(sorted);
  });

  it('₹8L CTC → orchestrator runs without error', () => {
    const profile = estimateFromCTC({ ctc: 800_000 });
    const result = runAllChecks(profile);
    expect(result.total_savings).toBeGreaterThanOrEqual(0);
    expect(result.checks).toHaveLength(7);
  });

  it('₹12L CTC + rent → orchestrator produces valid result', () => {
    const profile = estimateFromCTC({
      ctc: 1_200_000,
      monthlyRent: 15_000,
      city: 'delhi',
    });
    const result = runAllChecks(profile);
    expect(result.total_savings).toBeGreaterThanOrEqual(0);
    expect(result.recommended_regime).toMatch(/^(old|new)$/);
  });

  it('₹25L CTC + rent → positive savings', () => {
    const profile = estimateFromCTC({
      ctc: 2_500_000,
      monthlyRent: 40_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    expect(result.total_savings).toBeGreaterThan(0);
  });

  it('₹50L CTC + rent → positive savings', () => {
    const profile = estimateFromCTC({
      ctc: 5_000_000,
      monthlyRent: 80_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    expect(result.total_savings).toBeGreaterThan(0);
  });

  it('full answers: CTC + rent + insurance + 80C + NPS + home loan', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
      name: 'Test User',
      healthPremiumSelf: 15_000,
      healthPremiumParents: 25_000,
      extra80C: 30_000,
      npsContribution: 50_000,
      homeLoanInterest: 200_000,
    });
    const result = runAllChecks(profile, null, { parentsSenior: false });
    expect(result.total_savings).toBeGreaterThan(0);
    expect(result.user_name).toBe('Test User');
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CTC ESTIMATOR — Edge Cases
// ═══════════════════════════════════════════════════════════════════════════════

describe('CTC Estimator — edge cases', () => {
  it('zero rent → HRA check is not applicable', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000, monthlyRent: 0 });
    const result = runAllChecks(profile);
    const hra = result.checks.find(c => c.check_id === 'hra_optimizer');
    expect(hra.status).toBe(FindingStatus.NOT_APPLICABLE);
  });

  it('zero extra investments → 80C gap uses only EPF', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000 });
    const result = runAllChecks(profile);
    const gap = result.checks.find(c => c.check_id === '80c_gap');
    // EPF = 86,400 < 1.5L → there is a gap
    expect(gap.details.epf_contribution).toBe(86_400);
    expect(gap.details.current_80c_total).toBe(86_400);
    expect(gap.details.gap).toBe(150_000 - 86_400);
  });

  it('maxed 80C: extra investments fill the gap → 80C optimized', () => {
    // EPF = 86,400 + extra 63,600 = 150,000
    // Must include rent so orchestrator recommends old regime (otherwise
    // all deduction checks become NOT_APPLICABLE under new regime).
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      extra80C: 63_600,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    const gap = result.checks.find(c => c.check_id === '80c_gap');
    expect(gap.details.current_80c_total).toBe(150_000);
    expect(gap.details.gap).toBe(0);
    expect(gap.status).toBe(FindingStatus.OPTIMIZED);
  });

  it('NPS = 50K → NPS check shows optimized', () => {
    // Must include rent so orchestrator recommends old regime
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      npsContribution: 50_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    const nps = result.checks.find(c => c.check_id === 'nps_check');
    expect(nps.status).toBe(FindingStatus.OPTIMIZED);
    expect(nps.savings).toBe(0);
  });

  it('low CTC (₹4L) → new regime may be better (rebate region)', () => {
    const profile = estimateFromCTC({ ctc: 400_000 });
    const result = runAllChecks(profile);
    // At ₹4L CTC, gross ≈ ₹3.3L. Both regimes likely near zero tax.
    expect(result.total_savings).toBeGreaterThanOrEqual(0);
  });

  it('no home loan → home loan check is not applicable', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000 });
    const result = runAllChecks(profile);
    const homeLoan = result.checks.find(c => c.check_id === 'home_loan_check');
    expect(homeLoan.status).toBe(FindingStatus.NOT_APPLICABLE);
    expect(homeLoan.savings).toBe(0);
  });

  it('with home loan → home loan check fires', () => {
    // Must include rent so orchestrator recommends old regime
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      homeLoanInterest: 200_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile);
    const homeLoan = result.checks.find(c => c.check_id === 'home_loan_check');
    expect(homeLoan.status).toBe(FindingStatus.OPPORTUNITY);
    expect(homeLoan.details.capped_amount).toBe(200_000);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CTC ESTIMATOR — getEstimateBreakdown
// ═══════════════════════════════════════════════════════════════════════════════

describe('getEstimateBreakdown', () => {
  it('₹18L CTC breakdown matches profile', () => {
    const bd = getEstimateBreakdown(1_800_000);
    const profile = estimateFromCTC({ ctc: 1_800_000 });

    expect(bd.basic).toBe(profile.basic_salary);
    expect(bd.hra).toBe(profile.hra_received);
    expect(bd.grossSalary).toBe(profile.gross_salary);
    expect(bd.specialAllowance).toBe(profile.special_allowance);
    expect(bd.epfEmployee).toBe(profile.epf_employee_contribution);
  });

  it('monthly in-hand is reasonable', () => {
    const bd = getEstimateBreakdown(1_800_000);
    // Monthly in-hand = (gross - EPF - prof tax) / 12
    const expected = Math.round(
      (bd.grossSalary - bd.epfEmployee - 2_400) / 12
    );
    expect(bd.monthlyInHand).toBe(expected);
    // Sanity: monthly in-hand should be roughly 70-80% of CTC/12
    expect(bd.monthlyInHand).toBeGreaterThan(1_800_000 / 12 * 0.6);
    expect(bd.monthlyInHand).toBeLessThan(1_800_000 / 12);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// LTCG ESTIMATOR — Basics
// ═══════════════════════════════════════════════════════════════════════════════

describe('LTCG Estimator — basics', () => {
  it('no investments → returns null', () => {
    expect(estimateLTCG({ hasInvestments: false })).toBeNull();
  });

  it('skip range → returns null', () => {
    expect(estimateLTCG({ hasInvestments: true, ltcgRange: 'skip' })).toBeNull();
  });

  it('under_50k → representative gain of ₹35,000', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: 'under_50k' });
    expect(holdings).not.toBeNull();
    expect(holdings.holdings).toHaveLength(1);
    expect(holdings.holdings[0].unrealized_gain).toBe(35_000);
  });

  it('50k_to_125k → representative gain of ₹87,500', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: '50k_to_125k' });
    expect(holdings.holdings[0].unrealized_gain).toBe(87_500);
  });

  it('over_125k → representative gain of ₹1,75,000', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: 'over_125k' });
    expect(holdings.holdings[0].unrealized_gain).toBe(175_000);
  });

  it('synthetic holding is long-term equity', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: 'under_50k' });
    const h = holdings.holdings[0];
    expect(h.security_type).toBe('equity_mf');
    // Purchase date 2023-01-01, any modern asOf → long-term
    expect(h.isLongTerm(new Date(2025, 2, 31))).toBe(true);
  });

  it('realized gains default to 0', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: 'under_50k' });
    expect(holdings.realized_stcg_this_fy).toBe(0);
    expect(holdings.realized_ltcg_this_fy).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// LTCG ESTIMATOR → Scanner — Savings Calculation
// ═══════════════════════════════════════════════════════════════════════════════

describe('LTCG Estimator → Scanner', () => {
  const fyEnd = new Date(2025, 2, 31);

  it('under_50k → savings = ₹35K × 12.5% × 1.04', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: 'under_50k' });
    const result = runAllChecks(
      estimateFromCTC({ ctc: 1_800_000 }),
      holdings,
      { cgAsOf: fyEnd }
    );
    const cg = result.checks.find(c => c.check_id === 'capital_gains');
    expect(cg.status).toBe(FindingStatus.OPPORTUNITY);
    expect(cg.savings).toBe(Math.round(35_000 * LTCG_RATE * (1 + CESS_RATE)));
  });

  it('50k_to_125k → savings = ₹87.5K × 12.5% × 1.04', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: '50k_to_125k' });
    const result = runAllChecks(
      estimateFromCTC({ ctc: 1_800_000 }),
      holdings,
      { cgAsOf: fyEnd }
    );
    const cg = result.checks.find(c => c.check_id === 'capital_gains');
    expect(cg.savings).toBe(Math.round(87_500 * LTCG_RATE * (1 + CESS_RATE)));
  });

  it('over_125k → savings capped at exemption (₹1.25L × 12.5% × 1.04)', () => {
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: 'over_125k' });
    const result = runAllChecks(
      estimateFromCTC({ ctc: 1_800_000 }),
      holdings,
      { cgAsOf: fyEnd }
    );
    const cg = result.checks.find(c => c.check_id === 'capital_gains');
    // ₹1,75,000 gain but exemption is only ₹1,25,000
    expect(cg.savings).toBe(Math.round(LTCG_EXEMPTION * LTCG_RATE * (1 + CESS_RATE)));
  });

  it('no holdings → CG not applicable, total = regime savings only', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const result = runAllChecks(profile, null);
    const cg = result.checks.find(c => c.check_id === 'capital_gains');
    expect(cg.status).toBe(FindingStatus.NOT_APPLICABLE);
    expect(cg.savings).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// FULL PIPELINE: CTC + LTCG → Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full pipeline: CTC + LTCG → Orchestrator', () => {
  const fyEnd = new Date(2025, 2, 31);

  it('₹18L + rent + investments → total = regime + CG savings', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: 'under_50k' });

    const result = runAllChecks(profile, holdings, { cgAsOf: fyEnd });

    const regime = result.checks.find(c => c.check_id === 'regime_arbitrage');
    const cg = result.checks.find(c => c.check_id === 'capital_gains');

    // Total = regime_savings + CG_savings (no double counting)
    expect(result.total_savings).toBe(regime.savings + cg.savings);
    expect(result.total_savings).toBeGreaterThan(0);
  });

  it('₹18L + no rent + investments → CG savings still present', () => {
    const profile = estimateFromCTC({ ctc: 1_800_000 });
    const holdings = estimateLTCG({ hasInvestments: true, ltcgRange: '50k_to_125k' });

    const result = runAllChecks(profile, holdings, { cgAsOf: fyEnd });

    const cg = result.checks.find(c => c.check_id === 'capital_gains');
    expect(cg.savings).toBeGreaterThan(0);
    // CG savings always contributes to total
    expect(result.total_savings).toBeGreaterThanOrEqual(cg.savings);
  });

  it('adding investments increases total savings', () => {
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
    });

    const withoutInvestments = runAllChecks(profile, null, { cgAsOf: fyEnd });
    const withInvestments = runAllChecks(
      profile,
      estimateLTCG({ hasInvestments: true, ltcgRange: '50k_to_125k' }),
      { cgAsOf: fyEnd }
    );

    expect(withInvestments.total_savings).toBeGreaterThan(withoutInvestments.total_savings);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Comparison: Estimated vs Priya Demo (₹18L CTC ≈ ₹15L gross)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Estimated vs Priya comparison', () => {
  it('₹18L CTC gross is close to ₹15L (Priya CTC→gross ratio)', () => {
    // Priya: CTC ₹18L, gross ₹15L → ratio ≈ 0.833
    // Estimator: gross = CTC - 12% basic - 4.81% basic = CTC - 16.81% of 40% CTC
    // = CTC × (1 - 0.40 × 0.1681) = CTC × 0.9328
    // So ₹18L → gross ≈ ₹16.8L (higher than Priya's ₹15L because Priya's
    // actual structure may differ). The difference is expected for estimates.
    const profile = estimateFromCTC({ ctc: 1_800_000 });
    // Gross should be in the right ballpark (₹14L-₹17L for ₹18L CTC)
    expect(profile.gross_salary).toBeGreaterThan(1_400_000);
    expect(profile.gross_salary).toBeLessThan(1_700_000);
  });

  it('Priya-like answers produce positive savings', () => {
    // Simulate Priya's situation via CTC questions
    const profile = estimateFromCTC({
      ctc: 1_800_000,
      monthlyRent: 25_000,
      city: 'mumbai',
      name: 'Priya Sharma',
      // Priya has no extra 80C, no NPS, no health insurance, no home loan
    });
    const result = runAllChecks(profile);
    expect(result.total_savings).toBeGreaterThan(0);
    expect(result.recommended_regime).toBe('old');
  });
});
