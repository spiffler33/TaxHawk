"""TaxHawk Tax Engine — deterministic tax optimization for Indian salaried professionals."""

from .models import SalaryProfile, Holding, Holdings, Finding, TaxHawkResult
from .tax_utils import (
    calculate_new_regime_tax,
    calculate_old_regime_tax,
    apply_cess,
    apply_87a_rebate,
    get_marginal_rate,
    calculate_hra_exemption,
)

__all__ = [
    "SalaryProfile",
    "Holding",
    "Holdings",
    "Finding",
    "TaxHawkResult",
    "calculate_new_regime_tax",
    "calculate_old_regime_tax",
    "apply_cess",
    "apply_87a_rebate",
    "get_marginal_rate",
    "calculate_hra_exemption",
]
