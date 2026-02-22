"""Deterministic tax calculation functions.

ALL tax math lives here. The LLM NEVER computes tax amounts.
Every rate, limit, and slab is defined as a constant — not hardcoded in logic.
"""

from typing import Optional

from .models import SalaryProfile

# ═══════════════════════════════════════════════════════════════════════════════
# TAX SLAB CONSTANTS  (from knowledge_base/01_tax_slabs.md)
# Each slab: (upper_limit, rate). Last slab uses float('inf').
# ═══════════════════════════════════════════════════════════════════════════════

NEW_REGIME_SLABS_FY2024_25: list[tuple[float, float]] = [
    (300_000, 0.00),
    (700_000, 0.05),
    (1_000_000, 0.10),
    (1_200_000, 0.15),
    (1_500_000, 0.20),
    (float("inf"), 0.30),
]

NEW_REGIME_SLABS_FY2025_26: list[tuple[float, float]] = [
    (400_000, 0.00),
    (800_000, 0.05),
    (1_200_000, 0.10),
    (1_600_000, 0.15),
    (2_000_000, 0.20),
    (2_400_000, 0.25),
    (float("inf"), 0.30),
]

OLD_REGIME_SLABS_BELOW_60: list[tuple[float, float]] = [
    (250_000, 0.00),
    (500_000, 0.05),
    (1_000_000, 0.20),
    (float("inf"), 0.30),
]

OLD_REGIME_SLABS_SENIOR: list[tuple[float, float]] = [
    (300_000, 0.00),
    (500_000, 0.05),
    (1_000_000, 0.20),
    (float("inf"), 0.30),
]

OLD_REGIME_SLABS_SUPER_SENIOR: list[tuple[float, float]] = [
    (500_000, 0.00),
    (1_000_000, 0.20),
    (float("inf"), 0.30),
]

# ═══════════════════════════════════════════════════════════════════════════════
# DEDUCTION & EXEMPTION LIMITS  (from knowledge_base/)
# ═══════════════════════════════════════════════════════════════════════════════

CESS_RATE = 0.04  # 4% Health & Education Cess on (tax + surcharge)

STANDARD_DEDUCTION = {
    "2024-25": {"old": 50_000, "new": 75_000},
    "2025-26": {"old": 75_000, "new": 75_000},
}

REBATE_87A = {
    "2024-25": {
        "old": {"income_limit": 500_000, "max_rebate": 12_500},
        "new": {"income_limit": 700_000, "max_rebate": 25_000},
    },
    "2025-26": {
        "old": {"income_limit": 500_000, "max_rebate": 12_500},
        "new": {"income_limit": 1_200_000, "max_rebate": 60_000},
    },
}

# Surcharge slabs: (upper_limit, rate)
SURCHARGE_SLABS_OLD: list[tuple[float, float]] = [
    (5_000_000, 0.00),
    (10_000_000, 0.10),
    (20_000_000, 0.15),
    (50_000_000, 0.25),
    (float("inf"), 0.37),
]

SURCHARGE_SLABS_NEW: list[tuple[float, float]] = [
    (5_000_000, 0.00),
    (10_000_000, 0.10),
    (20_000_000, 0.15),
    (50_000_000, 0.25),
    (float("inf"), 0.25),  # Capped at 25% for new regime
]

# Section 80C/80CCC/80CCD(1) combined limit
LIMIT_80C = 150_000

# Section 80CCD(1B) — additional NPS, ABOVE 80C limit
LIMIT_80CCD_1B = 50_000

# Section 80CCD(2) — employer NPS (% of basic)
LIMIT_80CCD_2_PRIVATE = 0.10  # 10% of Basic + DA
LIMIT_80CCD_2_GOVT = 0.14     # 14% of Basic + DA

# Section 80D limits
LIMIT_80D_SELF_BELOW_60 = 25_000
LIMIT_80D_SELF_SENIOR = 50_000
LIMIT_80D_PARENTS_BELOW_60 = 25_000
LIMIT_80D_PARENTS_SENIOR = 50_000

# Home loan interest (self-occupied)
LIMIT_24B_SELF_OCCUPIED = 200_000

# HRA calculation percentages
HRA_METRO_PERCENT = 0.50
HRA_NON_METRO_PERCENT = 0.40
HRA_RENT_MINUS_BASIC_PERCENT = 0.10

# Capital gains (FY 2024-25 onwards, post Budget 2024)
LTCG_EXEMPTION = 125_000
LTCG_RATE = 0.125   # 12.5%
STCG_RATE = 0.20    # 20% for listed equity (STT paid)
EQUITY_LTCG_HOLDING_MONTHS = 12
DEBT_LTCG_HOLDING_MONTHS = 24


