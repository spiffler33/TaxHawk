"""TaxHawk optimization checks — 6 independent tax optimization analyses."""

from .regime_comparator import check_regime
from .section_80c import check_80c
from .section_80d import check_80d
from .hra_optimizer import check_hra
from .capital_gains import check_capital_gains
from .nps_check import check_nps
from .orchestrator import run_all_checks

__all__ = [
    "check_regime",
    "check_80c",
    "check_80d",
    "check_hra",
    "check_capital_gains",
    "check_nps",
    "run_all_checks",
]
