"""Shared fixtures for TaxHawk test suite."""

import json
from datetime import date
from pathlib import Path

import pytest

from backend.tax_engine.models import SalaryProfile, Holdings


DEMO_DIR = Path(__file__).resolve().parent.parent / "demo"


@pytest.fixture
def priya_salary() -> SalaryProfile:
    """Priya Sharma's salary profile (₹15L gross, Mumbai metro, FY 2024-25)."""
    with open(DEMO_DIR / "priya_form16.json") as f:
        return SalaryProfile(**json.load(f))


@pytest.fixture
def priya_holdings() -> Holdings:
    """Priya's investment holdings (4 positions)."""
    with open(DEMO_DIR / "priya_holdings.json") as f:
        return Holdings(**json.load(f))


@pytest.fixture
def fy_end() -> date:
    """End of FY 2024-25 — reference date for capital gains evaluation."""
    return date(2025, 3, 31)
