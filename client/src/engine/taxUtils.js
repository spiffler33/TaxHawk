/**
 * Deterministic tax calculation functions.
 *
 * ALL tax math lives here. Every rate, limit, and slab is a constant.
 * Ported 1:1 from Python backend/tax_engine/tax_utils.py.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TAX SLAB CONSTANTS  (from knowledge_base/01_tax_slabs.md)
// Each slab: [upper_limit, rate]. Last slab uses Infinity.
// ═══════════════════════════════════════════════════════════════════════════════

export const NEW_REGIME_SLABS_FY2024_25 = [
  [300_000, 0.00],
  [700_000, 0.05],
  [1_000_000, 0.10],
  [1_200_000, 0.15],
  [1_500_000, 0.20],
  [Infinity, 0.30],
];

export const NEW_REGIME_SLABS_FY2025_26 = [
  [400_000, 0.00],
  [800_000, 0.05],
  [1_200_000, 0.10],
  [1_600_000, 0.15],
  [2_000_000, 0.20],
  [2_400_000, 0.25],
  [Infinity, 0.30],
];

export const OLD_REGIME_SLABS_BELOW_60 = [
  [250_000, 0.00],
  [500_000, 0.05],
  [1_000_000, 0.20],
  [Infinity, 0.30],
];

export const OLD_REGIME_SLABS_SENIOR = [
  [300_000, 0.00],
  [500_000, 0.05],
  [1_000_000, 0.20],
  [Infinity, 0.30],
];

export const OLD_REGIME_SLABS_SUPER_SENIOR = [
  [500_000, 0.00],
  [1_000_000, 0.20],
  [Infinity, 0.30],
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUCTION & EXEMPTION LIMITS  (from knowledge_base/)
// ═══════════════════════════════════════════════════════════════════════════════

export const CESS_RATE = 0.04; // 4% Health & Education Cess

export const STANDARD_DEDUCTION = {
  '2024-25': { old: 50_000, new: 75_000 },
  '2025-26': { old: 75_000, new: 75_000 },
};

export const REBATE_87A = {
  '2024-25': {
    old: { income_limit: 500_000, max_rebate: 12_500 },
    new: { income_limit: 700_000, max_rebate: 25_000 },
  },
  '2025-26': {
    old: { income_limit: 500_000, max_rebate: 12_500 },
    new: { income_limit: 1_200_000, max_rebate: 60_000 },
  },
};

// Surcharge slabs: [upper_limit, rate]
export const SURCHARGE_SLABS_OLD = [
  [5_000_000, 0.00],
  [10_000_000, 0.10],
  [20_000_000, 0.15],
  [50_000_000, 0.25],
  [Infinity, 0.37],
];

export const SURCHARGE_SLABS_NEW = [
  [5_000_000, 0.00],
  [10_000_000, 0.10],
  [20_000_000, 0.15],
  [50_000_000, 0.25],
  [Infinity, 0.25], // Capped at 25% for new regime
];

// Section 80C/80CCC/80CCD(1) combined limit
export const LIMIT_80C = 150_000;

// Section 80CCD(1B) — additional NPS, ABOVE 80C limit
export const LIMIT_80CCD_1B = 50_000;

// Section 80CCD(2) — employer NPS (% of basic)
export const LIMIT_80CCD_2_PRIVATE = 0.10;
export const LIMIT_80CCD_2_GOVT = 0.14;

// Section 80D limits
export const LIMIT_80D_SELF_BELOW_60 = 25_000;
export const LIMIT_80D_SELF_SENIOR = 50_000;
export const LIMIT_80D_PARENTS_BELOW_60 = 25_000;
export const LIMIT_80D_PARENTS_SENIOR = 50_000;

// Home loan interest (self-occupied)
export const LIMIT_24B_SELF_OCCUPIED = 200_000;

// HRA calculation percentages
export const HRA_METRO_PERCENT = 0.50;
export const HRA_NON_METRO_PERCENT = 0.40;
export const HRA_RENT_MINUS_BASIC_PERCENT = 0.10;

// Capital gains (FY 2024-25 onwards, post Budget 2024)
export const LTCG_EXEMPTION = 125_000;
export const LTCG_RATE = 0.125;  // 12.5%
export const STCG_RATE = 0.20;   // 20% for listed equity (STT paid)
export const EQUITY_LTCG_HOLDING_MONTHS = 12;
export const DEBT_LTCG_HOLDING_MONTHS = 24;


// ═══════════════════════════════════════════════════════════════════════════════
// CORE TAX FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply progressive slab rates to taxable income. Returns base tax.
 * @param {number} taxableIncome
 * @param {Array<[number, number]>} slabs
 * @returns {number}
 */
