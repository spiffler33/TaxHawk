# Demo Scenario: Priya's Tax Optimization

## Persona
**Name:** Priya Sharma  
**Age:** 27  
**Role:** Senior Software Engineer at a mid-size product company  
**Location:** Bangalore (non-metro for HRA)  
**FY:** 2024-25 (AY 2025-26)  

### Why Priya is the perfect demo:
- Young, salaried, 4 years into career, recently promoted → salary jumped
- HR defaulted her to new tax regime — she never questioned it
- Has some stocks/MFs from tips from friends, doesn't track tax implications
- Parents in their late 50s, no health insurance (dad's employer coverage ended at retirement)
- Pays rent but employer doesn't apply HRA (because she's on new regime)
- Represents millions of ₹15-25L salaried Indians leaving money on the table

---

## Priya's Salary Structure (₹24 LPA CTC)

| Component | Annual (₹) | Notes |
|-----------|-----------|-------|
| Basic Salary | 8,00,000 | 33% of CTC |
| HRA | 4,00,000 | 50% of Basic |
| Special Allowance | 7,50,000 | Catch-all |
| LTA | 50,000 | Leave Travel Allowance |
| Performance Bonus | 3,00,000 | Annual variable |
| Other Allowances | 1,00,000 | Meal, internet, phone |
| **Gross Salary** | **24,00,000** | |
| EPF - Employee (12% of Basic) | 96,000 | Deducted from salary |
| EPF - Employer (12% of Basic) | 96,000 | Not in gross |

---

## Priya's Form 16 Data

```json
{
    "financial_year": "2024-25",
    "employee_name": "Priya Sharma",
    "pan": "ABCPS1234D",
    "employer_name": "TechVista Solutions Pvt Ltd",
    
    "gross_salary": 2400000,
    "basic_salary": 800000,
    "hra_received": 400000,
    "special_allowance": 750000,
    "lta": 50000,
    "bonus": 300000,
    "other_salary": 100000,
    
    "hra_exemption": 0,
    "lta_exemption": 0,
    "other_exemptions": 0,
    
    "standard_deduction": 75000,
    "professional_tax": 2400,
    
    "deduction_80c": 96000,
    "deduction_80ccc": 0,
    "deduction_80ccd_1": 0,
    "deduction_80ccd_1b": 0,
    "deduction_80ccd_2": 0,
    "deduction_80d": 0,
    "deduction_80e": 0,
    "deduction_80g": 0,
    "deduction_80tta": 0,
    "deduction_24b": 0,
    "other_deductions": 0,
    
    "taxable_income": 2322600,
    "total_tax_paid": 402251,
    
    "regime": "new",
    "city": "bangalore",
    "monthly_rent": 30000,
    "epf_employee_contribution": 96000
}
```

### Tax Calculation Verification (New Regime — Current)
```
Gross: ₹24,00,000
Standard deduction: -₹75,000
Professional tax: -₹2,400
Taxable income: ₹23,22,600

FY 2024-25 New Regime Slabs:
₹0 - ₹3,00,000:     0% = ₹0
₹3,00,001 - ₹7,00,000:   5% = ₹20,000
₹7,00,001 - ₹10,00,000:  10% = ₹30,000
₹10,00,001 - ₹12,00,000: 15% = ₹30,000
₹12,00,001 - ₹15,00,000: 20% = ₹60,000
₹15,00,001 - ₹23,22,600: 30% = ₹2,46,780

Tax before cess: ₹3,86,780
Cess (4%): ₹15,471
TOTAL TAX (New Regime): ₹4,02,251
```

---

## Priya's Investment Holdings

```json
{
    "holdings": [
        {
            "security_name": "HDFC Bank Ltd",
            "security_type": "equity_share",
            "purchase_date": "2023-06-15",
            "purchase_price": 1620.00,
            "quantity": 50,
            "current_price": 1750.00
        },
        {
            "security_name": "Infosys Ltd",
            "security_type": "equity_share",
            "purchase_date": "2024-01-10",
            "purchase_price": 1520.00,
            "quantity": 40,
            "current_price": 1780.00
        },
        {
            "security_name": "Axis Bluechip Fund - Growth",
            "security_type": "equity_mf",
            "purchase_date": "2023-03-20",
            "purchase_price": 42.50,
            "quantity": 2000,
            "current_price": 52.75
        },
        {
            "security_name": "Parag Parikh Flexi Cap Fund",
            "security_type": "equity_mf",
            "purchase_date": "2024-08-01",
            "purchase_price": 65.00,
            "quantity": 500,
            "current_price": 71.50
        }
    ],
    "realized_stcg_this_fy": 0,
    "realized_ltcg_this_fy": 0
}
```

