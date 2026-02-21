"""Check 4: HRA Exemption Optimization.

HRA is often the SINGLE BIGGEST factor in the old-vs-new regime decision.
This check calculates the optimal HRA exemption and explains it as a
component of the regime switch.

Savings are reported as 0 because they're already captured in the regime
comparator's total — this check exists to EXPLAIN the HRA component.
"""

from ..models import SalaryProfile, Finding, FindingStatus, Confidence
from ..tax_utils import calculate_hra_exemption


def check_hra(salary: SalaryProfile) -> Finding:
    """Analyze HRA exemption opportunity under Section 10(13A).

    Args:
        salary: Structured salary data.

    Returns:
        Finding with HRA optimization details. Savings = 0 (captured in regime check).
    """
    # No HRA opportunity if not receiving HRA or not paying rent
    if salary.hra_received <= 0 or salary.monthly_rent <= 0:
        return Finding(
            check_id="hra_optimizer",
            check_name="HRA Exemption",
            status=FindingStatus.NOT_APPLICABLE,
            finding="No HRA received or no rent paid",
            savings=0,
            action="N/A",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={
                "hra_received": salary.hra_received,
                "monthly_rent": salary.monthly_rent,
            },
        )

    rent_annual = salary.monthly_rent * 12
    optimal_exemption = calculate_hra_exemption(
        basic_annual=salary.basic_salary,
        hra_received_annual=salary.hra_received,
        rent_paid_annual=rent_annual,
        is_metro=salary.is_metro,
    )
    current_exemption = salary.hra_exemption

    # HRA components for transparency
    option_a = salary.hra_received
    option_b = rent_annual - (0.10 * salary.basic_salary)
    metro_pct = 0.50 if salary.is_metro else 0.40
    option_c = metro_pct * salary.basic_salary

    city_type = "metro" if salary.is_metro else "non-metro"

    if optimal_exemption <= 0:
        return Finding(
            check_id="hra_optimizer",
            check_name="HRA Exemption",
            status=FindingStatus.NOT_APPLICABLE,
            finding="Rent is too low relative to basic salary for HRA benefit",
            savings=0,
            action="N/A",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={
                "rent_annual": rent_annual,
                "hra_received": salary.hra_received,
                "optimal_exemption": 0,
            },
        )

    if current_exemption > 0 and current_exemption >= optimal_exemption:
        return Finding(
            check_id="hra_optimizer",
            check_name="HRA Exemption",
            status=FindingStatus.OPTIMIZED,
            finding=f"HRA exemption already claimed at \u20b9{current_exemption:,.0f}",
            savings=0,
            action="No action needed",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={
                "rent_annual": rent_annual,
                "hra_received": salary.hra_received,
                "current_exemption": current_exemption,
                "optimal_exemption": optimal_exemption,
            },
        )

    # Opportunity: HRA not claimed (likely because user is on new regime)
    return Finding(
        check_id="hra_optimizer",
        check_name="HRA Exemption",
        status=FindingStatus.OPPORTUNITY,
        finding=(
            f"Paying \u20b9{salary.monthly_rent:,.0f}/month rent but claiming "
            f"\u20b9{current_exemption:,.0f} HRA ({salary.regime.value} regime). "
            f"Old regime unlocks \u20b9{optimal_exemption:,.0f} exemption"
        ),
        savings=0,  # Captured in regime_comparator
        action=(
            "Collect rent receipts and landlord PAN. "
            "HRA benefit is captured in regime switch recommendation"
        ),
        deadline="Include in ITR filing by July 31",
        confidence=Confidence.DEFINITE,
        explanation=(
            f"HRA exemption = min of three amounts:\n"
            f"  A) Actual HRA received = \u20b9{option_a:,.0f}\n"
            f"  B) Rent - 10% of Basic = \u20b9{option_b:,.0f}\n"
            f"  C) {int(metro_pct * 100)}% of Basic ({city_type}) = \u20b9{option_c:,.0f}\n"
            f"  Exempt amount = \u20b9{optimal_exemption:,.0f}"
        ),
        details={
            "rent_annual": rent_annual,
            "hra_received": salary.hra_received,
            "optimal_exemption": optimal_exemption,
            "current_exemption": current_exemption,
            "is_metro": salary.is_metro,
            "option_a_hra_received": option_a,
            "option_b_rent_minus_basic": option_b,
            "option_c_percent_basic": option_c,
            "note": "Savings included in regime arbitrage check",
        },
    )