export function computeTaxOnSlabs(taxableIncome, slabs) {
  let tax = 0;
  let prevLimit = 0;
  for (const [upperLimit, rate] of slabs) {
    if (taxableIncome <= prevLimit) break;
    const taxableInSlab = Math.min(taxableIncome, upperLimit) - prevLimit;
    tax += taxableInSlab * rate;
    prevLimit = upperLimit;
  }
  return tax;
}

/**
 * Apply 4% Health & Education Cess. Returns cess amount (not total).
 * @param {number} tax
 * @returns {number}
 */
export function applyCess(tax) {
  return Math.round(tax * CESS_RATE);
}

/**
 * Apply Section 87A rebate if eligible. Returns tax after rebate.
 * @param {number} tax
 * @param {number} taxableIncome
 * @param {string} regime - 'old' | 'new'
 * @param {string} fy - Financial year, e.g. '2024-25'
 * @returns {number}
 */
export function apply87aRebate(tax, taxableIncome, regime, fy = '2024-25') {
  const rebateInfo = REBATE_87A[fy]?.[regime];
  if (rebateInfo && taxableIncome <= rebateInfo.income_limit) {
    const rebate = Math.min(tax, rebateInfo.max_rebate);
    return Math.round(tax - rebate);
  }
  return tax;
}

/**
 * Compute surcharge with marginal relief.
 *
 * Marginal relief ensures that (tax + surcharge) at the actual income never
 * exceeds (tax + surcharge at the previous threshold) + (excess income above
 * the threshold). Without this, crossing a threshold by ₹1 could add lakhs
 * in surcharge — a perverse outcome the law prevents.
 *
 * @param {number} taxableIncome
 * @param {number} baseTax
 * @param {Array<[number, number]>} surchargeSlabs
 * @param {Array<[number, number]>} taxSlabs - Income tax slabs, needed for marginal relief calc
 * @returns {number}
 */
function getSurcharge(taxableIncome, baseTax, surchargeSlabs, taxSlabs) {
  let rate = 0;
  let prevThreshold = 0;
  let prevRate = 0;

  for (const [upperLimit, surchargeRate] of surchargeSlabs) {
    if (taxableIncome <= upperLimit) {
      rate = surchargeRate;
      break;
    }
    prevThreshold = upperLimit;
    prevRate = surchargeRate;
  }

  if (rate === 0) return 0;

  const rawSurcharge = baseTax * rate;

  // ── Marginal relief ──────────────────────────────────────────────
  // Total tax+surcharge at the threshold below (using previous slab's rate)
  const taxAtThreshold = computeTaxOnSlabs(prevThreshold, taxSlabs);
  const surchargeAtThreshold = taxAtThreshold * prevRate;
  const totalAtThreshold = taxAtThreshold + surchargeAtThreshold;

  // The most you should pay is: what you'd pay at the threshold, plus
  // the excess income above it (i.e., marginal 100% on the excess)
  const excessIncome = taxableIncome - prevThreshold;
  const maxTotal = totalAtThreshold + excessIncome;

  const rawTotal = baseTax + rawSurcharge;
  if (rawTotal > maxTotal) {
    return Math.round(Math.max(maxTotal - baseTax, 0));
  }

  return Math.round(rawSurcharge);
}