### Holdings Analysis (as of March 2025):
| Security | Cost (₹) | Current (₹) | Gain (₹) | Months | Term |
|----------|----------|-------------|----------|--------|------|
| HDFC Bank (50) | 81,000 | 87,500 | 6,500 | ~21 | LTCG |
| Infosys (40) | 60,800 | 71,200 | 10,400 | ~14 | LTCG |
| Axis Bluechip (2000) | 85,000 | 1,05,500 | 20,500 | ~24 | LTCG |
| Parag Parikh (500) | 32,500 | 35,750 | 3,250 | ~8 | STCG |

**Total unrealized LTCG: ₹37,400**  
**Total unrealized STCG: ₹3,250**

---

## Expected Check Results

### CHECK 1: Regime Arbitrage ✅ OPPORTUNITY

**Old Regime Calculation (fully optimized):**
```
Gross salary: ₹24,00,000

Section 10 Exemptions:
  HRA Exemption [Section 10(13A)]:
    Option A: Actual HRA received = ₹4,00,000
    Option B: Rent paid - 10% of Basic = ₹3,60,000 - ₹80,000 = ₹2,80,000
    Option C: 40% of Basic (non-metro) = ₹3,20,000
    Exempt HRA = min(4L, 2.8L, 3.2L) = ₹2,80,000

Net salary income: ₹24,00,000 - ₹2,80,000 = ₹21,20,000
Standard deduction (old, FY 2024-25): -₹50,000
Professional tax: -₹2,400
Gross Total Income: ₹20,67,600

Chapter VI-A Deductions:
  80C: ₹1,50,000 (EPF ₹96K + ELSS ₹54K to fill gap)
  80D: ₹25,000 (parents health insurance, both below 60)
  80CCD(1B): ₹50,000 (NPS additional)
  Total VI-A: ₹2,25,000

Taxable Income: ₹20,67,600 - ₹2,25,000 = ₹18,42,600

Old Regime Slabs:
₹0 - ₹2,50,000:     0% = ₹0
₹2,50,001 - ₹5,00,000:   5% = ₹12,500
₹5,00,001 - ₹10,00,000:  20% = ₹1,00,000
₹10,00,001 - ₹18,42,600: 30% = ₹2,52,780

Tax before cess: ₹3,65,280
Cess (4%): ₹14,611
TOTAL TAX (Old Regime, optimized): ₹3,79,891
```

**Savings: ₹4,02,251 - ₹3,79,891 = ₹22,360**

```
Expected output:
{
    "check_id": "regime_arbitrage",
    "check_name": "Tax Regime Optimization",
    "status": "opportunity",
    "finding": "Switching to old regime with full deductions saves ₹22,360",
    "savings": 22360,
    "action": "File ITR under old tax regime for FY 2024-25. Invest in ELSS/PPF for 80C, get parents' health insurance for 80D, and open NPS for 80CCD(1B) before March 31",
    "deadline": "July 31, 2025 (ITR filing) — but investments needed before March 31, 2025",
    "confidence": "definite",
    "details": {
        "new_regime_tax": 402251,
        "old_regime_tax": 379891,
        "recommended_regime": "old",
        "deductions_needed": {
            "hra_exemption": 280000,
            "section_80c": 150000,
            "section_80d": 25000,
            "section_80ccd_1b": 50000
        }
    }
}
```

---

### CHECK 2: 80C Gap Analysis ✅ OPPORTUNITY

```
Current 80C usage: ₹96,000 (EPF only)
80C limit: ₹1,50,000
Gap: ₹54,000

Investment needed: ₹54,000 in ELSS (recommended — shortest lock-in, equity returns)
Tax saving at 30% marginal rate: ₹54,000 × 0.30 = ₹16,200
With cess: ₹16,200 × 1.04 = ₹16,848

Expected output:
{
    "check_id": "80c_gap",
    "check_name": "Section 80C Gap",
    "status": "opportunity",
    "finding": "₹54,000 gap in 80C limit. EPF covers ₹96K of ₹1.5L",
    "savings": 16848,
    "action": "Invest ₹54,000 in ELSS mutual fund (e.g., Mirae Asset ELSS, Axis ELSS) before March 31",
    "deadline": "March 31, 2025",
    "confidence": "definite",
    "details": {
        "epf_contribution": 96000,
        "current_80c_total": 96000,
        "limit": 150000,
        "gap": 54000,
        "marginal_rate": 0.30,
        "recommended_instrument": "ELSS (3-year lock-in, equity growth)"
    }
}
```

