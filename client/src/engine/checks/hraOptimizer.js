/**
 * Check 4: HRA Exemption Optimization.
 *
 * Savings reported as 0 — already captured in regime_comparator's total.
 * This check exists to EXPLAIN the HRA component.
 *
 * Ported from backend/tax_engine/checks/hra_optimizer.py
 */

import { FindingStatus, Confidence, createFinding } from '../models.js';
import { calculateHraExemption } from '../taxUtils.js';

/**
 * Analyze HRA exemption opportunity under Section 10(13A).
 * @param {object} salary - SalaryProfile
 * @returns {object} Finding (savings always 0)
 */
export function checkHra(salary) {
  // No HRA opportunity if not receiving HRA or not paying rent
  if (salary.hra_received <= 0 || salary.monthly_rent <= 0) {
    return createFinding({
      check_id: 'hra_optimizer',
      check_name: 'HRA Exemption',
      status: FindingStatus.NOT_APPLICABLE,
      finding: 'No HRA received or no rent paid',
      savings: 0,
      action: 'N/A',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        hra_received: salary.hra_received,
        monthly_rent: salary.monthly_rent,
      },
    });
  }

  const rentAnnual = salary.monthly_rent * 12;
  const optimalExemption = calculateHraExemption(
    salary.basic_salary,
    salary.hra_received,
    rentAnnual,
    salary.is_metro,
  );
  const currentExemption = salary.hra_exemption;

  // HRA components for transparency
  const optionA = salary.hra_received;
  const optionB = rentAnnual - (0.10 * salary.basic_salary);
  const metroPct = salary.is_metro ? 0.50 : 0.40;
  const optionC = metroPct * salary.basic_salary;
  const cityType = salary.is_metro ? 'metro' : 'non-metro';

  if (optimalExemption <= 0) {
    return createFinding({
      check_id: 'hra_optimizer',
      check_name: 'HRA Exemption',
      status: FindingStatus.NOT_APPLICABLE,
      finding: 'Rent is too low relative to basic salary for HRA benefit',
      savings: 0,
      action: 'N/A',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        rent_annual: rentAnnual,
        hra_received: salary.hra_received,
        optimal_exemption: 0,
      },
    });
  }

  if (currentExemption > 0 && currentExemption >= optimalExemption) {
    return createFinding({
      check_id: 'hra_optimizer',
      check_name: 'HRA Exemption',
      status: FindingStatus.OPTIMIZED,
      finding: `HRA exemption already claimed at \u20b9${currentExemption.toLocaleString('en-IN')}`,
      savings: 0,
      action: 'No action needed',
      deadline: 'N/A',
      confidence: Confidence.DEFINITE,
      details: {
        rent_annual: rentAnnual,
        hra_received: salary.hra_received,
        current_exemption: currentExemption,
        optimal_exemption: optimalExemption,
      },
    });
  }

  // Opportunity: HRA not claimed (likely on new regime)
  return createFinding({
    check_id: 'hra_optimizer',
    check_name: 'HRA Exemption',
    status: FindingStatus.OPPORTUNITY,
    finding: (
      `Paying \u20b9${salary.monthly_rent.toLocaleString('en-IN')}/month rent but claiming ` +
      `\u20b9${currentExemption.toLocaleString('en-IN')} HRA (${salary.regime} regime). ` +
      `Old regime unlocks \u20b9${optimalExemption.toLocaleString('en-IN')} exemption`
    ),
    savings: 0, // Captured in regime_comparator
    action: (
      'Collect rent receipts and landlord PAN. ' +
      'HRA benefit is captured in regime switch recommendation'
    ),
    deadline: 'Include in ITR filing by July 31',
    confidence: Confidence.DEFINITE,
    explanation: (
      `HRA exemption = min of three amounts:\n` +
      `  A) Actual HRA received = \u20b9${optionA.toLocaleString('en-IN')}\n` +
      `  B) Rent - 10% of Basic = \u20b9${optionB.toLocaleString('en-IN')}\n` +
      `  C) ${(metroPct * 100).toFixed(0)}% of Basic (${cityType}) = \u20b9${optionC.toLocaleString('en-IN')}\n` +
      `  Exempt amount = \u20b9${optimalExemption.toLocaleString('en-IN')}`
    ),
    details: {
      rent_annual: rentAnnual,
      hra_received: salary.hra_received,
      optimal_exemption: optimalExemption,
      current_exemption: currentExemption,
      is_metro: salary.is_metro,
      option_a_hra_received: optionA,
      option_b_rent_minus_basic: optionB,
      option_c_percent_basic: optionC,
      note: 'Savings included in regime arbitrage check',
    },
  });
}
