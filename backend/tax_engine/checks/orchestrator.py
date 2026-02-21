"""Orchestrator — runs all 6 checks and produces the final TaxHawkResult.

CRITICAL interdependency logic:
  - If regime_comparator recommends OLD → individual checks show component savings
  - If regime_comparator recommends NEW → zero out deduction-based savings
  - Capital gains check applies in BOTH regimes
  - Total savings = regime_switch_savings + capital_gains_savings
    (NOT the sum of all individual checks)
"""

from datetime import date
from typing import Optional

from ..models import (
    SalaryProfile,
    Holdings,
    Finding,
    FindingStatus,
    TaxHawkResult,
    TaxRegime,
)
from .regime_comparator import check_regime
from .section_80c import check_80c
from .section_80d import check_80d
from .hra_optimizer import check_hra
from .capital_gains import check_capital_gains
from .nps_check import check_nps


def run_all_checks(
    salary: SalaryProfile,
    holdings: Optional[Holdings] = None,
    parents_senior: bool = False,
    cg_as_of: Optional[date] = None,
) -> TaxHawkResult:
    """Run all 6 optimization checks and produce the final report.

    Args:
        salary: Structured salary data from Form 16.
        holdings: Investment holdings (optional).
        parents_senior: True if either parent is 60+.
        cg_as_of: Reference date for capital gains holding period.

    Returns:
        TaxHawkResult with all findings, total savings, and recommendation.
    """
    if holdings is None:
        holdings = Holdings()

    # ── Step 1: Run all checks ──────────────────────────────────────────
    regime_result = check_regime(salary, parents_senior=parents_senior)
    result_80c = check_80c(salary)
    result_80d = check_80d(salary, parents_senior=parents_senior)
    result_hra = check_hra(salary)
    result_cg = check_capital_gains(holdings, as_of=cg_as_of)
    result_nps = check_nps(salary)

    # ── Step 2: Handle regime interdependency ───────────────────────────
    recommended_regime = regime_result.details.get("recommended_regime", "new")

    all_checks = [regime_result, result_80c, result_80d, result_hra, result_cg, result_nps]

    if recommended_regime == "new":
        # Deduction-based savings don't apply under new regime
        deduction_checks = [result_80c, result_80d, result_hra, result_nps]
        for check in deduction_checks:
            old_savings = check.savings
            check.savings = 0
            check.status = FindingStatus.NOT_APPLICABLE
            if old_savings > 0:
                check.finding = (
                    f"Not applicable under new regime "
                    f"(would save \u20b9{old_savings:,.0f} under old regime)"
                )

    # ── Step 3: Calculate total savings ─────────────────────────────────
    # CRITICAL: NO DOUBLE-COUNTING.
    #   regime_result.savings already includes the combined effect of HRA +
    #   80C + 80D + NPS (it computes old_regime_tax with ALL deductions, then
    #   subtracts from new_regime_tax). Individual check savings (80C, 80D,
    #   NPS) are component breakdowns for display — they are NOT added here.
    #   HRA check always reports savings=0 explicitly.
    #   Capital gains is the only independent, additive savings.
    total_savings = regime_result.savings + result_cg.savings

    # ── Step 4: Sort by savings (descending) ────────────────────────────
    all_checks.sort(key=lambda c: c.savings, reverse=True)

    # ── Step 5: Generate summary ────────────────────────────────────────
    summary = _generate_summary(
        salary, all_checks, total_savings, recommended_regime
    )

    return TaxHawkResult(
        user_name=salary.employee_name,
        financial_year=salary.financial_year,
        current_regime=TaxRegime(salary.regime.value),
        recommended_regime=TaxRegime(recommended_regime),
        total_savings=total_savings,
        checks=all_checks,
        summary=summary,
    )


def _generate_summary(
    salary: SalaryProfile,
    checks: list[Finding],
    total_savings: float,
    recommended_regime: str,
) -> str:
    """Generate a plain-English summary of all findings."""
    opportunities = [c for c in checks if c.status == FindingStatus.OPPORTUNITY]
    optimized = [c for c in checks if c.status == FindingStatus.OPTIMIZED]

    lines = []

    if total_savings > 0:
        lines.append(
            f"TaxHawk found \u20b9{total_savings:,.0f} in potential tax savings "
            f"for {salary.employee_name} (FY {salary.financial_year})."
        )

        if recommended_regime == "old" and salary.regime.value == "new":
            lines.append(
                f"The biggest opportunity: switching from the new tax regime "
                f"(employer default) to the old regime with optimized deductions."
            )

        if opportunities:
            lines.append(
                f"\n{len(opportunities)} optimization(s) found:"
            )
            for opp in opportunities:
                if opp.savings > 0:
                    lines.append(f"  - {opp.check_name}: \u20b9{opp.savings:,.0f}")
    else:
        lines.append(
            f"Your tax setup is already well-optimized for FY {salary.financial_year}. "
            f"No significant savings opportunities found."
        )

    return "\n".join(lines)
