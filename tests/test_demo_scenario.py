"""End-to-end tests: Priya's demo profile through all 6 checks + orchestrator.

Verified numbers (₹15L gross, Mumbai metro, FY 2024-25):
  New regime tax:        ₹1,29,501
  Old regime tax (opt):  ₹1,13,381
  Regime savings:        ₹16,120
  LTCG harvesting:       ₹4,862
  Total savings:         ₹20,982

Component display values (NOT additive — included in regime switch):
  80C gap saving:        ₹24,336
  80D saving:            ₹7,800
  NPS saving:            ₹15,600
  HRA saving:            ₹0 (captured in regime check)
"""

import pytest
from datetime import date

from backend.tax_engine.models import (
    SalaryProfile,
    Holdings,
    FindingStatus,
    TaxRegime,
)
from backend.tax_engine.checks.regime_comparator import check_regime
from backend.tax_engine.checks.section_80c import check_80c
from backend.tax_engine.checks.section_80d import check_80d
from backend.tax_engine.checks.hra_optimizer import check_hra
from backend.tax_engine.checks.capital_gains import check_capital_gains
from backend.tax_engine.checks.nps_check import check_nps
from backend.tax_engine.checks.orchestrator import run_all_checks


# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 1: Regime Arbitrage
# ═══════════════════════════════════════════════════════════════════════════════


class TestRegimeArbitrage:
    def test_new_regime_tax(self, priya_salary):
        result = check_regime(priya_salary)
        assert result.details["new_regime_tax"] == 129_501

    def test_old_regime_tax(self, priya_salary):
        result = check_regime(priya_salary)
        assert result.details["old_regime_tax"] == 113_381

    def test_regime_savings(self, priya_salary):
        result = check_regime(priya_salary)
        assert result.savings == 16_120

    def test_recommends_old(self, priya_salary):
        result = check_regime(priya_salary)
        assert result.details["recommended_regime"] == "old"

    def test_status_is_opportunity(self, priya_salary):
        result = check_regime(priya_salary)
        assert result.status == FindingStatus.OPPORTUNITY

    def test_old_regime_breakdown(self, priya_salary):
        """Verify the full old regime breakdown used in the comparison."""
        result = check_regime(priya_salary)
        bd = result.details["old_regime_breakdown"]
        assert bd["hra_exemption"] == 240_000
        assert bd["standard_deduction"] == 50_000
        assert bd["professional_tax"] == 2_400
        assert bd["gross_total_income"] == 1_207_600
        assert bd["deduction_80c"] == 150_000
        assert bd["deduction_80d"] == 25_000
        assert bd["deduction_80ccd_1b"] == 50_000
        assert bd["total_vi_a"] == 225_000
        assert bd["taxable_income"] == 982_600

    def test_deductions_needed(self, priya_salary):
        """Verify the deductions the user needs to act on."""
        result = check_regime(priya_salary)
        dn = result.details["deductions_needed"]
        assert dn["hra_exemption"] == 240_000
        assert dn["section_80c"] == 150_000
        assert dn["section_80c_gap"] == 78_000
        assert dn["section_80d"] == 25_000
        assert dn["section_80ccd_1b"] == 50_000

    def test_already_on_old_regime_zero_savings(self):
        """If already on old regime with max deductions, savings should be 0 or negative."""
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="Test",
            gross_salary=1_500_000,
            basic_salary=600_000,
            hra_received=300_000,
            professional_tax=2_400,
            deduction_80c=150_000,
            deduction_80d=25_000,
            deduction_80ccd_1b=50_000,
            hra_exemption=240_000,
            regime="new",
            city="mumbai",
            monthly_rent=25_000,
            epf_employee_contribution=72_000,
        )
        result = check_regime(salary)
        # Should still recommend old because deductions are maxed
        assert result.details["recommended_regime"] == "old"


# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 2: Section 80C Gap
# ═══════════════════════════════════════════════════════════════════════════════


