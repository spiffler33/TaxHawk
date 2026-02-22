/**
 * TaxHawk data models — JS equivalents of Python Pydantic models.
 *
 * Uses plain objects with factory functions. No runtime type checking.
 */

// ── Enums (as string constants) ──────────────────────────────────────────────

export const TaxRegime = { OLD: 'old', NEW: 'new' };

export const SecurityType = {
  EQUITY_SHARE: 'equity_share',
  EQUITY_MF: 'equity_mf',
  DEBT_MF: 'debt_mf',
  ELSS: 'elss',
  OTHER: 'other',
};

export const FindingStatus = {
  OPPORTUNITY: 'opportunity',
  OPTIMIZED: 'optimized',
  NOT_APPLICABLE: 'not_applicable',
};

export const Confidence = {
  DEFINITE: 'definite',
  LIKELY: 'likely',
  NEEDS_VERIFICATION: 'needs_verification',
};

// Metro cities for HRA: ONLY Mumbai, Delhi, Kolkata, Chennai
export const METRO_CITIES = new Set(['mumbai', 'delhi', 'kolkata', 'chennai']);

// ── SalaryProfile ────────────────────────────────────────────────────────────

/**
 * @param {object} data - Raw salary data fields
 * @returns {object} SalaryProfile with computed helpers
 */
export function createSalaryProfile(data) {
  const profile = {
    // Identity
    financial_year: data.financial_year || '2024-25',
    employee_name: data.employee_name || '',
    pan: data.pan || '',
    employer_name: data.employer_name || '',

    // Salary Components (annual ₹)
    gross_salary: data.gross_salary || 0,
    basic_salary: data.basic_salary || 0,
    hra_received: data.hra_received || 0,
    special_allowance: data.special_allowance || 0,
    lta: data.lta || 0,
    bonus: data.bonus || 0,
    other_salary: data.other_salary || 0,

    // Section 10 Exemptions
    hra_exemption: data.hra_exemption || 0,
    lta_exemption: data.lta_exemption || 0,
    other_exemptions: data.other_exemptions || 0,

    // Salary Deductions (Section 16)
    standard_deduction: data.standard_deduction || 0,
    professional_tax: data.professional_tax || 0,

    // Chapter VI-A Deductions (currently claimed)
    deduction_80c: data.deduction_80c || 0,
    deduction_80ccc: data.deduction_80ccc || 0,
    deduction_80ccd_1: data.deduction_80ccd_1 || 0,
    deduction_80ccd_1b: data.deduction_80ccd_1b || 0,
    deduction_80ccd_2: data.deduction_80ccd_2 || 0,
    deduction_80d: data.deduction_80d || 0,
    deduction_80e: data.deduction_80e || 0,
    deduction_80g: data.deduction_80g || 0,
    deduction_80tta: data.deduction_80tta || 0,
    deduction_24b: data.deduction_24b || 0,
    other_deductions: data.other_deductions || 0,

    // Tax Computation (from Form 16)
    taxable_income: data.taxable_income || 0,
    tax_payable: data.tax_payable || 0,
    cess: data.cess || 0,
    total_tax_paid: data.total_tax_paid || 0,

    // Regime & context
    regime: data.regime || TaxRegime.NEW,
    city: data.city || 'other',
    monthly_rent: data.monthly_rent || 0,
    epf_employee_contribution: data.epf_employee_contribution || 0,
  };

  // Computed properties
  Object.defineProperty(profile, 'is_metro', {
    get() {
      return METRO_CITIES.has(this.city.toLowerCase());
    },
    enumerable: true,
  });

  Object.defineProperty(profile, 'total_exemptions', {
    get() {
      return this.hra_exemption + this.lta_exemption + this.other_exemptions;
    },
    enumerable: true,
  });

  Object.defineProperty(profile, 'total_chapter_via', {
    get() {
      return (
        this.deduction_80c +
        this.deduction_80ccc +
        this.deduction_80ccd_1 +
        this.deduction_80ccd_1b +
        this.deduction_80ccd_2 +
        this.deduction_80d +
        this.deduction_80e +
        this.deduction_80g +
        this.deduction_80tta +
        this.deduction_24b +
        this.other_deductions
      );
    },
    enumerable: true,
  });

  return profile;
}

