# Section 80D: Health Insurance Premium Deduction

## Overview
- **Available ONLY under Old Tax Regime** (NOT allowed under new regime)
- Separate from and ABOVE the ₹1.5L limit of Section 80C
- Covers: health insurance premiums, preventive health check-ups, medical expenses for uninsured senior citizens

---

## Deduction Limits (FY 2024-25 and FY 2025-26 — unchanged)

### Category 1: Self, Spouse & Dependent Children
| Scenario | Limit |
|----------|-------|
| Self/spouse below 60 years | ₹25,000 |
| Self/spouse is senior citizen (60+) | ₹50,000 |

### Category 2: Parents (separate additional deduction)
| Scenario | Limit |
|----------|-------|
| Parents below 60 years | ₹25,000 |
| Either parent is senior citizen (60+) | ₹50,000 |

### Maximum Possible Total
| Scenario | Self+Family | Parents | Total |
|----------|------------|---------|-------|
| All below 60 | ₹25,000 | ₹25,000 | ₹50,000 |
| Self below 60, parents 60+ | ₹25,000 | ₹50,000 | ₹75,000 |
| All 60+ | ₹50,000 | ₹50,000 | ₹1,00,000 |

### Preventive Health Check-up
- Up to ₹5,000 allowed
- **INCLUDED within** the above limits (not additional)
- Can be paid in cash (only exception — all other 80D payments must be non-cash)
- Covers: self, spouse, dependent children, parents

### Medical Expenditure for Uninsured Senior Citizens
- If a resident senior citizen (60+) parent has NO health insurance policy in force
- Actual medical expenses up to ₹50,000 can be claimed instead of premium
- Must be paid by non-cash mode
- Keep itemized receipts (prescriptions, bills, medicines, hospitalization)

---

## Eligible Expenses
- Health insurance premiums (individual or family floater policies)
- Critical illness rider premiums on life insurance policies
- Top-up health insurance premiums
- Contribution to Central Government Health Scheme (CGHS) or notified schemes
- Preventive health check-ups (₹5,000 within overall limit)
- Multi-year premium: If paid upfront for 2-3 year policy, claim proportionate amount each year

## NOT Eligible
- Premiums paid for working (financially independent) children
- Premiums paid for siblings, in-laws, or other relatives
- Premiums paid by employer for group health insurance (unless shown as taxable perquisite)
- Cash payments (except preventive check-up up to ₹5,000)
- Service tax/GST component of premium (debatable — conservative view excludes it)

---

## 80D Check Logic for TaxHawk

### Step 1: Determine what's currently claimed
From Form 16, check Chapter VI-A deductions for 80D entries.
If zero or low → opportunity exists.

### Step 2: Check self/family coverage
- Does Form 16 show any 80D deduction for self/family?
- If employer provides group health insurance that's not a taxable perquisite → no deduction possible for that portion
- But user may still have personal health insurance premium → deductible

### Step 3: Check parent opportunity (THE BIG WIN)
For target user (age 25-30):
- Parents likely age 50-65
- If parents below 60: additional ₹25,000 deduction available
- If parents 60+: additional ₹50,000 deduction available
- Many young professionals don't know they can claim parents' premium
- Even if parents have their own insurance, if the USER pays the premium, USER can claim

### Step 4: Calculate tax saving
```
additional_80d = eligible_premium_or_expense - currently_claimed
tax_saved = additional_80d × marginal_rate × 1.04
```

### Common Pattern for Target User
- Has employer group health insurance → thinks they're covered
- Parents have NO separate health insurance (or employer-provided that expired after retirement)
- Getting a ₹25K family floater for parents (non-senior): deduction ₹25K → tax saving ₹7,500 at 30% (₹7,800 with cess)
- Getting a ₹35-48K policy for senior citizen parents: deduction up to ₹50K → tax saving ₹15,000 at 30% (₹15,600 with cess)
- **Double benefit: tax deduction + actual health protection for parents**

### Key Messaging
Don't just say "claim 80D." Say:
- "A family floater for your parents costs ₹25,000/year and saves you ₹7,500 in taxes — your effective cost is only ₹17,500 for their health coverage."
- This frames it as a financial AND protective decision, not just a tax hack.