# ═══════════════════════════════════════════════════════════════════════════════
# CORE TAX FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _compute_tax_on_slabs(taxable_income: float, slabs: list[tuple[float, float]]) -> float:
    """Apply progressive slab rates to taxable income. Returns base tax."""
    tax = 0.0
    prev_limit = 0.0
    for upper_limit, rate in slabs:
        if taxable_income <= prev_limit:
            break
        taxable_in_slab = min(taxable_income, upper_limit) - prev_limit
        tax += taxable_in_slab * rate
        prev_limit = upper_limit
    return tax


def apply_cess(tax: float) -> float:
    """Apply 4% Health & Education Cess. Returns cess amount (not total)."""
    return round(tax * CESS_RATE)


def apply_87a_rebate(tax: float, taxable_income: float, regime: str, fy: str = "2024-25") -> float:
    """Apply Section 87A rebate if eligible. Returns tax after rebate."""
    rebate_info = REBATE_87A.get(fy, {}).get(regime)
    if rebate_info and taxable_income <= rebate_info["income_limit"]:
        rebate = min(tax, rebate_info["max_rebate"])
        return round(tax - rebate)
    return tax


def _get_surcharge(taxable_income: float, base_tax: float, surcharge_slabs: list[tuple[float, float]]) -> float:
    """Compute surcharge. For our target range (₹10-30 LPA), this is ₹0."""
    rate = 0.0
    for upper_limit, surcharge_rate in surcharge_slabs:
        if taxable_income <= upper_limit:
            rate = surcharge_rate
            break
    return round(base_tax * rate)


def get_marginal_rate(
    taxable_income: float,
    regime: str = "old",
    fy: str = "2024-25",
    age_category: str = "below_60",
) -> float:
    """Return the marginal slab rate at a given taxable income level.

    Used to estimate tax savings from additional deductions:
        savings = deduction_amount * marginal_rate * (1 + CESS_RATE)
    """
    if regime == "new":
        slabs = NEW_REGIME_SLABS_FY2025_26 if fy == "2025-26" else NEW_REGIME_SLABS_FY2024_25
    elif age_category == "super_senior":
        slabs = OLD_REGIME_SLABS_SUPER_SENIOR
    elif age_category == "senior":
        slabs = OLD_REGIME_SLABS_SENIOR
    else:
        slabs = OLD_REGIME_SLABS_BELOW_60

    rate = 0.0
    prev_limit = 0.0
    for upper_limit, slab_rate in slabs:
        if taxable_income <= upper_limit:
            rate = slab_rate
            break
        prev_limit = upper_limit
        rate = slab_rate  # Fall through to last slab if income exceeds all
    return rate


def calculate_new_regime_tax(taxable_income: float, fy: str = "2024-25") -> dict:
    """Full tax computation under new regime.

    Args:
        taxable_income: Income after standard deduction and professional tax.
        fy: Financial year ('2024-25' or '2025-26').

    Returns:
        Dict with base_tax, rebate_87a, surcharge, cess, total_tax.
    """
    slabs = NEW_REGIME_SLABS_FY2025_26 if fy == "2025-26" else NEW_REGIME_SLABS_FY2024_25

    base_tax = _compute_tax_on_slabs(taxable_income, slabs)
    tax_after_rebate = apply_87a_rebate(base_tax, taxable_income, "new", fy)
    surcharge = _get_surcharge(taxable_income, tax_after_rebate, SURCHARGE_SLABS_NEW)
    cess = apply_cess(tax_after_rebate + surcharge)
    total_tax = round(tax_after_rebate + surcharge + cess)

    return {
        "taxable_income": taxable_income,
        "base_tax": round(base_tax),
        "rebate_87a": round(base_tax - tax_after_rebate),
        "tax_after_rebate": tax_after_rebate,
        "surcharge": surcharge,
        "cess": cess,
        "total_tax": total_tax,
    }