**Note:** This saving is a COMPONENT of the regime switch. It's already factored into the Check 1 old regime calculation. Showing it separately helps the user understand WHERE the savings come from.

---

### CHECK 3: 80D Health Insurance ✅ OPPORTUNITY

```
Current 80D claimed: ₹0
Priya has employer group health insurance (not taxable perquisite → can't claim)
Parents (both age 57-58, below 60): NO health insurance

Recommendation: Buy ₹25,000 family floater for parents
Tax saving at 30%: ₹25,000 × 0.30 × 1.04 = ₹7,800

Expected output:
{
    "check_id": "80d_check",
    "check_name": "Health Insurance (Section 80D)",
    "status": "opportunity",
    "finding": "Parents have no health insurance. ₹25,000 policy = ₹7,800 tax saving",
    "savings": 7800,
    "action": "Buy a ₹5-10L family floater health insurance for parents (annual premium ~₹20-25K). Claim under Section 80D",
    "deadline": "March 31, 2025 (for FY 2024-25 deduction)",
    "confidence": "definite",
    "details": {
        "self_family_claimed": 0,
        "self_family_limit": 25000,
        "parents_claimed": 0,
        "parents_limit": 25000,
        "parents_senior": false,
        "recommended_premium": 25000
    }
}
```

---

### CHECK 4: HRA Optimization ✅ ALREADY FACTORED INTO REGIME

```
Currently on new regime → HRA exemption = ₹0 (not available)
Under old regime:
  HRA exemption = ₹2,80,000 (calculated in Check 1)
  Tax impact: already included in regime comparison

This check exists to EXPLAIN the HRA component of the regime switch.

Expected output:
{
    "check_id": "hra_optimizer",
    "check_name": "HRA Exemption",
    "status": "opportunity",
    "finding": "Paying ₹30K/month rent but claiming ₹0 HRA (new regime). Old regime unlocks ₹2,80,000 exemption",
    "savings": 0,
    "action": "Collect rent receipts and landlord PAN. HRA benefit is captured in regime switch recommendation",
    "deadline": "Include in ITR filing by July 31, 2025",
    "confidence": "definite",
    "details": {
        "rent_annual": 360000,
        "hra_received": 400000,
        "optimal_exemption": 280000,
        "current_exemption": 0,
        "note": "Savings included in regime arbitrage check"
    }
}
```

---

### CHECK 5: Capital Gains Harvesting ✅ OPPORTUNITY (regime-independent)

```
Total unrealized LTCG: ₹37,400 (well under ₹1,25,000 exemption)

Strategy: Sell all long-term holdings, immediately repurchase
  → Realize ₹37,400 LTCG → fully exempt (under ₹1.25L)
  → Reset cost basis higher
  → Future tax saved: ₹37,400 × 12.5% × 1.04 = ₹4,862

Also note: Parag Parikh holding is 8 months old with ₹3,250 gain
  → If she needs to sell within 4 months: STCG at 20%
  → If she waits 4 more months: LTCG at 12.5% (or exempt if under limit)
  → Waiting saves: ₹3,250 × (20% - 0%) × 1.04 = ₹676

Expected output:
{
    "check_id": "capital_gains",
    "check_name": "Capital Gains Optimization",
    "status": "opportunity",
    "finding": "₹37,400 unrealized LTCG can be harvested tax-free. Saves ₹4,862 in future taxes",
    "savings": 4862,
    "action": "Before March 31: Sell HDFC Bank, Infosys, and Axis Bluechip holdings. Immediately repurchase. This resets cost basis and uses your ₹1.25L annual LTCG exemption",
    "deadline": "March 31, 2025",
    "confidence": "definite",
    "details": {
        "unrealized_ltcg": 37400,
        "ltcg_exemption_limit": 125000,
        "exemption_used": 37400,
        "exemption_remaining": 87600,
        "future_tax_saved": 4862,
        "holdings_to_harvest": ["HDFC Bank", "Infosys", "Axis Bluechip Fund"],
        "holding_period_alert": {
            "security": "Parag Parikh Flexi Cap",
            "months_held": 8,
            "months_to_ltcg": 4,
            "advice": "Wait 4 months before selling to qualify for LTCG rate"
        }
    }
}
```

