"""Check 1: Tax Regime Arbitrage — Old vs New regime comparison.

This is the HIGHEST-IMPACT check. It computes the fully-optimized old regime
tax (with HRA, 80C, 80D, NPS) and compares it to the new regime tax.

The savings reported here IS the ground-truth regime switch benefit. Individual
checks (80C, 80D, etc.) show component breakdowns for transparency.
"""

from ..models import SalaryProfile, Finding, FindingStatus, Confidence
from ..tax_utils import (
    calculate_new_regime_tax,
    calculate_old_regime_tax,
    compute_new_regime_taxable_income,
    compute_old_regime_taxable_income,
    calculate_hra_exemption,
    get_marginal_rate,
    LIMIT_80C,
    LIMIT_80CCD_1B,
    LIMIT_80D_SELF_BELOW_60,
    LIMIT_80D_SELF_SENIOR,
    LIMIT_80D_PARENTS_BELOW_60,
    LIMIT_80D_PARENTS_SENIOR,
    STANDARD_DEDUCTION,
)


def check_regime(
    salary: SalaryProfile,
    parents_senior: bool = False,
    self_senior: bool = False,
    has_self_health_insurance: bool = False,
) -> Finding:
    """Compare old vs new regime with fully optimized deductions.

    Args:
        salary: Structured salary data from Form 16.
        parents_senior: True if either parent is 60+.
        self_senior: True if taxpayer is 60+.
        has_self_health_insurance: True if user has own health insurance policy.

    Returns:
        Finding with regime recommendation and savings.
    """
    fy = salary.financial_year
    age_category = "senior" if self_senior else "below_60"

    # ── New Regime Tax ──────────────────────────────────────────────────
    new_taxable = compute_new_regime_taxable_income(salary)
    new_tax_result = calculate_new_regime_tax(new_taxable, fy)
    new_tax = new_tax_result["total_tax"]

    # ── Optimized Old Regime Tax ────────────────────────────────────────
    # Calculate optimal HRA exemption
    optimal_hra = 0.0
    if salary.hra_received > 0 and salary.monthly_rent > 0:
        optimal_hra = calculate_hra_exemption(
            basic_annual=salary.basic_salary,
            hra_received_annual=salary.hra_received,
            rent_paid_annual=salary.monthly_rent * 12,
            is_metro=salary.is_metro,
        )

    # Calculate optimal 80C (EPF + fill gap with ELSS/PPF)
    current_80c = salary.deduction_80c + salary.deduction_80ccc + salary.deduction_80ccd_1
    optimal_80c = min(max(current_80c, salary.epf_employee_contribution), LIMIT_80C)
    # If there's still a gap, recommend filling it
    optimal_80c = LIMIT_80C  # Assume user will fill the gap

    # Calculate optimal 80D (self + parents insurance)
    # For non-seniors, assume employer group cover handles self — only optimize parents.
    # For seniors (60+), no employer group cover — optimize both self and parents.
    self_limit = LIMIT_80D_SELF_SENIOR if self_senior else LIMIT_80D_SELF_BELOW_60
    parents_limit = LIMIT_80D_PARENTS_SENIOR if parents_senior else LIMIT_80D_PARENTS_BELOW_60
    optimal_80d_target = (self_limit + parents_limit) if self_senior else parents_limit
    optimal_80d = max(salary.deduction_80d, optimal_80d_target)

    # Calculate optimal NPS 80CCD(1B)
    optimal_nps_1b = LIMIT_80CCD_1B

    # Compute old regime taxable income with optimized deductions
    old_breakdown = compute_old_regime_taxable_income(
        salary,
        hra_exemption=optimal_hra,
        total_80c=optimal_80c,
        total_80d=optimal_80d,
        total_80ccd_1b=optimal_nps_1b,
    )
    old_taxable = old_breakdown["taxable_income"]
    old_tax_result = calculate_old_regime_tax(old_taxable, fy, age_category=age_category)
    old_tax = old_tax_result["total_tax"]

    # ── Compare ─────────────────────────────────────────────────────────
    savings = new_tax - old_tax
    recommended = "old" if savings > 0 else "new"

    # Build deductions_needed dict (only for items not already claimed)
    deductions_needed = {}
    if optimal_hra > salary.hra_exemption:
        deductions_needed["hra_exemption"] = optimal_hra
    gap_80c = LIMIT_80C - current_80c
    if gap_80c > 0:
        deductions_needed["section_80c"] = optimal_80c
        deductions_needed["section_80c_gap"] = gap_80c
    if optimal_80d > salary.deduction_80d:
        deductions_needed["section_80d"] = optimal_80d
    if optimal_nps_1b > salary.deduction_80ccd_1b:
        deductions_needed["section_80ccd_1b"] = optimal_nps_1b

    if savings > 0:
        return Finding(
            check_id="regime_arbitrage",
            check_name="Tax Regime Optimization",
            status=FindingStatus.OPPORTUNITY,
            finding=f"Switching to old regime with full deductions saves \u20b9{savings:,.0f}",
            savings=savings,
            action=(
                f"File ITR under old tax regime for FY {fy}. "
                f"Invest in ELSS/PPF for 80C, get parents' health insurance for 80D, "
                f"and open NPS for 80CCD(1B) before March 31"
            ),
            deadline=f"July 31 (ITR filing) \u2014 but investments needed before March 31",
            confidence=Confidence.DEFINITE,
            explanation=(
                f"Your employer applied the new regime (default), resulting in tax of "
                f"\u20b9{new_tax:,.0f}. Under the old regime with optimized deductions "
                f"(HRA \u20b9{optimal_hra:,.0f} + 80C \u20b9{optimal_80c:,.0f} + "
                f"80D \u20b9{optimal_80d:,.0f} + NPS \u20b9{optimal_nps_1b:,.0f}), "
                f"your tax drops to \u20b9{old_tax:,.0f}."
            ),
            details={
                "new_regime_tax": new_tax,
                "new_regime_taxable": new_taxable,
                "old_regime_tax": old_tax,
                "old_regime_taxable": old_taxable,
                "recommended_regime": recommended,
                "old_regime_breakdown": old_breakdown,
                "deductions_needed": deductions_needed,
            },
        )
    else:
        return Finding(
            check_id="regime_arbitrage",
            check_name="Tax Regime Optimization",
            status=FindingStatus.OPTIMIZED,
            finding=f"New regime is already optimal (saves \u20b9{-savings:,.0f} vs old)",
            savings=0,
            action="No action needed \u2014 continue with new regime",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            explanation=(
                f"New regime tax: \u20b9{new_tax:,.0f}. "
                f"Old regime tax (even with optimized deductions): \u20b9{old_tax:,.0f}. "
                f"New regime is better by \u20b9{-savings:,.0f}."
            ),
            details={
                "new_regime_tax": new_tax,
                "new_regime_taxable": new_taxable,
                "old_regime_tax": old_tax,
                "old_regime_taxable": old_taxable,
                "recommended_regime": recommended,
                "old_regime_breakdown": old_breakdown,
            },
        )
