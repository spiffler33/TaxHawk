/**
 * End-to-end tests: Priya's demo profile through all 6 checks + orchestrator.
 *
 * Verified numbers (₹15L gross, Mumbai metro, FY 2024-25):
 *   New regime tax:        ₹1,29,501
 *   Old regime tax (opt):  ₹1,13,381
 *   Regime savings:        ₹16,120
 *   LTCG harvesting:       ₹4,862
 *   Total savings:         ₹20,982
 *
 * Component display values (NOT additive):
 *   80C gap saving:        ₹24,336
 *   80D saving:            ₹7,800
 *   NPS saving:            ₹15,600
 *   HRA saving:            ₹0 (captured in regime check)
 *
 * Ported from Python tests/test_demo_scenario.py
 */

import { describe, it, expect } from 'vitest';
import { createSalaryProfile, createHoldings, FindingStatus } from '../models.js';
import { checkRegime } from '../checks/regimeComparator.js';
import { check80c } from '../checks/eightyCGap.js';
import { check80d } from '../checks/eightyDCheck.js';
import { checkHra } from '../checks/hraOptimizer.js';
import { checkCapitalGains } from '../checks/ltcgScanner.js';
import { checkNps } from '../checks/npsCheck.js';
import { checkHomeLoan } from '../checks/homeLoanCheck.js';
import { runAllChecks } from '../checks/orchestrator.js';
import { PRIYA_PROFILE } from '../../data/demoProfile.js';
import { PRIYA_HOLDINGS } from '../../data/demoHoldings.js';

// Fixtures
const priyaSalary = () => createSalaryProfile(PRIYA_PROFILE);
const priyaHoldings = () => createHoldings(PRIYA_HOLDINGS);
const fyEnd = new Date(2025, 2, 31); // March 31, 2025


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 1: Regime Arbitrage
// ═══════════════════════════════════════════════════════════════════════════════