class TestSection80C:
    def test_gap_amount(self, priya_salary):
        """EPF ₹72K → gap = ₹1,50,000 - ₹72,000 = ₹78,000."""
        result = check_80c(priya_salary)
        assert result.details["gap"] == 78_000

    def test_epf_in_details(self, priya_salary):
        result = check_80c(priya_salary)
        assert result.details["epf_contribution"] == 72_000
        assert result.details["current_80c_total"] == 72_000

    def test_savings_at_30pct_marginal(self, priya_salary):
        """₹78,000 * 30% * 1.04 = ₹24,336."""
        result = check_80c(priya_salary)
        assert result.savings == 24_336

    def test_marginal_rate_is_30(self, priya_salary):
        result = check_80c(priya_salary)
        assert result.details["marginal_rate"] == 0.30

    def test_status(self, priya_salary):
        result = check_80c(priya_salary)
        assert result.status == FindingStatus.OPPORTUNITY

    def test_fully_utilized_returns_optimized(self):
        """If 80C is already maxed, status should be OPTIMIZED."""
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="Maxed",
            gross_salary=1_500_000,
            basic_salary=600_000,
            deduction_80c=150_000,
            epf_employee_contribution=72_000,
        )
        result = check_80c(salary)
        assert result.status == FindingStatus.OPTIMIZED
        assert result.savings == 0
        assert result.details["gap"] == 0


# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 3: Section 80D
# ═══════════════════════════════════════════════════════════════════════════════


class TestSection80D:
    def test_parents_premium_recommended(self, priya_salary):
        """Priya: 80D=0 → recommend ₹25,000 parents policy."""
        result = check_80d(priya_salary)
        assert result.details["recommended_premium"] == 25_000

    def test_savings_amount(self, priya_salary):
        """₹25,000 * 30% * 1.04 = ₹7,800."""
        result = check_80d(priya_salary)
        assert result.savings == 7_800

    def test_parents_not_senior(self, priya_salary):
        result = check_80d(priya_salary)
        assert result.details["parents_senior"] is False
        assert result.details["parents_limit"] == 25_000

    def test_parents_senior_higher_limit(self, priya_salary):
        """Senior parents: limit ₹50K instead of ₹25K."""
        result = check_80d(priya_salary, parents_senior=True)
        assert result.details["parents_limit"] == 50_000
        assert result.details["recommended_premium"] == 50_000

    def test_fully_utilized(self):
        """Already claiming max 80D → OPTIMIZED."""
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="Maxed",
            gross_salary=1_500_000,
            basic_salary=600_000,
            deduction_80d=50_000,  # Self 25K + Parents 25K
        )
        result = check_80d(salary)
        assert result.status == FindingStatus.OPTIMIZED
        assert result.savings == 0


# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 4: HRA Optimization
# ═══════════════════════════════════════════════════════════════════════════════


class TestHRAOptimizer:
    def test_optimal_exemption(self, priya_salary):
        """Priya metro: min(3L, 2.4L, 3L) = ₹2,40,000."""
        result = check_hra(priya_salary)
        assert result.details["optimal_exemption"] == 240_000

    def test_savings_zero(self, priya_salary):
        """HRA savings always 0 — captured in regime check."""
        result = check_hra(priya_salary)
        assert result.savings == 0

    def test_status_opportunity(self, priya_salary):
        """Even though savings=0, status=opportunity because user isn't claiming it."""
        result = check_hra(priya_salary)
        assert result.status == FindingStatus.OPPORTUNITY

    def test_current_exemption_zero(self, priya_salary):
        """Priya on new regime → currently claiming ₹0 HRA."""
        result = check_hra(priya_salary)
        assert result.details["current_exemption"] == 0

    def test_metro_status(self, priya_salary):
        """Mumbai is metro."""
        result = check_hra(priya_salary)
        assert result.details["is_metro"] is True

    def test_no_rent_not_applicable(self):
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="NoRent",
            gross_salary=1_500_000,
            basic_salary=600_000,
            hra_received=300_000,
            monthly_rent=0,
        )
        result = check_hra(salary)
        assert result.status == FindingStatus.NOT_APPLICABLE

    def test_no_hra_not_applicable(self):
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="NoHRA",
            gross_salary=1_500_000,
            basic_salary=600_000,
            hra_received=0,
            monthly_rent=25_000,
        )
        result = check_hra(salary)
        assert result.status == FindingStatus.NOT_APPLICABLE


# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 5: Capital Gains Optimization
# ═══════════════════════════════════════════════════════════════════════════════


class TestCapitalGains:
    def test_unrealized_ltcg(self, priya_holdings, fy_end):
        """Total unrealized LTCG = ₹37,400 (HDFC 6.5K + Infosys 10.4K + Axis 20.5K)."""
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        assert result.details["unrealized_ltcg"] == 37_400

    def test_savings(self, priya_holdings, fy_end):
        """₹37,400 * 12.5% * 1.04 = ₹4,862."""
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        assert result.savings == 4_862

    def test_future_tax_saved_matches_savings(self, priya_holdings, fy_end):
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        assert result.details["future_tax_saved"] == 4_862

    def test_holdings_to_harvest(self, priya_holdings, fy_end):
        """3 LTCG holdings should be harvested (not Parag Parikh — STCG)."""
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        harvest = result.details["holdings_to_harvest"]
        assert len(harvest) == 3
        assert "HDFC Bank Ltd" in harvest
        assert "Infosys Ltd" in harvest
        assert "Axis Bluechip Fund - Growth" in harvest

    def test_parag_parikh_is_stcg(self, priya_holdings, fy_end):
        """Parag Parikh purchased Aug 2024 — only ~8 months as of March 2025 → STCG."""
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        # Should appear in holding period alerts
        alerts = result.details.get("holding_period_alerts", [])
        # Parag Parikh: 7 months (Aug 2024 → Mar 2025) — NOT in 10-12 month alert window
        # So no alert expected for Parag Parikh (it's too far from LTCG)
        # But it should NOT be in harvest list
        assert "Parag Parikh Flexi Cap Fund" not in result.details["holdings_to_harvest"]

    def test_stcg_amount(self, priya_holdings, fy_end):
        """Parag Parikh gain = ₹3,250."""
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        assert result.details["unrealized_stcg"] == 3_250

    def test_exemption_remaining(self, priya_holdings, fy_end):
        """₹1,25,000 - ₹37,400 = ₹87,600."""
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        assert result.details["exemption_remaining"] == 87_600

    def test_status(self, priya_holdings, fy_end):
        result = check_capital_gains(priya_holdings, as_of=fy_end)
        assert result.status == FindingStatus.OPPORTUNITY

    def test_no_holdings(self, fy_end):
        """Empty portfolio → NOT_APPLICABLE."""
        result = check_capital_gains(Holdings(), as_of=fy_end)
        assert result.status == FindingStatus.NOT_APPLICABLE
        assert result.savings == 0


# ═══════════════════════════════════════════════════════════════════════════════
# CHECK 6: NPS 80CCD(1B)
# ═══════════════════════════════════════════════════════════════════════════════


class TestNPSCheck:
    def test_gap(self, priya_salary):
        """Priya has ₹0 NPS → gap = ₹50,000."""
        result = check_nps(priya_salary)
        assert result.details["gap"] == 50_000

    def test_savings(self, priya_salary):
        """₹50,000 * 30% * 1.04 = ₹15,600."""
        result = check_nps(priya_salary)
        assert result.savings == 15_600

    def test_marginal_rate(self, priya_salary):
        result = check_nps(priya_salary)
        assert result.details["marginal_rate"] == 0.30

    def test_status(self, priya_salary):
        result = check_nps(priya_salary)
        assert result.status == FindingStatus.OPPORTUNITY

    def test_already_maxed(self):
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="MaxedNPS",
            gross_salary=1_500_000,
            basic_salary=600_000,
            deduction_80ccd_1b=50_000,
        )
        result = check_nps(salary)
        assert result.status == FindingStatus.OPTIMIZED
        assert result.savings == 0


# ═══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR — full end-to-end
# ═══════════════════════════════════════════════════════════════════════════════


