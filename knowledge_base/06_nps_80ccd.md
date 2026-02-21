# NPS Deduction: Section 80CCD

## Overview
National Pension System (NPS) offers tax benefits under THREE sub-sections:
- 80CCD(1): Employee's own contribution — **shares ₹1.5L limit with 80C**
- 80CCD(1B): Additional self-contribution — **₹50,000 OVER AND ABOVE 80C limit** ← THE BIG ONE
- 80CCD(2): Employer's contribution — **separate, no cap sharing**

---

## Section 80CCD(1): Employee's Own NPS Contribution
- Limit: 10% of salary (Basic + DA) for salaried; 20% of gross income for self-employed
- **This is WITHIN the ₹1.5L combined limit of 80C + 80CCC + 80CCD(1)**
- Available ONLY under Old Tax Regime
- If someone already fills 80C via EPF + ELSS + PPF → this adds nothing

## Section 80CCD(1B): Additional NPS Contribution ← KEY FOR TAXHAWK
- **Additional deduction of up to ₹50,000**
- **OVER AND ABOVE the ₹1.5L limit of 80C**
- Available ONLY under Old Tax Regime
- Effectively increases total deduction potential from ₹1.5L to ₹2.0L
- Just requires contributing ₹50,000 to NPS Tier 1 account

### Tax Saving:
```
At 30% slab: ₹50,000 × 0.30 × 1.04 = ₹15,600
At 20% slab: ₹50,000 × 0.20 × 1.04 = ₹10,400
```

### NPS Lock-in:
- Locked until age 60 (partial withdrawal for specific purposes from 3 years)
- At maturity: 60% can be withdrawn lump-sum tax-free, 40% must buy annuity (taxable)
- This long lock-in is the trade-off for the tax benefit

## Section 80CCD(2): Employer's NPS Contribution
- Employer contributes to employee's NPS account
- **Deduction has NO upper cap sharing with 80C**
- Limit: up to 14% of salary (Basic + DA) for central govt, 10% for private sector
- **Available under BOTH old and new tax regimes** ← Important!
- This is the ONLY NPS deduction available in new regime
- Not all employers offer this — user needs to check

---

## NPS Check Logic for TaxHawk

### Step 1: Check if user has NPS
- Form 16 may show 80CCD(2) employer contribution
- If yes → employer NPS exists, check if self-contribution (80CCD(1B)) also claimed
- If no → neither employer nor self NPS exists

### Step 2: Under Old Regime — Check 80CCD(1B) opportunity
```python
if regime == "old":
    current_nps_1b = form16_80ccd_1b  # usually 0 for our target user
    gap = 50000 - current_nps_1b
    if gap > 0:
        tax_saved = gap * marginal_rate * 1.04
        recommend: "Open NPS Tier 1 and invest ₹{gap}. Tax saved: ₹{tax_saved}/year"
```

### Step 3: Under New Regime — Only check 80CCD(2)
```python
if regime == "new":
    # 80CCD(1B) not available, but 80CCD(2) is
    if employer_nps == 0:
        note: "Ask employer about NPS contribution under 80CCD(2) — deductible even in new regime"
```

---

## Key Points for Target User

### Why Young Professionals Skip NPS:
1. Don't know 80CCD(1B) exists as separate from 80C
2. Think NPS is only for government employees
3. Deterred by long lock-in (until 60)
4. Already have EPF → think it's redundant

### TaxHawk Messaging:
- Frame as: "₹50,000 investment → ₹15,600 tax saved → effective cost ₹34,400 for retirement"
- Note the lock-in honestly: "Locked until 60, but the tax saving is immediate"
- For someone on old regime who's already maxed 80C → NPS 80CCD(1B) is the NEXT best tax move
- Priority: 80C gap first, then 80D, then NPS (because NPS has longest lock-in)

### NPS vs Alternatives:
- NPS returns: ~9-12% for equity allocation (max 75% equity until age 50)
- PPF returns: ~7.1% but EEE (tax-free at maturity)
- NPS is partially taxable at withdrawal (annuity portion)
- Tax benefit now vs tax cost later → still net positive for most people in accumulation phase
