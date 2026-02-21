"""Pydantic models for TaxHawk tax engine.

Naming follows BUILD_PLAN.md conventions:
  SalaryProfile  — extracted from Form 16 Part B
  Holding        — single investment position
  Holdings       — portfolio of holdings + realized gains
  Finding        — output from one optimization check
  TaxHawkResult  — final report combining all findings
"""

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, computed_field


# ── Enums ────────────────────────────────────────────────────────────────────

class TaxRegime(str, Enum):
    OLD = "old"
    NEW = "new"


class SecurityType(str, Enum):
    EQUITY_SHARE = "equity_share"
    EQUITY_MF = "equity_mf"
    DEBT_MF = "debt_mf"
    ELSS = "elss"
    OTHER = "other"


class FindingStatus(str, Enum):
    OPPORTUNITY = "opportunity"
    OPTIMIZED = "optimized"
    NOT_APPLICABLE = "not_applicable"


class Confidence(str, Enum):
    DEFINITE = "definite"
    LIKELY = "likely"
    NEEDS_VERIFICATION = "needs_verification"


# Metro cities for HRA: ONLY Mumbai, Delhi, Kolkata, Chennai
METRO_CITIES = {"mumbai", "delhi", "kolkata", "chennai"}


# ── SalaryProfile ────────────────────────────────────────────────────────────

class SalaryProfile(BaseModel):
    """Structured salary data extracted from Form 16 Part B."""

    # Identity
    financial_year: str = Field(description="e.g. '2024-25'")
    employee_name: str
    pan: str = ""
    employer_name: str = ""

    # Salary Components (annual ₹)
    gross_salary: float
    basic_salary: float
    hra_received: float = 0
    special_allowance: float = 0
    lta: float = 0
    bonus: float = 0
    other_salary: float = 0

    # Section 10 Exemptions
    hra_exemption: float = 0
    lta_exemption: float = 0
    other_exemptions: float = 0

    # Salary Deductions (Section 16)
    standard_deduction: float = 0
    professional_tax: float = 0

    # Chapter VI-A Deductions (currently claimed)
    deduction_80c: float = 0
    deduction_80ccc: float = 0
    deduction_80ccd_1: float = 0
    deduction_80ccd_1b: float = 0
    deduction_80ccd_2: float = 0
    deduction_80d: float = 0
    deduction_80e: float = 0
    deduction_80g: float = 0
    deduction_80tta: float = 0
    deduction_24b: float = 0
    other_deductions: float = 0

    # Tax Computation (from Form 16)
    taxable_income: float = 0
    tax_payable: float = 0
    cess: float = 0
    total_tax_paid: float = 0

    # Regime & context
    regime: TaxRegime = TaxRegime.NEW
    city: str = "other"
    monthly_rent: float = 0
    epf_employee_contribution: float = 0

    @property
    def is_metro(self) -> bool:
        """Bangalore is NOT metro for HRA. Only Mumbai/Delhi/Kolkata/Chennai."""
        return self.city.lower() in METRO_CITIES

    @property
    def total_exemptions(self) -> float:
        return self.hra_exemption + self.lta_exemption + self.other_exemptions

    @property
    def total_chapter_via(self) -> float:
        """Sum of all currently claimed Chapter VI-A deductions."""
        return (
            self.deduction_80c
            + self.deduction_80ccc
            + self.deduction_80ccd_1
            + self.deduction_80ccd_1b
            + self.deduction_80ccd_2
            + self.deduction_80d
            + self.deduction_80e
            + self.deduction_80g
            + self.deduction_80tta
            + self.deduction_24b
            + self.other_deductions
        )


# ── Holdings ─────────────────────────────────────────────────────────────────

class Holding(BaseModel):
    """A single investment position (equity share, MF unit, etc.)."""

    security_name: str
    security_type: SecurityType
    purchase_date: date
    purchase_price: float = Field(description="Cost per unit/share")
    quantity: float
    current_price: float = Field(description="Current market price per unit/share")

    @computed_field
    @property
    def total_cost(self) -> float:
        return round(self.purchase_price * self.quantity, 2)

    @computed_field
    @property
    def current_value(self) -> float:
        return round(self.current_price * self.quantity, 2)

    @computed_field
    @property
    def unrealized_gain(self) -> float:
        return round(self.current_value - self.total_cost, 2)

    def holding_months(self, as_of: Optional[date] = None) -> int:
        """Months held from purchase to reference date (default: today)."""
        ref = as_of or date.today()
        return (ref.year - self.purchase_date.year) * 12 + (ref.month - self.purchase_date.month)

    def is_long_term(self, as_of: Optional[date] = None) -> bool:
        """Equity/ELSS: >12 months. Debt: >24 months."""
        months = self.holding_months(as_of)
        if self.security_type in (SecurityType.EQUITY_SHARE, SecurityType.EQUITY_MF, SecurityType.ELSS):
            return months > 12
        return months > 24


class Holdings(BaseModel):
    """Portfolio of investment holdings."""

    holdings: list[Holding] = Field(default_factory=list)
    realized_stcg_this_fy: float = 0
    realized_ltcg_this_fy: float = 0


# ── Finding ──────────────────────────────────────────────────────────────────

class Finding(BaseModel):
    """Output from a single tax optimization check."""

    check_id: str
    check_name: str
    status: FindingStatus
    finding: str = Field(description="One-line summary of what was found")
    savings: float = Field(default=0, description="₹ amount saved (0 if optimized or N/A)")
    action: str = ""
    deadline: str = ""
    confidence: Confidence = Confidence.DEFINITE
    explanation: str = ""
    details: dict = Field(default_factory=dict)


# ── TaxHawkResult ────────────────────────────────────────────────────────────

class TaxHawkResult(BaseModel):
    """Final report combining all optimization findings."""

    user_name: str
    financial_year: str
    current_regime: TaxRegime
    recommended_regime: TaxRegime
    total_savings: float
    checks: list[Finding]
    summary: str = ""
    disclaimer: str = (
        "This analysis is for informational purposes only and does not constitute "
        "tax advice. Please consult a qualified Chartered Accountant before making "
        "tax decisions. Tax laws are subject to change."
    )
