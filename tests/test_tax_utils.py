"""Unit tests for backend/tax_engine/tax_utils.py

Tests the deterministic tax calculation functions — slab math, cess,
Section 87A rebate, marginal rates, HRA exemption, and taxable income derivation.
"""

import pytest

from backend.tax_engine.tax_utils import (
    _compute_tax_on_slabs,
    apply_cess,
    apply_87a_rebate,
    get_marginal_rate,
    calculate_new_regime_tax,
    calculate_old_regime_tax,
    compute_new_regime_taxable_income,
    compute_old_regime_taxable_income,
    calculate_hra_exemption,
    NEW_REGIME_SLABS_FY2024_25,
    NEW_REGIME_SLABS_FY2025_26,
    OLD_REGIME_SLABS_BELOW_60,
    OLD_REGIME_SLABS_SENIOR,
    OLD_REGIME_SLABS_SUPER_SENIOR,
    CESS_RATE,
    LIMIT_80C,
    LIMIT_80CCD_1B,
    STANDARD_DEDUCTION,
)
from backend.tax_engine.models import SalaryProfile


# ═══════════════════════════════════════════════════════════════════════════════
# _compute_tax_on_slabs — progressive slab calculation
# ═══════════════════════════════════════════════════════════════════════════════


class TestComputeTaxOnSlabs:
    """Test the core progressive slab tax function."""

    def test_zero_income(self):
        assert _compute_tax_on_slabs(0, NEW_REGIME_SLABS_FY2024_25) == 0

    def test_income_within_first_slab(self):
        """Income ≤ ₹3L → 0% tax under new regime FY 2024-25."""
        assert _compute_tax_on_slabs(200_000, NEW_REGIME_SLABS_FY2024_25) == 0
        assert _compute_tax_on_slabs(300_000, NEW_REGIME_SLABS_FY2024_25) == 0

    def test_income_in_second_slab(self):
        """₹3L–₹7L → 5% on amount above ₹3L."""
        # ₹5L: tax on 2L at 5% = ₹10,000
        assert _compute_tax_on_slabs(500_000, NEW_REGIME_SLABS_FY2024_25) == 10_000
        # ₹7L: tax on 4L at 5% = ₹20,000
        assert _compute_tax_on_slabs(700_000, NEW_REGIME_SLABS_FY2024_25) == 20_000

    def test_income_at_slab_boundary(self):
        """Exact slab boundary — top of ₹10L slab under new regime."""
        # ₹10L: 0 + 20K + 30K = 50K
        assert _compute_tax_on_slabs(1_000_000, NEW_REGIME_SLABS_FY2024_25) == 50_000

    def test_high_income_new_regime(self):
        """₹23,22,600 — Priya's new regime taxable from DEMO_SCENARIO.md (₹24L profile)."""
        # 0 + 20K + 30K + 30K + 60K + (23,22,600 - 15,00,000)*30% = 246,780
        # Total = 386,780
        tax = _compute_tax_on_slabs(2_322_600, NEW_REGIME_SLABS_FY2024_25)
        assert tax == 386_780

    def test_old_regime_slabs_below_60(self):
        """₹9,82,600 — Priya's optimized old regime taxable (₹15L profile)."""
        # ₹0–₹2.5L: 0
        # ₹2.5L–₹5L: 12,500
        # ₹5L–₹9,82,600: 4,82,600 * 20% = 96,520
        # Total: 1,09,020
        tax = _compute_tax_on_slabs(982_600, OLD_REGIME_SLABS_BELOW_60)
        assert tax == 109_020

    def test_old_regime_senior_exemption(self):
        """Senior citizen: ₹0–₹3L at 0% instead of ₹2.5L."""
        # ₹4L: (4L - 3L) * 5% = ₹5,000
        tax = _compute_tax_on_slabs(400_000, OLD_REGIME_SLABS_SENIOR)
        assert tax == 5_000
        # Compare: below 60 would pay (4L - 2.5L) * 5% = ₹7,500
        tax_regular = _compute_tax_on_slabs(400_000, OLD_REGIME_SLABS_BELOW_60)
        assert tax_regular == 7_500

    def test_old_regime_super_senior(self):
        """Super senior (80+): ₹0–₹5L at 0%, no 5% slab."""
        assert _compute_tax_on_slabs(500_000, OLD_REGIME_SLABS_SUPER_SENIOR) == 0
        # ₹8L: (8L - 5L) * 20% = ₹60,000
        assert _compute_tax_on_slabs(800_000, OLD_REGIME_SLABS_SUPER_SENIOR) == 60_000

    def test_new_regime_fy2025_26_slabs(self):
        """FY 2025-26 new regime: 0-4L (0%), 4-8L (5%), 8-12L (10%), ...

        ₹12L: 0 + (8L-4L)*5% + (12L-8L)*10% = 20K + 40K = 60,000
        """
        tax = _compute_tax_on_slabs(1_200_000, NEW_REGIME_SLABS_FY2025_26)
        assert tax == 60_000


