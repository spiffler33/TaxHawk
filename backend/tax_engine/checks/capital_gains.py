"""Check 5: Capital Gains Optimization.

This check is REGIME-INDEPENDENT — capital gains tax applies in both regimes.
Three sub-analyses:
  5a) LTCG Harvesting — use the ₹1.25L annual exemption
  5b) Holding Period Alerts — don't sell STCG when LTCG is weeks away
  5c) Tax-Loss Harvesting — offset gains with losses

India has NO wash sale rule — sell and repurchase same day is legal.
"""

from datetime import date
from typing import Optional

from ..models import Holdings, Holding, Finding, FindingStatus, Confidence
from ..tax_utils import LTCG_EXEMPTION, LTCG_RATE, STCG_RATE, CESS_RATE


def check_capital_gains(
    holdings: Holdings,
    as_of: Optional[date] = None,
) -> Finding:
    """Analyze capital gains optimization opportunities.

    Args:
        holdings: Portfolio of investment holdings + realized gains.
        as_of: Reference date for holding period calculation.
               Defaults to March 31 of current FY for tax planning.

    Returns:
        Finding with LTCG harvesting and holding period recommendations.
    """
    if as_of is None:
        # Default to end of current FY (March 31, 2025 for FY 2024-25)
        today = date.today()
        if today.month <= 3:
            as_of = date(today.year, 3, 31)
        else:
            as_of = date(today.year + 1, 3, 31)

    if not holdings.holdings:
        return Finding(
            check_id="capital_gains",
            check_name="Capital Gains Optimization",
            status=FindingStatus.NOT_APPLICABLE,
            finding="No investment holdings to analyze",
            savings=0,
            action="N/A",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={},
        )

    # ── 5a: LTCG Harvesting ────────────────────────────────────────────
    ltcg_holdings = []
    stcg_holdings = []
    holding_period_alerts = []

    for h in holdings.holdings:
        months = h.holding_months(as_of)
        gain = h.unrealized_gain
        is_lt = h.is_long_term(as_of)

        if is_lt and gain > 0:
            ltcg_holdings.append({
                "name": h.security_name,
                "gain": gain,
                "months": months,
                "cost": h.total_cost,
                "value": h.current_value,
            })
        elif not is_lt:
            stcg_holdings.append({
                "name": h.security_name,
                "gain": gain,
                "months": months,
                "months_to_ltcg": 13 - months if months < 13 else 0,
                "cost": h.total_cost,
                "value": h.current_value,
            })
            # Holding period alert: close to LTCG threshold
            if 10 <= months <= 12 and gain > 0:
                holding_period_alerts.append({
                    "security": h.security_name,
                    "months_held": months,
                    "months_to_ltcg": 13 - months,
                    "gain": gain,
                    "stcg_tax": round(gain * STCG_RATE * (1 + CESS_RATE)),
                    "advice": (
                        f"Wait {13 - months} month(s) before selling to "
                        f"qualify for LTCG rate (12.5% vs 20%)"
                    ),
                })

    total_unrealized_ltcg = sum(h["gain"] for h in ltcg_holdings)
    total_unrealized_stcg = sum(h["gain"] for h in stcg_holdings if h["gain"] > 0)

    # Include already realized LTCG this FY
    total_ltcg_for_year = total_unrealized_ltcg + holdings.realized_ltcg_this_fy
    exemption_remaining = max(LTCG_EXEMPTION - holdings.realized_ltcg_this_fy, 0)

    # How much can be harvested tax-free?
    harvestable_ltcg = min(total_unrealized_ltcg, exemption_remaining)
    future_tax_saved = round(harvestable_ltcg * LTCG_RATE * (1 + CESS_RATE))

    holdings_to_harvest = [h["name"] for h in ltcg_holdings if h["gain"] > 0]

    # ── 5c: Tax-Loss Harvesting ─────────────────────────────────────────
    unrealized_losses = []
    for h in holdings.holdings:
        if h.unrealized_gain < 0:
            unrealized_losses.append({
                "name": h.security_name,
                "loss": abs(h.unrealized_gain),
                "is_long_term": h.is_long_term(as_of),
            })

    # ── Build result ────────────────────────────────────────────────────
    if harvestable_ltcg <= 0 and not holding_period_alerts:
        return Finding(
            check_id="capital_gains",
            check_name="Capital Gains Optimization",
            status=FindingStatus.OPTIMIZED,
            finding="No harvestable LTCG or holding period optimizations found",
            savings=0,
            action="No action needed",
            deadline="N/A",
            confidence=Confidence.DEFINITE,
            details={
                "unrealized_ltcg": total_unrealized_ltcg,
                "unrealized_stcg": total_unrealized_stcg,
                "ltcg_exemption_limit": LTCG_EXEMPTION,
            },
        )

    # Build action text
    if holdings_to_harvest:
        harvest_names = ", ".join(holdings_to_harvest)
        action = (
            f"Before March 31: Sell {harvest_names}. "
            f"Immediately repurchase. This resets cost basis and uses "
            f"your \u20b9{LTCG_EXEMPTION / 1000:.0f}K annual LTCG exemption"
        )
    else:
        action = "Monitor holdings for LTCG harvesting opportunity"

    details = {
        "unrealized_ltcg": total_unrealized_ltcg,
        "unrealized_stcg": total_unrealized_stcg,
        "realized_ltcg_this_fy": holdings.realized_ltcg_this_fy,
        "ltcg_exemption_limit": LTCG_EXEMPTION,
        "exemption_used": harvestable_ltcg,
        "exemption_remaining": exemption_remaining - harvestable_ltcg,
        "future_tax_saved": future_tax_saved,
        "holdings_to_harvest": holdings_to_harvest,
    }

    if holding_period_alerts:
        details["holding_period_alerts"] = holding_period_alerts

    if unrealized_losses:
        details["unrealized_losses"] = unrealized_losses

    return Finding(
        check_id="capital_gains",
        check_name="Capital Gains Optimization",
        status=FindingStatus.OPPORTUNITY,
        finding=(
            f"\u20b9{total_unrealized_ltcg:,.0f} unrealized LTCG can be "
            f"harvested tax-free. Saves \u20b9{future_tax_saved:,.0f} in future taxes"
        ),
        savings=future_tax_saved,
        action=action,
        deadline="March 31 (end of financial year)",
        confidence=Confidence.DEFINITE,
        explanation=(
            f"You have \u20b9{total_unrealized_ltcg:,.0f} in unrealized long-term "
            f"capital gains, well under the \u20b9{LTCG_EXEMPTION:,.0f} annual exemption. "
            f"By selling and immediately repurchasing (legal in India \u2014 no wash sale rule), "
            f"you reset your cost basis higher and avoid 12.5% tax on these gains in the future."
        ),
        details=details,
    )
