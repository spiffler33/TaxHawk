# Senior Citizen Tax Benefits (Age 60+)

## Overview
Indian tax law provides additional benefits to senior citizens (60-79 years) and super senior citizens (80+ years). These apply under the **Old Tax Regime only** unless noted.

---

## 1. Higher Basic Exemption (Old Regime Only)

See `01_tax_slabs.md` for full slab tables.

| Category | Nil-rate bracket | Saving vs below-60 |
|----------|-----------------|---------------------|
| Below 60 | Up to ₹2,50,000 | — |
| Senior (60-79) | Up to ₹3,00,000 | ₹2,500 (5% × ₹50K) |
| Super Senior (80+) | Up to ₹5,00,000 | ₹12,500 (5%×₹2.5L + eliminated 5% slab) |

**New regime:** Same slabs for all ages. No senior benefit.

---

## 2. Higher 80D Limits

See `03_section_80d.md` for detailed rules.

| Scenario | Self/Family | Parents | Total |
|----------|------------|---------|-------|
| All below 60 | ₹25,000 | ₹25,000 | ₹50,000 |
| Self below 60, parents 60+ | ₹25,000 | ₹50,000 | ₹75,000 |
| Self 60+, parents below 60 | ₹50,000 | ₹25,000 | ₹75,000 |
| All 60+ | ₹50,000 | ₹50,000 | ₹1,00,000 |

Additionally, **uninsured senior citizens** can claim actual medical expenditure up to ₹50,000 (instead of insurance premium).

---

## 3. Section 80TTB: Interest Income Deduction (₹50,000)

### Who can claim
- Resident individuals aged 60+ (senior and super senior citizens)
- **Old regime only** (not available under new regime)

### What's covered
- Interest from bank savings accounts
- Interest from bank fixed deposits (FDs)
- Interest from bank recurring deposits (RDs)
- Interest from post office deposits and savings schemes
- Interest from co-operative bank deposits

### What's NOT covered
- Company/corporate fixed deposits
- Non-convertible debentures (NCDs)
- Bonds (other than government savings bonds under specific schemes)
- Interest from loans given to individuals

### Limits
- Maximum deduction: **₹50,000** per financial year
- Replaces Section 80TTA (₹10,000 for non-seniors) — cannot claim both

### Tax saving at marginal rates
| Marginal Rate | Tax Saved (on full ₹50K) |
|--------------|-------------------------|
| 5% | ₹2,600 (with cess) |
| 20% | ₹10,400 (with cess) |
| 30% | ₹15,600 (with cess) |

### Why this matters
Many retired seniors live on FD interest income. Without 80TTB, this interest is fully taxable. A senior with ₹8-10L in FDs earning 7% = ~₹60-70K interest/year. The ₹50K deduction under 80TTB saves real money.

### TaxHawk check logic
```
If taxpayer is 60+:
    interest_income = bank_fd_interest + savings_interest + rd_interest + post_office_interest
    current_80ttb_claimed = salary.deduction_80tta  (shares the field in Form 16)
    additional_80ttb = min(50000, interest_income) - current_80ttb_claimed
    tax_saved = additional_80ttb × marginal_rate × 1.04
```

---

## 4. Section 80TTA vs 80TTB Comparison

| Feature | 80TTA (Below 60) | 80TTB (60+) |
|---------|------------------|-------------|
| Limit | ₹10,000 | ₹50,000 |
| Covers | Savings account interest only | All bank/PO deposit interest |
| FD interest | NOT covered | Covered |
| Regime | Old only | Old only |
| Cannot combine | With 80TTB | With 80TTA |

---

## 5. No Advance Tax Requirement (Section 207)

- Resident senior citizens (60+) with **no business/professional income** are exempt from advance tax
- Applies to pension, salary, interest, rental, capital gains income
- Simplifies cash flow — can pay full tax at filing time
- **Not a deduction** — just a compliance convenience

---

## 6. Senior Citizens Savings Scheme (SCSS) — Enhanced 80C Instrument

- Available only to individuals 60+ (or 55+ for retired defence/VRS)
- Deposit limit: ₹30 lakh (increased from ₹15L in Budget 2023)
- Tenure: 5 years (extendable by 3 years)
- Interest rate: ~8.2% (government-set, revised quarterly)
- Interest paid quarterly (taxable as income)
- Full deposit counts toward ₹1.5L Section 80C limit
- **Best risk-free return** for seniors among 80C instruments

---

## TaxHawk Implementation Notes

### What to add for senior citizen users
1. **Ask if user is 60+** (or 80+) early in the flow
2. **Use age-appropriate old regime slabs** in regime comparison
3. **Use ₹50K self-limit for 80D** instead of ₹25K
4. **80TTB is a stretch goal** — requires knowing interest income, which isn't in the current 8-question flow

### What NOT to build (v1)
- Pension-specific income breakdowns (treat pension as salary)
- Multiple FD interest aggregation
- Senior-specific investment recommendations beyond SCSS mention
