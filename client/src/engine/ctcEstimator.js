/**
 * CTC Estimator — converts 8 question answers into a SalaryProfile.
 *
 * Industry-standard salary structure for Indian tech:
 *   Basic          = 40% of CTC
 *   HRA            = 50% of Basic (= 20% of CTC)
 *   Employer EPF   = 12% of Basic (NOT in gross salary)
 *   Gratuity       = 4.81% of Basic (NOT in gross salary)
 *   Gross Salary   = CTC - Employer EPF - Gratuity
 *   Special Allow. = Gross - Basic - HRA (catch-all component)
 *   Employee EPF   = 12% of Basic (same as employer, counts toward 80C)
 *
 * NOTE: EPF ratio varies by employer — some cap at statutory minimum
 * (₹1,800/month). 12% of basic is a reasonable approximation for
 * most salaried professionals. High CTC structures may differ.
 *
 * NOTE: Bangalore is legally non-metro for HRA, but many employers
 * treat it as metro. The estimator stores the actual city; the model's
 * is_metro check will use the legal classification (non-metro for
 * Bangalore). This is a known approximation for the estimates layer.
 */

import { createSalaryProfile, METRO_CITIES } from './models.js';

// Valid city codes. Lowercase keys match the model's city field.
export const CITY_OPTIONS = [
  { code: 'delhi', label: 'Delhi', metro: true },
  { code: 'mumbai', label: 'Mumbai', metro: true },
  { code: 'bangalore', label: 'Bangalore', metro: false },
  { code: 'chennai', label: 'Chennai', metro: true },
  { code: 'kolkata', label: 'Kolkata', metro: true },
  { code: 'hyderabad', label: 'Hyderabad', metro: false },
  { code: 'pune', label: 'Pune', metro: false },
  { code: 'other', label: 'Other', metro: false },
];

// Salary structure ratios
const BASIC_RATIO = 0.40;
const HRA_RATIO = 0.50; // of basic
const EPF_RATIO = 0.12; // of basic
const GRATUITY_RATIO = 0.0481; // of basic

// Default FY and standard values
const DEFAULT_FY = '2024-25';
const DEFAULT_PROFESSIONAL_TAX = 2_400; // typical annual
const DEFAULT_STANDARD_DEDUCTION_NEW = 75_000; // new regime FY 2024-25
const LIMIT_80C = 150_000;

/**
 * Convert user questionnaire answers into a SalaryProfile.
 *
 * @param {object} answers
 * @param {number}  answers.ctc                    - Annual CTC in ₹
 * @param {number}  [answers.monthlyRent=0]        - Monthly rent in ₹
 * @param {string}  [answers.city='other']         - City code (lowercase)
 * @param {number}  [answers.homeLoanInterest=0]   - Annual home loan interest in ₹
 * @param {number}  [answers.healthPremiumSelf=0]  - Self/family health insurance premium
 * @param {number}  [answers.healthPremiumParents=0] - Parents health insurance premium
 * @param {boolean} [answers.parentsOver60=false]  - Are parents senior citizens?
 * @param {number}  [answers.extra80C=0]           - 80C investments beyond EPF (PPF, ELSS, etc.)
 * @param {number}  [answers.npsContribution=0]    - NPS contribution (80CCD(1B))
 * @param {string}  [answers.name='']              - User's name (for display)
 * @returns {object} SalaryProfile ready for the orchestrator
 */
export function estimateFromCTC(answers) {
  const ctc = answers.ctc;

  // ── Derive salary structure ──────────────────────────────────────────
  const basic = Math.round(ctc * BASIC_RATIO);
  const hra = Math.round(basic * HRA_RATIO);
  const employerEpf = Math.round(basic * EPF_RATIO);
  const gratuity = Math.round(basic * GRATUITY_RATIO);
  const grossSalary = ctc - employerEpf - gratuity;
  const specialAllowance = grossSalary - basic - hra;
  const epfEmployee = Math.round(basic * EPF_RATIO); // same as employer

  // ── Deductions from user answers ─────────────────────────────────────
  // 80C: EPF + extra investments, capped at ₹1.5L
  const total80c = Math.min(epfEmployee + (answers.extra80C || 0), LIMIT_80C);

  // 80D: self + parents premiums (individual sub-limits enforced by check)
  const total80d = (answers.healthPremiumSelf || 0) + (answers.healthPremiumParents || 0);

  // City: normalize to lowercase
  const city = (answers.city || 'other').toLowerCase();

  return createSalaryProfile({
    financial_year: DEFAULT_FY,
    employee_name: answers.name || '',

    // Salary structure
    gross_salary: grossSalary,
    basic_salary: basic,
    hra_received: hra,
    special_allowance: specialAllowance,

    // Section 10 exemptions — new regime claims none
    hra_exemption: 0,
    lta_exemption: 0,
    other_exemptions: 0,

    // Section 16
    standard_deduction: DEFAULT_STANDARD_DEDUCTION_NEW,
    professional_tax: DEFAULT_PROFESSIONAL_TAX,

    // Chapter VI-A — current claims (what user already has/does)
    deduction_80c: total80c,
    deduction_80d: total80d,
    deduction_80ccd_1b: answers.npsContribution || 0,
    deduction_24b: answers.homeLoanInterest || 0,

    // Regime & context
    regime: 'new', // default since FY 2023-24
    city,
    monthly_rent: answers.monthlyRent || 0,
    epf_employee_contribution: epfEmployee,
  });
}

/**
 * Get salary breakdown for display purposes.
 * Shows how CTC is split before feeding into the engine.
 *
 * @param {number} ctc - Annual CTC in ₹
 * @returns {object} Breakdown with all derived components
 */
export function getEstimateBreakdown(ctc) {
  const basic = Math.round(ctc * BASIC_RATIO);
  const hra = Math.round(basic * HRA_RATIO);
  const employerEpf = Math.round(basic * EPF_RATIO);
  const gratuity = Math.round(basic * GRATUITY_RATIO);
  const grossSalary = ctc - employerEpf - gratuity;
  const specialAllowance = grossSalary - basic - hra;
  const epfEmployee = Math.round(basic * EPF_RATIO);

  return {
    ctc,
    basic,
    hra,
    specialAllowance,
    employerEpf,
    gratuity,
    grossSalary,
    epfEmployee,
    monthlyInHand: Math.round(
      (grossSalary - epfEmployee - DEFAULT_PROFESSIONAL_TAX) / 12
    ),
  };
}