# ═══════════════════════════════════════════════════════════════════════════════
# apply_cess
# ═══════════════════════════════════════════════════════════════════════════════


class TestCess:
    def test_cess_on_zero(self):
        assert apply_cess(0) == 0

    def test_cess_4_percent(self):
        """Standard 4% cess."""
        assert apply_cess(100_000) == 4_000

    def test_cess_rounding(self):
        """Cess is rounded to nearest rupee."""
        # 109_020 * 0.04 = 4360.8 → rounds to 4361
        assert apply_cess(109_020) == 4_361


# ═══════════════════════════════════════════════════════════════════════════════
# apply_87a_rebate
# ═══════════════════════════════════════════════════════════════════════════════


class TestRebate87A:
    def test_new_regime_eligible(self):
        """Taxable ≤ ₹7L under new regime FY 2024-25 → full rebate up to ₹25K."""
        # ₹6L: base tax = (6L - 3L) * 5% = 15K → rebate = 15K → tax = 0
        assert apply_87a_rebate(15_000, 600_000, "new", "2024-25") == 0

    def test_new_regime_at_limit(self):
        """Exactly ₹7L taxable → eligible."""
        assert apply_87a_rebate(20_000, 700_000, "new", "2024-25") == 0

    def test_new_regime_above_limit(self):
        """₹7,00,001 → no rebate at all (cliff, not phase-out)."""
        assert apply_87a_rebate(20_001, 700_001, "new", "2024-25") == 20_001

    def test_old_regime_eligible(self):
        """Taxable ≤ ₹5L under old regime → rebate up to ₹12,500."""
        assert apply_87a_rebate(12_500, 500_000, "old", "2024-25") == 0

    def test_old_regime_above_limit(self):
        assert apply_87a_rebate(12_500, 500_001, "old", "2024-25") == 12_500

    def test_rebate_capped_at_max(self):
        """Rebate shouldn't exceed the max_rebate for the regime."""
        # New regime max rebate is ₹25K. If tax is ₹30K and income ≤ ₹7L:
        assert apply_87a_rebate(30_000, 700_000, "new", "2024-25") == 5_000

    def test_fy2025_26_new_regime_higher_limit(self):
        """FY 2025-26: new regime rebate up to ₹12L income, ₹60K rebate."""
        assert apply_87a_rebate(60_000, 1_200_000, "new", "2025-26") == 0
        # Above limit: no rebate
        assert apply_87a_rebate(60_000, 1_200_001, "new", "2025-26") == 60_000


# ═══════════════════════════════════════════════════════════════════════════════
# get_marginal_rate
# ═══════════════════════════════════════════════════════════════════════════════


class TestMarginalRate:
    def test_zero_income(self):
        assert get_marginal_rate(0, "old") == 0.0

    def test_old_regime_5_percent(self):
        assert get_marginal_rate(400_000, "old") == 0.05

    def test_old_regime_20_percent(self):
        assert get_marginal_rate(800_000, "old") == 0.20

    def test_old_regime_30_percent(self):
        """GTI of ₹12,07,600 (Priya) → 30% slab."""
        assert get_marginal_rate(1_207_600, "old") == 0.30

    def test_new_regime_15_percent(self):
        assert get_marginal_rate(1_100_000, "new", "2024-25") == 0.15

    def test_new_regime_30_percent(self):
        assert get_marginal_rate(2_000_000, "new", "2024-25") == 0.30

    def test_at_slab_boundary(self):
        """Exactly at ₹10L → should be in the 20% slab (old regime)."""
        assert get_marginal_rate(1_000_000, "old") == 0.20


# ═══════════════════════════════════════════════════════════════════════════════
# calculate_new_regime_tax — full pipeline
# ═══════════════════════════════════════════════════════════════════════════════