// ── Holding ──────────────────────────────────────────────────────────────────

/**
 * @param {object} data - Raw holding data
 * @returns {object} Holding with computed gain/cost helpers
 */
export function createHolding(data) {
  const holding = {
    security_name: data.security_name,
    security_type: data.security_type,
    purchase_date: typeof data.purchase_date === 'string'
      ? new Date(data.purchase_date)
      : data.purchase_date,
    purchase_price: data.purchase_price,
    quantity: data.quantity,
    current_price: data.current_price,
  };

  Object.defineProperty(holding, 'total_cost', {
    get() {
      return Math.round(this.purchase_price * this.quantity * 100) / 100;
    },
    enumerable: true,
  });

  Object.defineProperty(holding, 'current_value', {
    get() {
      return Math.round(this.current_price * this.quantity * 100) / 100;
    },
    enumerable: true,
  });

  Object.defineProperty(holding, 'unrealized_gain', {
    get() {
      return Math.round((this.current_value - this.total_cost) * 100) / 100;
    },
    enumerable: true,
  });

  /**
   * Months held from purchase to reference date.
   * @param {Date} [asOf] - Reference date (default: today)
   */
  holding.holdingMonths = function (asOf) {
    const ref = asOf || new Date();
    const pd = this.purchase_date;
    return (ref.getFullYear() - pd.getFullYear()) * 12 + (ref.getMonth() - pd.getMonth());
  };

  /**
   * Is this holding long-term? Equity/ELSS: >12 months, Debt: >24 months.
   * @param {Date} [asOf] - Reference date
   */
  holding.isLongTerm = function (asOf) {
    const months = this.holdingMonths(asOf);
    if ([SecurityType.EQUITY_SHARE, SecurityType.EQUITY_MF, SecurityType.ELSS].includes(this.security_type)) {
      return months > 12;
    }
    return months > 24;
  };

  return holding;
}

// ── Holdings ─────────────────────────────────────────────────────────────────

/**
 * @param {object} data - Raw holdings data
 * @returns {object} Holdings portfolio
 */
export function createHoldings(data) {
  return {
    holdings: (data?.holdings || []).map(createHolding),
    realized_stcg_this_fy: data?.realized_stcg_this_fy || 0,
    realized_ltcg_this_fy: data?.realized_ltcg_this_fy || 0,
  };
}

// ── Finding ──────────────────────────────────────────────────────────────────

/**
 * @param {object} data - Finding fields
 * @returns {object} Finding
 */
export function createFinding(data) {
  return {
    check_id: data.check_id,
    check_name: data.check_name,
    status: data.status,
    finding: data.finding || '',
    savings: data.savings || 0,
    action: data.action || '',
    deadline: data.deadline || '',
    confidence: data.confidence || Confidence.DEFINITE,
    explanation: data.explanation || '',
    details: data.details || {},
  };
}

// ── TaxHawkResult ────────────────────────────────────────────────────────────

/**
 * @param {object} data - Result fields
 * @returns {object} TaxHawkResult
 */
export function createTaxHawkResult(data) {
  return {
    user_name: data.user_name,
    financial_year: data.financial_year,
    current_regime: data.current_regime,
    recommended_regime: data.recommended_regime,
    total_savings: data.total_savings,
    checks: data.checks || [],
    summary: data.summary || '',
    disclaimer: data.disclaimer || (
      'This analysis is for informational purposes only and does not constitute ' +
      'tax advice. Please consult a qualified Chartered Accountant before making ' +
      'tax decisions. Tax laws are subject to change.'
    ),
  };
}
