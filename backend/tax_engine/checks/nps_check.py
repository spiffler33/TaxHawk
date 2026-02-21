"""Check 6: NPS 80CCD(1B) — Additional ₹50,000 Deduction.

This is an ADDITIONAL deduction OVER AND ABOVE the ₹1.5L 80C limit.
Available only under old regime. The trade-off is that NPS is locked
until age 60.

This is a COMPONENT of the regime switch benefit.
"""

from ..models import SalaryProfile, Finding, FindingStatus, Confidence
from ..tax_utils import (
    get_marginal_rate,
    compute_old_regime_taxable_income,
    LIMIT_80CCD_1B,
    CESS_RATE,
)


def check_nps(salary: SalaryProfile) -> Finding:
    """Check NPS 80CCD(1B) deduction opportunity.

    Args:
        salary: Structured salary data.

    Returns:
        Finding with NPS opportunity details.
    """
    fy = salary.financial_year
    current_nps_1b = salary.deduction_80ccd_1b
    gap = max(LIMIT_80CCD_1B - current_nps_1b, 0)

    if gap <= 0:
        return Finding(
            check_id="nps_check",
            check_name="NPS Tax Benefit (80CCD(1B))",
            status=FindingStatus.OPTIMIZED,
            finding=f"NPS 80CCD(1B) fully utilized at \u20b9{current_nps_1b:,.0f}",
            savings=0,
            action="No action needed",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={
                "current_nps_1b": current_nps_1b,
                "limit_1b": LIMIT_80CCD_1B,
                "gap": 0,
            },
        )

    # Marginal rate at old regime GTI
    old_breakdown = compute_old_regime_taxable_income(salary)
    gti = old_breakdown["gross_total_income"]
    marginal = get_marginal_rate(gti, regime="old", fy=fy)
    tax_saved = round(gap * marginal * (1 + CESS_RATE))

    return Finding(
        check_id="nps_check",
        check_name="NPS Tax Benefit (80CCD(1B))",
        status=FindingStatus.OPPORTUNITY,
        finding=f"\u20b9{gap:,.0f} NPS contribution saves \u20b9{tax_saved:,.0f} in tax (additional to 80C)",
        savings=tax_saved,
        action=(
            f"Open NPS Tier 1 account and invest \u20b9{gap:,.0f}. "
            f"This is ABOVE the \u20b91.5L 80C limit"
        ),
        deadline=f"March 31 (for FY {fy} deduction)",
        confidence=Confidence.DEFINITE,
        explanation=(
            f"Section 80CCD(1B) provides an additional \u20b9{LIMIT_80CCD_1B:,.0f} "
            f"deduction over the 80C limit. At your {marginal * 100:.0f}% marginal rate, "
            f"this saves \u20b9{tax_saved:,.0f} immediately. The trade-off: NPS is "
            f"locked until age 60, but the tax saving is immediate."
        ),
        details={
            "current_nps_1b": current_nps_1b,
            "limit_1b": LIMIT_80CCD_1B,
            "gap": gap,
            "marginal_rate": marginal,
            "tax_saved_component": tax_saved,
            "note": "Locked until age 60. Tax saving is immediate, but money is illiquid",
        },
    )
