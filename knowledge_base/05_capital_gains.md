# Capital Gains Tax: Equity Shares & Mutual Funds

## Overview
Capital gains tax applies in BOTH old and new tax regimes — it's NOT a regime-dependent deduction.
Key changes from Budget 2024 (effective July 23, 2024) apply to FY 2024-25 onwards.

---

## Equity Shares (Listed on recognized stock exchange, STT paid)

### Short-Term Capital Gains (STCG) — Section 111A
- **Holding period:** ≤ 12 months
- **Tax rate:** 20% (flat, regardless of income slab)
- Changed from 15% → 20% effective July 23, 2024
- Plus 4% cess + applicable surcharge

### Long-Term Capital Gains (LTCG) — Section 112A
- **Holding period:** > 12 months
- **Tax rate:** 12.5% (flat)
- Changed from 10% → 12.5% effective July 23, 2024
- **Annual exemption:** First ₹1,25,000 of LTCG is TAX-FREE (per financial year)
- Exemption increased from ₹1,00,000 → ₹1,25,000 from July 23, 2024
- Plus 4% cess + applicable surcharge on amount above exemption
- **No indexation benefit** for listed equity

### IMPORTANT: Section 87A Rebate Does NOT Apply to LTCG
- Even if total income is below ₹12L (new regime) or ₹5L (old regime)
- LTCG under Section 112A is EXCLUDED from Section 87A rebate
- You will still pay LTCG tax even if your salary income gets full rebate

---

## Equity-Oriented Mutual Funds (≥65% equity allocation)
- Includes: Large cap, mid cap, small cap, flexi cap, ELSS, index funds, equity ETFs
- **Same tax treatment as listed equity shares**
- STCG (≤12 months): 20%
- LTCG (>12 months): 12.5% with ₹1.25L exemption

---

## Debt / Non-Equity Mutual Funds

### Purchased BEFORE April 1, 2023:
- STCG (≤24 months): Taxed at slab rate
- LTCG (>24 months): 12.5% without indexation

### Purchased ON/AFTER April 1, 2023 ("Specified Mutual Funds"):
- **ALL gains taxed as STCG at slab rate**, regardless of holding period
- No LTCG benefit for post-April-2023 debt funds
- This applies to: liquid funds, money market, corporate bond, gilt, banking & PSU, etc.

---

## Hybrid / Other Funds

### Equity ≥ 65% (Aggressive Hybrid, Balanced Advantage meeting threshold):
- Same as equity: STCG 20% (≤12m), LTCG 12.5% (>12m)

### Equity 35-65% (Balanced Hybrid, Dynamic Asset Allocation, Multi-Asset):
- STCG (≤24 months): Slab rate
- LTCG (>24 months): 12.5%

### Equity < 35% (Conservative Hybrid, Debt-heavy):
- If purchased after April 2023: always slab rate (treated as specified MF)
- If purchased before April 2023: LTCG (>24 months) at 12.5%

### Gold ETFs / International Equity FoFs:
- STCG (≤24 months): Slab rate
- LTCG (>24 months): 12.5%

---

## Capital Gains Harvesting Strategy

### LTCG Harvesting (The Big Opportunity)
**Concept:** You get ₹1,25,000 of LTCG tax-free EVERY financial year. If you don't use it, you lose it.

**Strategy:**
1. Near March 31 (end of financial year), check unrealized LTCG across all equity holdings
2. If unrealized LTCG > 0 and < ₹1,25,000 → sell and immediately repurchase
3. This "resets" your cost basis higher while paying zero tax
4. **Tax saved = 12.5% × harvested_amount × 1.04 (cess)**

**Example:**
- Bought stocks for ₹5,00,000 in January 2024
- Current value in March 2025: ₹6,25,000
- Unrealized LTCG: ₹1,25,000
- Sell on March 28 → LTCG = ₹1,25,000 → fully exempt → pay ₹0 tax
- Repurchase on March 31 at ₹6,25,000 → new cost basis = ₹6,25,000
- If you DON'T harvest and sell later at ₹8,00,000:
  - Without harvesting: LTCG = ₹3,00,000, tax on ₹1,75,000 = ₹22,750
  - With harvesting: LTCG = ₹1,75,000, tax on ₹50,000 = ₹6,500
  - **Saved: ₹16,250**

### Tax-Loss Harvesting
**Concept:** Sell loss-making positions to offset gains.

**Rules:**
- STCL can offset both STCG and LTCG
- LTCL can offset ONLY LTCG (not STCG)
- Unused losses carry forward for 8 assessment years
- Must file ITR before due date to carry forward losses

**Strategy:**
1. Identify holdings with unrealized losses
2. If you have realized STCG/LTCG in the year → sell losers to offset
3. Can repurchase if you believe in the stock (no wash sale rule in India!)
4. **India has NO wash sale rule** — you can sell and immediately repurchase, unlike US

### Holding Period Optimization
**Concept:** Check if any holdings are close to the 12-month mark.

**Strategy:**
1. If holding period is 11 months and user wants to sell → wait 1 more month
2. Tax difference: 20% (STCG) → 12.5% (LTCG) = 7.5% saving
3. On ₹1,00,000 gain: ₹7,500 saved by waiting a few weeks

---

## Capital Gains Check Logic for TaxHawk

### Input Required
For each holding:
- Security name / type (equity, equity MF, debt MF)
- Purchase date
- Purchase price (cost of acquisition)
- Current market value (or sale price if sold)
- Quantity

### Checks to Run

#### Check 5a: LTCG Harvesting Opportunity
```python
total_unrealized_ltcg = sum of (current_value - purchase_price) 
    for holdings where holding_period > 12 months AND gain > 0

if 0 < total_unrealized_ltcg <= 125000:
    # Full harvest — sell and repurchase to reset basis
    tax_saved = total_unrealized_ltcg * 0.125 * 1.04
    
if total_unrealized_ltcg > 125000:
    # Partial harvest — sell up to ₹1.25L of gains
    tax_saved = 125000 * 0.125 * 1.04  # = ₹16,250
```

#### Check 5b: Holding Period Alert
```python
for each holding:
    months_held = (today - purchase_date).months
    if 10 <= months_held <= 12 AND unrealized_gain > 0:
        flag: "Wait {12 - months_held} months to convert STCG → LTCG"
        potential_saving = unrealized_gain * (0.20 - 0.125) * 1.04
```

#### Check 5c: Tax-Loss Harvesting
```python
total_realized_gains = sum of all realized STCG + LTCG in current FY
unrealized_losses = holdings where current_value < purchase_price

if total_realized_gains > 0 AND unrealized_losses exist:
    harvestable_loss = min(total_realized_gains, sum(unrealized_losses))
    tax_saved = harvestable_loss * applicable_rate * 1.04
```

---

## Key Gotchas for TaxHawk

1. **Grandfathering for pre-2018 equity:** For shares/MF held before Jan 31, 2018, cost of acquisition is the HIGHER of actual cost or fair market value as of Jan 31, 2018. TaxHawk should note this but likely won't encounter it for target users (age 25-30).

2. **STT must be paid:** STCG 20% and LTCG 12.5% rates only apply if Securities Transaction Tax was paid at purchase. Off-market transactions get taxed differently.

3. **ELSS lock-in:** ELSS units can't be sold before 3 years. Don't flag ELSS for harvesting if within lock-in.

4. **SIP purchases:** Each SIP installment has its own purchase date and cost. Harvesting requires FIFO (First In, First Out) analysis.

5. **Dividend vs Growth:** Only capital gains (growth) are covered here. Dividends from equity MFs are taxed at slab rate as "Income from Other Sources."