class TestNewRegimeTax:
    def test_priya_15l_profile(self):
        """Priya's ₹15L profile: taxable ₹14,22,600 → tax ₹1,29,501."""
        result = calculate_new_regime_tax(1_422_600, "2024-25")
        assert result["total_tax"] == 129_501

    def test_priya_15l_breakdown(self):
        """Verify individual components."""
        result = calculate_new_regime_tax(1_422_600, "2024-25")
        # Slabs: 0 + 20K + 30K + 30K + 42,260*20% = ... let me compute
        # 0-3L: 0
        # 3-7L: 20,000
        # 7-10L: 30,000
        # 10-12L: 30,000
        # 12-14.226L: 2,22,600 * 0.20 = 44,520
        # Total base: 124,520
        assert result["base_tax"] == 124_520
        assert result["rebate_87a"] == 0  # Income > ₹7L
        assert result["surcharge"] == 0   # Income < ₹50L
        assert result["cess"] == apply_cess(124_520)
        assert result["total_tax"] == 124_520 + apply_cess(124_520)

    def test_demo_scenario_24l(self):
        """DEMO_SCENARIO.md ₹24L profile: taxable ₹23,22,600 → tax ₹4,02,251."""
        result = calculate_new_regime_tax(2_322_600, "2024-25")
        assert result["total_tax"] == 402_251

    def test_below_rebate_threshold(self):
        """Income ≤ ₹7L → zero tax after rebate."""
        result = calculate_new_regime_tax(600_000, "2024-25")
        assert result["total_tax"] == 0

    def test_zero_income(self):
        result = calculate_new_regime_tax(0, "2024-25")
        assert result["total_tax"] == 0


# ═══════════════════════════════════════════════════════════════════════════════
# calculate_old_regime_tax — full pipeline
# ═══════════════════════════════════════════════════════════════════════════════


class TestOldRegimeTax:
    def test_priya_optimized(self):
        """Priya's optimized old regime: taxable ₹9,82,600 → tax ₹1,13,381."""
        result = calculate_old_regime_tax(982_600, "2024-25")
        assert result["total_tax"] == 113_381

    def test_priya_breakdown(self):
        result = calculate_old_regime_tax(982_600, "2024-25")
        # 0-2.5L: 0, 2.5-5L: 12500, 5-9.826L: 4,82,600*20% = 96,520
        assert result["base_tax"] == 109_020
        assert result["rebate_87a"] == 0
        assert result["surcharge"] == 0
        assert result["cess"] == apply_cess(109_020)

    def test_demo_scenario_24l_old(self):
        """DEMO_SCENARIO.md: old regime taxable ₹18,42,600 → tax ₹3,79,891."""
        result = calculate_old_regime_tax(1_842_600, "2024-25")
        assert result["total_tax"] == 379_891

    def test_below_rebate(self):
        """Taxable ≤ ₹5L → zero tax."""
        result = calculate_old_regime_tax(400_000, "2024-25")
        assert result["total_tax"] == 0

    def test_senior_citizen(self):
        """Senior citizens get ₹3L zero slab instead of ₹2.5L."""
        regular = calculate_old_regime_tax(400_000, "2024-25", "below_60")
        senior = calculate_old_regime_tax(400_000, "2024-25", "senior")
        # Both below rebate → both 0 after rebate
        assert regular["total_tax"] == 0
        assert senior["total_tax"] == 0
        # But base_tax differs
        assert regular["base_tax"] == 7_500  # (4L-2.5L)*5%
        assert senior["base_tax"] == 5_000   # (4L-3L)*5%


# ═══════════════════════════════════════════════════════════════════════════════
# compute_new_regime_taxable_income
# ═══════════════════════════════════════════════════════════════════════════════


class TestNewRegimeTaxableIncome:
    def test_priya(self, priya_salary):
        """₹15L gross - ₹75K std ded - ₹2,400 prof tax = ₹14,22,600."""
        taxable = compute_new_regime_taxable_income(priya_salary)
        assert taxable == 1_422_600

    def test_with_employer_nps(self):
        """80CCD(2) is the only Chapter VI-A deduction allowed in new regime."""
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="Test",
            gross_salary=1_500_000,
            basic_salary=600_000,
            professional_tax=2_400,
            deduction_80ccd_2=60_000,
        )
        expected = 1_500_000 - 75_000 - 2_400 - 60_000
        assert compute_new_regime_taxable_income(salary) == expected

    def test_minimum_zero(self):
        """Taxable income can't go negative."""
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="Test",
            gross_salary=50_000,
            basic_salary=50_000,
        )
        assert compute_new_regime_taxable_income(salary) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# compute_old_regime_taxable_income
# ═══════════════════════════════════════════════════════════════════════════════