---

### CHECK 6: NPS 80CCD(1B) ✅ OPPORTUNITY

```
Current NPS contribution: ₹0
80CCD(1B) allows additional ₹50,000 deduction (above 80C limit)
Only under old regime

Tax saving at 30%: ₹50,000 × 0.30 × 1.04 = ₹15,600

Expected output:
{
    "check_id": "nps_check",
    "check_name": "NPS Tax Benefit (80CCD(1B))",
    "status": "opportunity",
    "finding": "₹50,000 NPS contribution saves ₹15,600 in tax (additional to 80C)",
    "savings": 15600,
    "action": "Open NPS Tier 1 account and invest ₹50,000. This is ABOVE the ₹1.5L 80C limit",
    "deadline": "March 31, 2025",
    "confidence": "definite",
    "details": {
        "current_nps_1b": 0,
        "limit_1b": 50000,
        "gap": 50000,
        "marginal_rate": 0.30,
        "note": "Locked until age 60. Tax saving is immediate, but money is illiquid"
    }
}
```

---

## TOTAL SAVINGS SUMMARY

| Check | Savings (₹) | Type |
|-------|-------------|------|
| Regime Switch (includes 80C, 80D, HRA, NPS) | 22,360 | Regime optimization |
| Capital Gains Harvesting | 4,862 | Independent |
| **TOTAL** | **27,222** | |

### Component Breakdown of Regime Switch:
The ₹22,360 regime savings comes from these deductions becoming available:
- HRA exemption (₹2,80,000 → reduces taxable income)
- 80C gap filled (₹54,000 additional investment)
- 80D parents insurance (₹25,000 deduction)
- NPS 80CCD(1B) (₹50,000 deduction)
- Standard deduction difference (₹75K new vs ₹50K old = net -₹25K)

### Investment Required to Unlock Savings:
| Investment | Amount | Lock-in | Purpose |
|-----------|--------|---------|---------|
| ELSS Mutual Fund | ₹54,000 | 3 years | Fill 80C gap |
| Parents Health Insurance | ₹25,000 | Annual | 80D + protection |
| NPS Tier 1 | ₹50,000 | Until 60 | 80CCD(1B) |
| **Total cash outlay** | **₹1,29,000** | | |

**ROI: Invest ₹1,29,000 → Save ₹22,360 + ₹4,862 = ₹27,222/year**  
**Effective return: 21.1% guaranteed (tax saving) + investment growth**

---

## Demo Script (60 seconds)

**[0-10s]** "Meet Priya. Software engineer, Bangalore, ₹24 lakhs. Her employer put her on the new tax regime — the default. She pays ₹4 lakh in tax every year."

**[10-20s]** "She uploads her Form 16." *[drag PDF into TaxHawk]*

**[20-35s]** "TaxHawk finds ₹27,222 in savings. Her biggest win: switching to the old tax regime saves ₹22,360 because she's paying rent, her parents need health insurance, and her EPF doesn't fill her 80C limit."

**[35-50s]** "And here's something most people miss: she has ₹37,400 in stock gains that she can harvest completely tax-free before March 31. That saves ₹4,862 in future taxes."

**[50-60s]** "Every number is auditable. Every rule is cited. She invests ₹1.29 lakh and saves ₹27,222 — a 21% guaranteed return. This is money that ClearTax can't find because ClearTax helps you file. TaxHawk finds the money before you file."

---

## Validation Checklist

- [ ] New regime tax = ₹4,02,251
- [ ] Old regime tax (optimized) = ₹3,79,891
- [ ] Regime savings = ₹22,360
- [ ] HRA exemption = ₹2,80,000
- [ ] 80C gap = ₹54,000
- [ ] 80D parents = ₹25,000
- [ ] NPS 80CCD(1B) = ₹50,000
- [ ] LTCG harvestable = ₹37,400
- [ ] LTCG tax saved = ₹4,862
- [ ] Total savings = ₹27,222
- [ ] Total investment required = ₹1,29,000