/**
 * Return the marginal slab rate at a given taxable income level.
 * Used to estimate: savings = deduction * marginal_rate * (1 + CESS_RATE)
 * @param {number} taxableIncome
 * @param {string} regime - 'old' | 'new'
 * @param {string} fy - Financial year
 * @param {string} ageCategory - 'below_60' | 'senior' | 'super_senior'
 * @returns {number}
 */
export function getMarginalRate(taxableIncome, regime = 'old', fy = '2024-25', ageCategory = 'below_60') {
  let slabs;
  if (regime === 'new') {
    slabs = fy === '2025-26' ? NEW_REGIME_SLABS_FY2025_26 : NEW_REGIME_SLABS_FY2024_25;
  } else if (ageCategory === 'super_senior') {
    slabs = OLD_REGIME_SLABS_SUPER_SENIOR;
  } else if (ageCategory === 'senior') {
    slabs = OLD_REGIME_SLABS_SENIOR;
  } else {
    slabs = OLD_REGIME_SLABS_BELOW_60;
  }

  let rate = 0;
  for (const [upperLimit, slabRate] of slabs) {
    if (taxableIncome <= upperLimit) {
      rate = slabRate;
      break;
    }
    rate = slabRate; // Fall through to last slab if income exceeds all
  }
  return rate;
}

/**
 * Full tax computation under new regime.
 * @param {number} taxableIncome
 * @param {string} fy
 * @returns {object} { taxable_income, base_tax, rebate_87a, tax_after_rebate, surcharge, cess, total_tax }
 */
export function calculateNewRegimeTax(taxableIncome, fy = '2024-25') {
  const slabs = fy === '2025-26' ? NEW_REGIME_SLABS_FY2025_26 : NEW_REGIME_SLABS_FY2024_25;

  const baseTax = computeTaxOnSlabs(taxableIncome, slabs);
  const taxAfterRebate = apply87aRebate(baseTax, taxableIncome, 'new', fy);
  const surcharge = getSurcharge(taxableIncome, taxAfterRebate, SURCHARGE_SLABS_NEW, slabs);
  const cess = applyCess(taxAfterRebate + surcharge);
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);

  return {
    taxable_income: taxableIncome,
    base_tax: Math.round(baseTax),
    rebate_87a: Math.round(baseTax - taxAfterRebate),
    tax_after_rebate: taxAfterRebate,
    surcharge,
    cess,
    total_tax: totalTax,
  };
}

/**
 * Full tax computation under old regime.
 * @param {number} taxableIncome
 * @param {string} fy
 * @param {string} ageCategory - 'below_60' | 'senior' | 'super_senior'
 * @returns {object}
 */