describe('Check 1: Regime Arbitrage', () => {
  it('new regime tax = ₹1,29,501', () => {
    const result = checkRegime(priyaSalary());
    expect(result.details.new_regime_tax).toBe(129_501);
  });

  it('old regime tax = ₹1,13,381', () => {
    const result = checkRegime(priyaSalary());
    expect(result.details.old_regime_tax).toBe(113_381);
  });

  it('regime savings = ₹16,120', () => {
    const result = checkRegime(priyaSalary());
    expect(result.savings).toBe(16_120);
  });

  it('recommends old regime', () => {
    const result = checkRegime(priyaSalary());
    expect(result.details.recommended_regime).toBe('old');
  });

  it('status is opportunity', () => {
    const result = checkRegime(priyaSalary());
    expect(result.status).toBe(FindingStatus.OPPORTUNITY);
  });

  it('old regime breakdown matches', () => {
    const result = checkRegime(priyaSalary());
    const bd = result.details.old_regime_breakdown;
    expect(bd.hra_exemption).toBe(240_000);
    expect(bd.standard_deduction).toBe(50_000);
    expect(bd.professional_tax).toBe(2_400);
    expect(bd.gross_total_income).toBe(1_207_600);
    expect(bd.deduction_80c).toBe(150_000);
    expect(bd.deduction_80d).toBe(25_000);
    expect(bd.deduction_80ccd_1b).toBe(50_000);
    expect(bd.total_vi_a).toBe(225_000);
    expect(bd.taxable_income).toBe(982_600);
  });

  it('deductions needed', () => {
    const result = checkRegime(priyaSalary());
    const dn = result.details.deductions_needed;
    expect(dn.hra_exemption).toBe(240_000);
    expect(dn.section_80c).toBe(150_000);
    expect(dn.section_80c_gap).toBe(78_000);
    expect(dn.section_80d).toBe(25_000);
    expect(dn.section_80ccd_1b).toBe(50_000);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 2: Section 80C Gap
// ═══════════════════════════════════════════════════════════════════════════════

describe('Check 2: Section 80C Gap', () => {
  it('gap = ₹78,000', () => {
    const result = check80c(priyaSalary());
    expect(result.details.gap).toBe(78_000);
  });

  it('EPF in details', () => {
    const result = check80c(priyaSalary());
    expect(result.details.epf_contribution).toBe(72_000);
    expect(result.details.current_80c_total).toBe(72_000);
  });

  it('savings at 30% marginal: ₹78K * 30% * 1.04 = ₹24,336', () => {
    const result = check80c(priyaSalary());
    expect(result.savings).toBe(24_336);
  });

  it('marginal rate is 30%', () => {
    const result = check80c(priyaSalary());
    expect(result.details.marginal_rate).toBe(0.30);
  });

  it('fully utilized returns optimized', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'Maxed',
      gross_salary: 1_500_000,
      basic_salary: 600_000,
      deduction_80c: 150_000,
      epf_employee_contribution: 72_000,
    });
    const result = check80c(salary);
    expect(result.status).toBe(FindingStatus.OPTIMIZED);
    expect(result.savings).toBe(0);
    expect(result.details.gap).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 3: Section 80D
// ═══════════════════════════════════════════════════════════════════════════════

describe('Check 3: Section 80D', () => {
  it('parents premium = ₹25,000', () => {
    const result = check80d(priyaSalary());
    expect(result.details.recommended_premium).toBe(25_000);
  });

  it('savings = ₹7,800', () => {
    const result = check80d(priyaSalary());
    expect(result.savings).toBe(7_800);
  });

  it('parents not senior → limit ₹25K', () => {
    const result = check80d(priyaSalary());
    expect(result.details.parents_senior).toBe(false);
    expect(result.details.parents_limit).toBe(25_000);
  });

  it('parents senior → limit ₹50K', () => {
    const result = check80d(priyaSalary(), { parentsSenior: true });
    expect(result.details.parents_limit).toBe(50_000);
    expect(result.details.recommended_premium).toBe(50_000);
  });

  it('fully utilized returns optimized', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'Maxed',
      gross_salary: 1_500_000,
      basic_salary: 600_000,
      deduction_80d: 50_000,
    });
    const result = check80d(salary);
    expect(result.status).toBe(FindingStatus.OPTIMIZED);
    expect(result.savings).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 4: HRA Optimization
// ═══════════════════════════════════════════════════════════════════════════════

describe('Check 4: HRA Optimization', () => {
  it('optimal exemption = ₹2,40,000', () => {
    const result = checkHra(priyaSalary());
    expect(result.details.optimal_exemption).toBe(240_000);
  });

  it('savings = 0 (captured in regime check)', () => {
    const result = checkHra(priyaSalary());
    expect(result.savings).toBe(0);
  });

  it('status is opportunity', () => {
    const result = checkHra(priyaSalary());
    expect(result.status).toBe(FindingStatus.OPPORTUNITY);
  });

  it('current exemption = 0 (new regime)', () => {
    const result = checkHra(priyaSalary());
    expect(result.details.current_exemption).toBe(0);
  });

  it('Mumbai is metro', () => {
    const result = checkHra(priyaSalary());
    expect(result.details.is_metro).toBe(true);
  });

  it('no rent → not applicable', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'NoRent',
      gross_salary: 1_500_000,
      basic_salary: 600_000,
      hra_received: 300_000,
      monthly_rent: 0,
    });
    expect(checkHra(salary).status).toBe(FindingStatus.NOT_APPLICABLE);
  });

  it('no HRA → not applicable', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'NoHRA',
      gross_salary: 1_500_000,
      basic_salary: 600_000,
      hra_received: 0,
      monthly_rent: 25_000,
    });
    expect(checkHra(salary).status).toBe(FindingStatus.NOT_APPLICABLE);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 5: Capital Gains Optimization
// ═══════════════════════════════════════════════════════════════════════════════

describe('Check 5: Capital Gains', () => {
  it('unrealized LTCG = ₹37,400', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    expect(result.details.unrealized_ltcg).toBe(37_400);
  });

  it('savings = ₹4,862', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    expect(result.savings).toBe(4_862);
  });

  it('future_tax_saved matches savings', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    expect(result.details.future_tax_saved).toBe(4_862);
  });

  it('3 LTCG holdings to harvest', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    const harvest = result.details.holdings_to_harvest;
    expect(harvest).toHaveLength(3);
    expect(harvest).toContain('HDFC Bank Ltd');
    expect(harvest).toContain('Infosys Ltd');
    expect(harvest).toContain('Axis Bluechip Fund - Growth');
  });

  it('Parag Parikh is STCG (not in harvest list)', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    expect(result.details.holdings_to_harvest).not.toContain('Parag Parikh Flexi Cap Fund');
  });

  it('unrealized STCG = ₹3,250', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    expect(result.details.unrealized_stcg).toBe(3_250);
  });

  it('exemption remaining = ₹87,600', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    expect(result.details.exemption_remaining).toBe(87_600);
  });

  it('status is opportunity', () => {
    const result = checkCapitalGains(priyaHoldings(), { asOf: fyEnd });
    expect(result.status).toBe(FindingStatus.OPPORTUNITY);
  });

  it('no holdings → not applicable', () => {
    const result = checkCapitalGains(createHoldings({}), { asOf: fyEnd });
    expect(result.status).toBe(FindingStatus.NOT_APPLICABLE);
    expect(result.savings).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 6: NPS 80CCD(1B)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Check 6: NPS', () => {
  it('gap = ₹50,000', () => {
    const result = checkNps(priyaSalary());
    expect(result.details.gap).toBe(50_000);
  });

  it('savings = ₹15,600', () => {
    const result = checkNps(priyaSalary());
    expect(result.savings).toBe(15_600);
  });

  it('marginal rate = 30%', () => {
    const result = checkNps(priyaSalary());
    expect(result.details.marginal_rate).toBe(0.30);
  });

  it('already maxed → optimized', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'MaxedNPS',
      gross_salary: 1_500_000,
      basic_salary: 600_000,
      deduction_80ccd_1b: 50_000,
    });
    const result = checkNps(salary);
    expect(result.status).toBe(FindingStatus.OPTIMIZED);
    expect(result.savings).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR — full end-to-end
// ═══════════════════════════════════════════════════════════════════════════════

describe('Orchestrator', () => {
  it('total savings = ₹20,982', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.total_savings).toBe(20_982);
  });

  it('no double counting — total < sum of all checks', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    const sumAll = result.checks.reduce((s, c) => s + c.savings, 0);
    expect(result.total_savings).toBeLessThan(sumAll);
    expect(result.total_savings).toBe(20_982);
  });

  it('recommends old regime', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.recommended_regime).toBe('old');
  });

  it('current regime is new', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.current_regime).toBe('new');
  });

  it('seven checks returned', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.checks).toHaveLength(7);
  });

  it('checks sorted by savings descending', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    const savings = result.checks.map(c => c.savings);
    const sorted = [...savings].sort((a, b) => b - a);
    expect(savings).toEqual(sorted);
  });

  it('user name is Priya Sharma', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.user_name).toBe('Priya Sharma');
  });

  it('financial year is 2024-25', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.financial_year).toBe('2024-25');
  });

  it('summary contains ₹20,982', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary).toContain('20,982');
  });

  it('disclaimer present', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    expect(result.disclaimer).toContain('not constitute');
  });

  it('no holdings → only regime savings (₹16,120)', () => {
    const result = runAllChecks(priyaSalary(), null, { cgAsOf: fyEnd });
    expect(result.total_savings).toBe(16_120);
    expect(result.checks).toHaveLength(7);
  });

  it('component check savings display values', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    const byId = {};
    for (const c of result.checks) byId[c.check_id] = c;
    expect(byId['80c_gap'].savings).toBe(24_336);
    expect(byId['regime_arbitrage'].savings).toBe(16_120);
    expect(byId['nps_check'].savings).toBe(15_600);
    expect(byId['80d_check'].savings).toBe(7_800);
    expect(byId['capital_gains'].savings).toBe(4_862);
    expect(byId['hra_optimizer'].savings).toBe(0);
    expect(byId['home_loan_check'].savings).toBe(0);
  });

  it('all checks have opportunity status except home loan (old regime recommended)', () => {
    const result = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });
    for (const check of result.checks) {
      if (check.check_id === 'home_loan_check') {
        // Priya has no home loan
        expect(check.status).toBe(FindingStatus.NOT_APPLICABLE);
      } else {
        expect(check.status).toBe(FindingStatus.OPPORTUNITY);
      }
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Edge case: new regime is better
// ═══════════════════════════════════════════════════════════════════════════════

describe('New regime optimal edge case', () => {
  it('low salary → new regime wins', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'Low Earner',
      gross_salary: 600_000,
      basic_salary: 300_000,
      hra_received: 0,
      professional_tax: 2_400,
      regime: 'new',
      city: 'mumbai',
      monthly_rent: 0,
      epf_employee_contribution: 0,
    });
    const result = runAllChecks(salary);
    expect(result.recommended_regime).toBe('new');
  });

  it('new regime zeroes deduction checks', () => {
    const salary = createSalaryProfile({
      financial_year: '2024-25',
      employee_name: 'Low Earner',
      gross_salary: 600_000,
      basic_salary: 300_000,
      professional_tax: 2_400,
      regime: 'new',
      city: 'mumbai',
    });
    const result = runAllChecks(salary);
    if (result.recommended_regime === 'new') {
      const byId = {};
      for (const c of result.checks) byId[c.check_id] = c;
      expect(byId['80c_gap'].savings).toBe(0);
      expect(byId['80d_check'].savings).toBe(0);
      expect(byId['nps_check'].savings).toBe(0);
      expect(byId['hra_optimizer'].savings).toBe(0);
      expect(byId['home_loan_check'].savings).toBe(0);
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 7: Home Loan Interest (Section 24b)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Check 7: Home Loan Interest', () => {
  it('Priya (no home loan) → not applicable', () => {
    const result = checkHomeLoan(priyaSalary());
    expect(result.status).toBe(FindingStatus.NOT_APPLICABLE);
    expect(result.savings).toBe(0);
    expect(result.details.home_loan_interest).toBe(0);
  });

  it('display-only: savings always 0', () => {
    const salary = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 200_000,
    });
    const result = checkHomeLoan(salary);
    expect(result.savings).toBe(0);
  });

  it('shows display saving for ₹2L interest at 30% marginal', () => {
    const salary = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 200_000,
    });
    const result = checkHomeLoan(salary);
    expect(result.status).toBe(FindingStatus.OPPORTUNITY);
    // ₹2L × 30% × 1.04 = ₹62,400
    expect(result.details.display_saving).toBe(62_400);
    expect(result.details.capped_amount).toBe(200_000);
    expect(result.details.marginal_rate).toBe(0.30);
  });

  it('caps interest above ₹2L', () => {
    const salary = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 300_000,
    });
    const result = checkHomeLoan(salary);
    expect(result.details.home_loan_interest).toBe(300_000);
    expect(result.details.capped_amount).toBe(200_000);
  });

  it('check_id is home_loan_check', () => {
    const result = checkHomeLoan(priyaSalary());
    expect(result.check_id).toBe('home_loan_check');
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Home loan regime savings comparison
// ═══════════════════════════════════════════════════════════════════════════════

describe('Home loan increases regime savings', () => {
  it('₹2L home loan interest → larger regime switch saving', () => {
    const withoutLoan = priyaSalary();
    const withLoan = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 200_000,
    });

    const resultWithout = checkRegime(withoutLoan);
    const resultWith = checkRegime(withLoan);

    // Both recommend old regime
    expect(resultWithout.details.recommended_regime).toBe('old');
    expect(resultWith.details.recommended_regime).toBe('old');

    // Home loan produces strictly larger savings
    expect(resultWith.savings).toBeGreaterThan(resultWithout.savings);
    expect(resultWithout.savings).toBe(16_120);
  });

  it('₹2L home loan: old regime taxable drops by ₹2L', () => {
    const withLoan = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 200_000,
    });
    const result = checkRegime(withLoan);
    // Without home loan: old taxable = ₹9,82,600
    // With ₹2L home loan: old taxable = ₹7,82,600
    expect(result.details.old_regime_taxable).toBe(782_600);
  });

  it('home loan deduction appears in deductions_needed', () => {
    const withLoan = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 200_000,
    });
    const result = checkRegime(withLoan);
    expect(result.details.deductions_needed.section_24b).toBe(200_000);
  });

  it('home loan included in old regime breakdown', () => {
    const withLoan = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 200_000,
    });
    const result = checkRegime(withLoan);
    const bd = result.details.old_regime_breakdown;
    expect(bd.deduction_24b).toBe(200_000);
    expect(bd.total_vi_a).toBe(425_000); // 225K + 200K
  });

  it('orchestrator total with home loan > without', () => {
    const withLoan = createSalaryProfile({
      ...PRIYA_PROFILE,
      deduction_24b: 200_000,
    });
    const resultWith = runAllChecks(withLoan, priyaHoldings(), { cgAsOf: fyEnd });
    const resultWithout = runAllChecks(priyaSalary(), priyaHoldings(), { cgAsOf: fyEnd });

    expect(resultWith.total_savings).toBeGreaterThan(resultWithout.total_savings);
    expect(resultWithout.total_savings).toBe(20_982);
  });
});