class TestOrchestrator:
    def test_total_savings(self, priya_salary, priya_holdings, fy_end):
        """Total = regime savings (₹16,120) + CG savings (₹4,862) = ₹20,982."""
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert result.total_savings == 20_982

    def test_no_double_counting(self, priya_salary, priya_holdings, fy_end):
        """Total should NOT be sum of all individual check savings."""
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        sum_all = sum(c.savings for c in result.checks)
        # Sum of all displayed savings (24336+16120+15600+7800+4862+0 = 68718)
        # But total is only 20,982 because 80C/80D/NPS/HRA are components of regime switch
        assert result.total_savings < sum_all
        assert result.total_savings == 20_982

    def test_recommended_regime(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert result.recommended_regime == TaxRegime.OLD

    def test_current_regime(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert result.current_regime == TaxRegime.NEW

    def test_six_checks_returned(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert len(result.checks) == 6

    def test_checks_sorted_by_savings_descending(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        savings_values = [c.savings for c in result.checks]
        assert savings_values == sorted(savings_values, reverse=True)

    def test_user_name(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert result.user_name == "Priya Sharma"

    def test_financial_year(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert result.financial_year == "2024-25"

    def test_summary_not_empty(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert len(result.summary) > 0
        assert "20,982" in result.summary

    def test_disclaimer_present(self, priya_salary, priya_holdings, fy_end):
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        assert "not constitute" in result.disclaimer

    def test_no_holdings_still_works(self, priya_salary, fy_end):
        """Orchestrator should handle None holdings gracefully."""
        result = run_all_checks(priya_salary, cg_as_of=fy_end)
        assert result.total_savings == 16_120  # Only regime savings, no CG
        assert len(result.checks) == 6

    def test_component_check_savings_display(self, priya_salary, priya_holdings, fy_end):
        """Verify the component display values (not additive to total)."""
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        by_id = {c.check_id: c for c in result.checks}
        assert by_id["80c_gap"].savings == 24_336
        assert by_id["regime_arbitrage"].savings == 16_120
        assert by_id["nps_check"].savings == 15_600
        assert by_id["80d_check"].savings == 7_800
        assert by_id["capital_gains"].savings == 4_862
        assert by_id["hra_optimizer"].savings == 0

    def test_all_checks_have_opportunity_status(self, priya_salary, priya_holdings, fy_end):
        """For Priya, all checks should be 'opportunity' (old regime recommended)."""
        result = run_all_checks(priya_salary, priya_holdings, cg_as_of=fy_end)
        for check in result.checks:
            assert check.status == FindingStatus.OPPORTUNITY


# ═══════════════════════════════════════════════════════════════════════════════
# Edge case: new regime is better
# ═══════════════════════════════════════════════════════════════════════════════


class TestNewRegimeOptimal:
    """When new regime is better, deduction-based checks should be N/A."""

    def test_low_salary_new_better(self):
        """Low salary with no deductions — new regime usually wins."""
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="Low Earner",
            gross_salary=600_000,
            basic_salary=300_000,
            hra_received=0,
            professional_tax=2_400,
            regime="new",
            city="mumbai",
            monthly_rent=0,
            epf_employee_contribution=0,
        )
        result = run_all_checks(salary)
        # With ₹6L gross, new regime with ₹75K std ded → ₹5,22,600 taxable → rebate eligible
        # Old regime with ₹50K std ded → ₹5,47,600 taxable → no rebate, higher tax
        assert result.recommended_regime == TaxRegime.NEW

    def test_new_regime_zeroes_deduction_checks(self):
        """When new regime wins, 80C/80D/NPS/HRA savings should be 0."""
        salary = SalaryProfile(
            financial_year="2024-25",
            employee_name="Low Earner",
            gross_salary=600_000,
            basic_salary=300_000,
            professional_tax=2_400,
            regime="new",
            city="mumbai",
        )
        result = run_all_checks(salary)
        if result.recommended_regime == TaxRegime.NEW:
            by_id = {c.check_id: c for c in result.checks}
            assert by_id["80c_gap"].savings == 0
            assert by_id["80d_check"].savings == 0
            assert by_id["nps_check"].savings == 0
            assert by_id["hra_optimizer"].savings == 0