export function calculateOldRegimeTax(taxableIncome, fy = '2024-25', ageCategory = 'below_60') {
  let slabs;
  if (ageCategory === 'super_senior') {
    slabs = OLD_REGIME_SLABS_SUPER_SENIOR;
  } else if (ageCategory === 'senior') {
    slabs = OLD_REGIME_SLABS_SENIOR;
  } else {
    slabs = OLD_REGIME_SLABS_BELOW_60;
  }

  const baseTax = computeTaxOnSlabs(taxableIncome, slabs);
  const taxAfterRebate = apply87aRebate(baseTax, taxableIncome, 'old', fy);
  const surcharge = getSurcharge(taxableIncome, taxAfterRebate, SURCHARGE_SLABS_OLD, slabs);
  const cess = applyCess(taxAfterRebate + surcharge);
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);

  return {
    taxable_income: taxableIncome,
    base_tax: Math.round(baseTax),
    rebate_87a: Math.round(baseTax - taxAfterRebate),
    tax_after_rebate: taxAfterRebate,
    surcharge,
    cess,
    total_tax: totalTax,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAXABLE INCOME DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Derive taxable income under new regime from salary data.
 * New regime allows: standard deduction + professional tax + employer NPS.
 * @param {object} salary - SalaryProfile
 * @returns {number}
 */
export function computeNewRegimeTaxableIncome(salary) {
  const fy = salary.financial_year;
  const stdDed = STANDARD_DEDUCTION[fy]?.new ?? 75_000;
  const taxable = salary.gross_salary - stdDed - salary.professional_tax - salary.deduction_80ccd_2;
  return Math.max(taxable, 0);
}

/**
 * Derive taxable income under old regime.
 * Pass overrides for 'what-if' optimization scenarios.
 * null/undefined = use current Form 16 values.
 *
 * @param {object} salary - SalaryProfile
 * @param {object} [opts]
 * @param {number|null} [opts.hraExemption]
 * @param {number|null} [opts.total80c]
 * @param {number|null} [opts.total80d]
 * @param {number|null} [opts.total80ccd1b]
 * @param {number|null} [opts.total24b] - Home loan interest (capped at ₹2L)
 * @returns {object} Full breakdown
 */
export function computeOldRegimeTaxableIncome(salary, opts = {}) {
  const fy = salary.financial_year;
  const stdDed = STANDARD_DEDUCTION[fy]?.old ?? 50_000;

  // Section 10 exemptions
  const hraExempt = opts.hraExemption != null ? opts.hraExemption : salary.hra_exemption;
  const netSalary = salary.gross_salary - hraExempt - salary.lta_exemption - salary.other_exemptions;

  // Gross total income
  const gti = netSalary - stdDed - salary.professional_tax;

  // Chapter VI-A deductions
  const ded80c = opts.total80c != null
    ? opts.total80c
    : Math.min(salary.deduction_80c + salary.deduction_80ccc + salary.deduction_80ccd_1, LIMIT_80C);
  const ded80d = opts.total80d != null ? opts.total80d : salary.deduction_80d;
  const ded80ccd1b = opts.total80ccd1b != null ? opts.total80ccd1b : salary.deduction_80ccd_1b;
  const ded80ccd2 = salary.deduction_80ccd_2;
  // Section 24b — home loan interest, capped at ₹2L (self-occupied property)
  const ded24b = opts.total24b != null
    ? Math.min(opts.total24b, LIMIT_24B_SELF_OCCUPIED)
    : Math.min(salary.deduction_24b, LIMIT_24B_SELF_OCCUPIED);
  const dedOther = (
    salary.deduction_80e +
    salary.deduction_80g +
    salary.deduction_80tta +
    salary.other_deductions
  );

  const totalVia = ded80c + ded80ccd1b + ded80ccd2 + ded80d + ded24b + dedOther;
  const taxableIncome = Math.max(gti - totalVia, 0);

  return {
    gross_salary: salary.gross_salary,
    hra_exemption: hraExempt,
    lta_exemption: salary.lta_exemption,
    other_exemptions: salary.other_exemptions,
    net_salary: netSalary,
    standard_deduction: stdDed,
    professional_tax: salary.professional_tax,
    gross_total_income: gti,
    deduction_80c: ded80c,
    deduction_80ccd_1b: ded80ccd1b,
    deduction_80ccd_2: ded80ccd2,
    deduction_80d: ded80d,
    deduction_24b: ded24b,
    deduction_other: dedOther,
    total_vi_a: totalVia,
    taxable_income: taxableIncome,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// HRA EXEMPTION (Section 10(13A))
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HRA exemption = minimum of three amounts.
 *   1. Actual HRA received
 *   2. Rent paid - 10% of Basic
 *   3. 50% of Basic (metro) or 40% of Basic (non-metro)
 *
 * Bangalore is NON-METRO.
 *
 * @param {number} basicAnnual
 * @param {number} hraReceivedAnnual
 * @param {number} rentPaidAnnual
 * @param {boolean} isMetro
 * @returns {number}
 */
export function calculateHraExemption(basicAnnual, hraReceivedAnnual, rentPaidAnnual, isMetro) {
  const optionA = hraReceivedAnnual;
  const optionB = rentPaidAnnual - (HRA_RENT_MINUS_BASIC_PERCENT * basicAnnual);
  const optionC = (isMetro ? HRA_METRO_PERCENT : HRA_NON_METRO_PERCENT) * basicAnnual;
  return Math.max(Math.min(optionA, optionB, optionC), 0);
}
