"""Check 2: Section 80C Gap Analysis.

Identifies the gap between current 80C usage (usually just EPF) and the
₹1.5L limit. Recommends ELSS as the preferred instrument for young earners.

This is a COMPONENT of the regime switch benefit — savings here are already
factored into the regime_comparator's total.
"""

from ..models import SalaryProfile, Finding, FindingStatus, Confidence
from ..tax_utils import (
    get_marginal_rate,
    compute_old_regime_taxable_income,
    LIMIT_80C,
    CESS_RATE,
)


def check_80c(salary: SalaryProfile) -> Finding:
    """Analyze the gap between current 80C claims and the ₹1.5L limit.

    Args:
        salary: Structured salary data from Form 16.

    Returns:
        Finding with 80C gap details and recommended action.
    """
    fy = salary.financial_year

    # Current 80C usage (80C + 80CCC + 80CCD(1) share the ₹1.5L limit)
    current_80c = (
        salary.deduction_80c
        + salary.deduction_80ccc
        + salary.deduction_80ccd_1
    )
    current_80c = min(current_80c, LIMIT_80C)

    epf = salary.epf_employee_contribution
    gap = max(LIMIT_80C - current_80c, 0)

    if gap <= 0:
        return Finding(
            check_id="80c_gap",
            check_name="Section 80C Gap",
            status=FindingStatus.OPTIMIZED,
            finding=f"80C fully utilized at \u20b9{current_80c:,.0f}",
            savings=0,
            action="No action needed \u2014 80C limit already maxed",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={
                "epf_contribution": epf,
                "current_80c_total": current_80c,
                "limit": LIMIT_80C,
                "gap": 0,
            },
        )

    # Marginal rate: use GTI before VI-A deductions (the rate at which
    # each rupee of deduction saves tax)
    old_breakdown = compute_old_regime_taxable_income(salary)
    gti = old_breakdown["gross_total_income"]
    marginal = get_marginal_rate(gti, regime="old", fy=fy)
    tax_saved = round(gap * marginal * (1 + CESS_RATE))

    return Finding(
        check_id="80c_gap",
        check_name="Section 80C Gap",
        status=FindingStatus.OPPORTUNITY,
        finding=(
            f"\u20b9{gap:,.0f} gap in 80C limit. "
            f"EPF covers \u20b9{epf:,.0f} of \u20b9{LIMIT_80C / 1000:.0f}K"
        ),
        savings=tax_saved,
        action=(
            f"Invest \u20b9{gap:,.0f} in ELSS mutual fund "
            f"(e.g., Mirae Asset ELSS, Axis ELSS) before March 31"
        ),
        deadline=f"March 31 (for FY {fy} deduction)",
        confidence=Confidence.DEFINITE,
        explanation=(
            f"Your EPF contribution of \u20b9{epf:,.0f} covers only "
            f"{epf / LIMIT_80C * 100:.0f}% of the \u20b9{LIMIT_80C:,.0f} limit. "
            f"ELSS has the shortest lock-in (3 years) among 80C instruments "
            f"and offers equity market returns."
        ),
        details={
            "epf_contribution": epf,
            "current_80c_total": current_80c,
            "limit": LIMIT_80C,
            "gap": gap,
            "marginal_rate": marginal,
            "tax_saved_component": tax_saved,
            "recommended_instrument": "ELSS (3-year lock-in, equity growth)",
        },
    )