def calculate_old_regime_tax(
    taxable_income: float,
    fy: str = "2024-25",
    age_category: str = "below_60",
) -> dict:
    """Full tax computation under old regime.

    Args:
        taxable_income: Income after all deductions (std ded, VI-A, etc.).
        fy: Financial year.
        age_category: 'below_60' | 'senior' | 'super_senior'.

    Returns:
        Dict with base_tax, rebate_87a, surcharge, cess, total_tax.
    """
    if age_category == "super_senior":
        slabs = OLD_REGIME_SLABS_SUPER_SENIOR
    elif age_category == "senior":
        slabs = OLD_REGIME_SLABS_SENIOR
    else:
        slabs = OLD_REGIME_SLABS_BELOW_60

    base_tax = _compute_tax_on_slabs(taxable_income, slabs)
    tax_after_rebate = apply_87a_rebate(base_tax, taxable_income, "old", fy)
    surcharge = _get_surcharge(taxable_income, tax_after_rebate, SURCHARGE_SLABS_OLD)
    cess = apply_cess(tax_after_rebate + surcharge)
    total_tax = round(tax_after_rebate + surcharge + cess)

    return {
        "taxable_income": taxable_income,
        "base_tax": round(base_tax),
        "rebate_87a": round(base_tax - tax_after_rebate),
        "tax_after_rebate": tax_after_rebate,
        "surcharge": surcharge,
        "cess": cess,
        "total_tax": total_tax,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TAXABLE INCOME DERIVATION
# ═══════════════════════════════════════════════════════════════════════════════

def compute_new_regime_taxable_income(salary: SalaryProfile) -> float:
    """Derive taxable income under new regime from salary data.

    New regime allows: standard deduction + professional tax + employer NPS.
    No 80C, 80D, HRA, etc.
    """
    fy = salary.financial_year
    std_ded = STANDARD_DEDUCTION.get(fy, {}).get("new", 75_000)
    taxable = salary.gross_salary - std_ded - salary.professional_tax - salary.deduction_80ccd_2
    return max(taxable, 0)


def compute_old_regime_taxable_income(
    salary: SalaryProfile,
    hra_exemption: Optional[float] = None,
    total_80c: Optional[float] = None,
    total_80d: Optional[float] = None,
    total_80ccd_1b: Optional[float] = None,
) -> dict:
    """Derive taxable income under old regime.

    Pass overrides for 'what-if' optimization scenarios.
    None = use current Form 16 values. A number = use that value instead.

    Returns dict with full breakdown for transparency.
    """
    fy = salary.financial_year
    std_ded = STANDARD_DEDUCTION.get(fy, {}).get("old", 50_000)

    # Section 10 exemptions
    hra_exempt = hra_exemption if hra_exemption is not None else salary.hra_exemption
    net_salary = salary.gross_salary - hra_exempt - salary.lta_exemption - salary.other_exemptions

    # Gross total income
    gti = net_salary - std_ded - salary.professional_tax

    # Chapter VI-A deductions
    ded_80c = total_80c if total_80c is not None else min(
        salary.deduction_80c + salary.deduction_80ccc + salary.deduction_80ccd_1, LIMIT_80C
    )
    ded_80d = total_80d if total_80d is not None else salary.deduction_80d
    ded_80ccd_1b = total_80ccd_1b if total_80ccd_1b is not None else salary.deduction_80ccd_1b
    ded_80ccd_2 = salary.deduction_80ccd_2
    ded_other = (
        salary.deduction_80e
        + salary.deduction_80g
        + salary.deduction_80tta
        + salary.deduction_24b
        + salary.other_deductions
    )

    total_via = ded_80c + ded_80ccd_1b + ded_80ccd_2 + ded_80d + ded_other
    taxable_income = max(gti - total_via, 0)

    return {
        "gross_salary": salary.gross_salary,
        "hra_exemption": hra_exempt,
        "lta_exemption": salary.lta_exemption,
        "other_exemptions": salary.other_exemptions,
        "net_salary": net_salary,
        "standard_deduction": std_ded,
        "professional_tax": salary.professional_tax,
        "gross_total_income": gti,
        "deduction_80c": ded_80c,
        "deduction_80ccd_1b": ded_80ccd_1b,
        "deduction_80ccd_2": ded_80ccd_2,
        "deduction_80d": ded_80d,
        "deduction_other": ded_other,
        "total_vi_a": total_via,
        "taxable_income": taxable_income,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HRA EXEMPTION (Section 10(13A))
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_hra_exemption(
    basic_annual: float,
    hra_received_annual: float,
    rent_paid_annual: float,
    is_metro: bool,
) -> float:
    """HRA exemption = minimum of three amounts.

    1. Actual HRA received
    2. Rent paid - 10% of Basic
    3. 50% of Basic (metro) or 40% of Basic (non-metro)

    Bangalore is NON-METRO.
    """
    option_a = hra_received_annual
    option_b = rent_paid_annual - (HRA_RENT_MINUS_BASIC_PERCENT * basic_annual)
    option_c = (HRA_METRO_PERCENT if is_metro else HRA_NON_METRO_PERCENT) * basic_annual
    return max(min(option_a, option_b, option_c), 0)
