"""Check 3: Section 80D — Health Insurance Premium Deduction.

Identifies opportunity to claim health insurance deduction, especially
for parents who often lack coverage after retirement.

This is a COMPONENT of the regime switch benefit.
"""

from ..models import SalaryProfile, Finding, FindingStatus, Confidence
from ..tax_utils import (
    get_marginal_rate,
    compute_old_regime_taxable_income,
    LIMIT_80D_SELF_BELOW_60,
    LIMIT_80D_SELF_SENIOR,
    LIMIT_80D_PARENTS_BELOW_60,
    LIMIT_80D_PARENTS_SENIOR,
    CESS_RATE,
)


def check_80d(
    salary: SalaryProfile,
    parents_senior: bool = False,
    self_senior: bool = False,
    has_self_policy: bool = False,
    has_parents_policy: bool = False,
) -> Finding:
    """Analyze health insurance deduction opportunity under Section 80D.

    Args:
        salary: Structured salary data.
        parents_senior: True if either parent is 60+ years.
        self_senior: True if taxpayer is 60+ years.
        has_self_policy: True if user already has personal health insurance.
        has_parents_policy: True if parents already have health insurance.

    Returns:
        Finding with 80D opportunity details.
    """
    fy = salary.financial_year
    current_80d = salary.deduction_80d

    # Limits
    self_limit = LIMIT_80D_SELF_SENIOR if self_senior else LIMIT_80D_SELF_BELOW_60
    parents_limit = LIMIT_80D_PARENTS_SENIOR if parents_senior else LIMIT_80D_PARENTS_BELOW_60
    total_limit = self_limit + parents_limit

    # Calculate available deduction
    # Assume: employer group insurance doesn't count for 80D (not a taxable perk)
    # Main opportunity is usually parents' insurance
    recommended_premium = 0
    opportunity_type = ""

    if current_80d >= total_limit:
        return Finding(
            check_id="80d_check",
            check_name="Health Insurance (Section 80D)",
            status=FindingStatus.OPTIMIZED,
            finding=f"80D fully utilized at \u20b9{current_80d:,.0f}",
            savings=0,
            action="No action needed",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={
                "self_family_claimed": current_80d,
                "self_family_limit": self_limit,
                "parents_limit": parents_limit,
                "total_limit": total_limit,
            },
        )

    # For our target user: young professional, employer group cover exists,
    # parents likely have no personal policy
    additional_80d = total_limit - current_80d

    # If nothing claimed, recommend parents insurance (the big win)
    if current_80d == 0:
        recommended_premium = parents_limit
        opportunity_type = "parents"
    else:
        recommended_premium = additional_80d
        opportunity_type = "additional"

    # Marginal rate at old regime GTI
    old_breakdown = compute_old_regime_taxable_income(salary)
    gti = old_breakdown["gross_total_income"]
    marginal = get_marginal_rate(gti, regime="old", fy=fy)
    tax_saved = round(recommended_premium * marginal * (1 + CESS_RATE))

    if opportunity_type == "parents":
        finding_text = (
            f"Parents have no health insurance. "
            f"\u20b9{recommended_premium:,.0f} policy = \u20b9{tax_saved:,.0f} tax saving"
        )
        action_text = (
            f"Buy a \u20b95-10L family floater health insurance for parents "
            f"(annual premium ~\u20b920-25K). Claim under Section 80D"
        )
    else:
        finding_text = (
            f"\u20b9{additional_80d:,.0f} additional 80D deduction available"
        )
        action_text = (
            f"Increase health insurance coverage to claim additional "
            f"\u20b9{additional_80d:,.0f} under 80D"
        )

    return Finding(
        check_id="80d_check",
        check_name="Health Insurance (Section 80D)",
        status=FindingStatus.OPPORTUNITY,
        finding=finding_text,
        savings=tax_saved,
        action=action_text,
        deadline=f"March 31 (for FY {fy} deduction)",
        confidence=Confidence.DEFINITE,
        explanation=(
            f"Section 80D allows deduction for health insurance premiums: "
            f"up to \u20b9{self_limit:,.0f} for self/family and "
            f"\u20b9{parents_limit:,.0f} for parents. "
            f"A family floater for parents costs ~\u20b925K/year and the effective "
            f"cost after tax saving is only \u20b9{recommended_premium - tax_saved:,.0f}."
        ),
        details={
            "self_family_claimed": current_80d,
            "self_family_limit": self_limit,
            "parents_claimed": 0,
            "parents_limit": parents_limit,
            "parents_senior": parents_senior,
            "recommended_premium": recommended_premium,
            "marginal_rate": marginal,
            "tax_saved_component": tax_saved,
        },
    )