class TestOldRegimeTaxableIncome:
    def test_priya_optimized(self, priya_salary):
        """Priya's old regime with all deductions → taxable ₹9,82,600."""
        result = compute_old_regime_taxable_income(
            priya_salary,
            hra_exemption=240_000,
            total_80c=150_000,
            total_80d=25_000,
            total_80ccd_1b=50_000,
        )
        assert result["taxable_income"] == 982_600

    def test_priya_breakdown(self, priya_salary):
        """Verify each line of the old regime derivation."""
        result = compute_old_regime_taxable_income(
            priya_salary,
            hra_exemption=240_000,
            total_80c=150_000,
            total_80d=25_000,
            total_80ccd_1b=50_000,
        )
        assert result["gross_salary"] == 1_500_000
        assert result["hra_exemption"] == 240_000
        assert result["net_salary"] == 1_500_000 - 240_000  # 12,60,000
        assert result["standard_deduction"] == 50_000  # Old regime FY 2024-25
        assert result["professional_tax"] == 2_400
        assert result["gross_total_income"] == 1_207_600
        assert result["deduction_80c"] == 150_000
        assert result["deduction_80d"] == 25_000
        assert result["deduction_80ccd_1b"] == 50_000
        assert result["total_vi_a"] == 225_000
        assert result["taxable_income"] == 982_600

    def test_defaults_use_form16_values(self, priya_salary):
        """When no overrides passed, use Form 16 values."""
        result = compute_old_regime_taxable_income(priya_salary)
        # Priya's Form 16: 80C=72K (EPF), 80D=0, 80CCD(1B)=0, HRA exemption=0
        assert result["hra_exemption"] == 0
        assert result["deduction_80c"] == 72_000
        assert result["deduction_80d"] == 0
        assert result["deduction_80ccd_1b"] == 0

    def test_standard_deduction_old_vs_new(self):
        """FY 2024-25: old=₹50K, new=₹75K. FY 2025-26: both ₹75K."""
        assert STANDARD_DEDUCTION["2024-25"]["old"] == 50_000
        assert STANDARD_DEDUCTION["2024-25"]["new"] == 75_000
        assert STANDARD_DEDUCTION["2025-26"]["old"] == 75_000
        assert STANDARD_DEDUCTION["2025-26"]["new"] == 75_000


# ═══════════════════════════════════════════════════════════════════════════════
# calculate_hra_exemption
# ═══════════════════════════════════════════════════════════════════════════════


class TestHRAExemption:
    def test_priya_metro(self):
        """Priya (₹15L profile): Mumbai metro, ₹25K rent.

        Option A: HRA received = ₹3,00,000
        Option B: Rent - 10% basic = 3,00,000 - 60,000 = ₹2,40,000
        Option C: 50% of basic (metro) = ₹3,00,000
        Min = ₹2,40,000
        """
        hra = calculate_hra_exemption(
            basic_annual=600_000,
            hra_received_annual=300_000,
            rent_paid_annual=300_000,
            is_metro=True,
        )
        assert hra == 240_000

    def test_demo_scenario_nonmetro(self):
        """DEMO_SCENARIO.md: Bangalore (non-metro), ₹30K rent, ₹8L basic.

        Option A: 4,00,000
        Option B: 3,60,000 - 80,000 = 2,80,000
        Option C: 40% * 8,00,000 = 3,20,000
        Min = 2,80,000
        """
        hra = calculate_hra_exemption(
            basic_annual=800_000,
            hra_received_annual=400_000,
            rent_paid_annual=360_000,
            is_metro=False,
        )
        assert hra == 280_000

    def test_zero_rent(self):
        """No rent → exemption = 0."""
        hra = calculate_hra_exemption(600_000, 300_000, 0, True)
        assert hra == 0

    def test_very_low_rent(self):
        """Rent below 10% of basic → option B is negative → exemption = 0."""
        hra = calculate_hra_exemption(
            basic_annual=600_000,
            hra_received_annual=300_000,
            rent_paid_annual=50_000,  # 50K - 60K = -10K
            is_metro=True,
        )
        assert hra == 0

    def test_metro_vs_nonmetro_difference(self):
        """Same salary/rent: metro gets 50% of basic, non-metro gets 40%."""
        metro_hra = calculate_hra_exemption(600_000, 300_000, 300_000, True)
        non_metro_hra = calculate_hra_exemption(600_000, 300_000, 300_000, False)
        # Metro: min(3L, 2.4L, 3L) = 2.4L
        assert metro_hra == 240_000
        # Non-metro: min(3L, 2.4L, 2.4L) = 2.4L (same in this case because option B dominates)
        assert non_metro_hra == 240_000

    def test_hra_limited_by_actual_hra(self):
        """When HRA received is the smallest — option A limits."""
        hra = calculate_hra_exemption(
            basic_annual=1_000_000,
            hra_received_annual=100_000,  # Small HRA
            rent_paid_annual=500_000,
            is_metro=True,
        )
        # A=1L, B=5L-1L=4L, C=5L → min = 1L
        assert hra == 100_000


# ═══════════════════════════════════════════════════════════════════════════════
# Constants validation
# ═══════════════════════════════════════════════════════════════════════════════


class TestConstants:
    """Verify critical tax constants from knowledge_base/."""

    def test_80c_limit(self):
        assert LIMIT_80C == 150_000

    def test_80ccd_1b_limit(self):
        assert LIMIT_80CCD_1B == 50_000

    def test_cess_rate(self):
        assert CESS_RATE == 0.04
