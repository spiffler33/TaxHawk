# HRA Exemption: Section 10(13A)

## Overview
- House Rent Allowance (HRA) exemption reduces taxable salary income
- **Available ONLY under Old Tax Regime**
- NOT a Chapter VI-A deduction — it's a Section 10 exemption (applied before calculating gross total income)
- Only available to salaried employees who receive HRA as part of salary AND pay rent

---

## HRA Exemption Calculation Formula

The exempt HRA is the **MINIMUM** of these three amounts:

1. **Actual HRA received** from employer (as per salary slip/Form 16)
2. **Rent paid minus 10% of Basic Salary** = Annual rent paid - (0.10 × Basic annual salary)
3. **50% or 40% of Basic Salary:**
   - 50% of Basic if living in **metro city** (Mumbai, Delhi, Kolkata, Chennai)
   - 40% of Basic if living in **non-metro city** (Bangalore, Hyderabad, Pune, all others)

> **IMPORTANT:** Bangalore/Bengaluru is classified as NON-METRO for HRA purposes. This is a common mistake. Only Mumbai, Delhi (NCR doesn't count — only Delhi), Kolkata, and Chennai qualify as metro.

### Formula in Code:
```python
def calculate_hra_exemption(basic_annual, hra_received_annual, rent_paid_annual, is_metro):
    """Returns the exempt portion of HRA under Section 10(13A)"""
    option_1 = hra_received_annual
    option_2 = rent_paid_annual - (0.10 * basic_annual)
    option_3 = (0.50 if is_metro else 0.40) * basic_annual
    
    exemption = min(option_1, option_2, option_3)
    return max(exemption, 0)  # Cannot be negative
```

---

## HRA Optimization Check Logic

### Step 1: Extract from Form 16
- Basic Salary (annual)
- HRA Received (annual) — shown in salary breakup
- HRA Exemption claimed (under Section 10 exemptions)
- City of employment

### Step 2: Ask user for rent details
- Monthly rent paid
- City of residence (metro vs non-metro)
- Do they have rent receipts? (needed if rent > ₹1L/year)
- Landlord PAN (needed if rent > ₹1L/year)

### Step 3: Calculate optimal exemption
```python
optimal_exemption = calculate_hra_exemption(basic, hra_received, rent_paid * 12, is_metro)
current_exemption = form16_hra_exemption  # from Form 16

additional_savings = (optimal_exemption - current_exemption) * marginal_rate * 1.04
```

### Step 4: Identify gap reasons
Common scenarios where HRA is under-claimed:
1. **Living with parents, paying rent to them:** You CAN claim HRA if you pay rent to parents (even if they own the house). Parents must show rental income in their return. This is legal and common.
2. **Didn't submit rent receipts to employer:** Many people miss the deadline for investment declaration and employer doesn't apply HRA exemption → can still claim in ITR
3. **Claimed for wrong city classification:** Bangalore residents sometimes claim 50% (metro) when it should be 40% (non-metro) — but the reverse also happens
4. **Part-year HRA:** If employment started mid-year, HRA is pro-rated

---

## Detailed Example

**Priya: SE in Bangalore, ₹18 LPA CTC**
- Basic: ₹6,00,000/year
- HRA received: ₹3,00,000/year
- Rent paid: ₹25,000/month = ₹3,00,000/year
- Bangalore = non-metro

Calculation:
1. Actual HRA received = ₹3,00,000
2. Rent - 10% of Basic = ₹3,00,000 - ₹60,000 = ₹2,40,000
3. 40% of Basic (non-metro) = ₹2,40,000

**Minimum = ₹2,40,000**

If she's on new regime → NO HRA exemption (₹0 saved)
If she switches to old regime → ₹2,40,000 exemption → reduces taxable income by ₹2,40,000

This is factored into the regime comparison. The HRA check identifies:
- Is she claiming HRA at all?
- Is she claiming the optimal amount?
- Could she claim more by proper documentation?

---

## Key Rules & Edge Cases

### Rent Receipts
- Required if total rent > ₹1,00,000/year (₹8,333+/month)
- Must contain: landlord name, address, rent amount, period, signature
- Landlord PAN required if rent > ₹1,00,000/year
- Keep receipts — may be asked during assessment

### Rent to Parents
- Legally valid way to claim HRA
- Parent should declare rental income (but may fall under basic exemption limit)
- Proper rent agreement recommended
- Actual fund transfer preferred (bank proof)

### No HRA Component in Salary
- If salary doesn't include HRA, can claim deduction under Section 80GG instead
- Section 80GG limit: ₹5,000/month (₹60,000/year) — much less generous
- Available under old regime only

### Own Property + Paying Rent
- If you own a house in one city but live/work in another and pay rent → CAN claim HRA
- Both HRA exemption AND home loan interest (Section 24b) can be claimed simultaneously
- The owned property is treated as let-out or deemed let-out

### Shared Accommodation
- If sharing flat, each person can claim HRA based on their share of rent
- Need separate rent receipts or clear documentation of share

---

## HRA Impact on Regime Decision
HRA is often the SINGLE BIGGEST factor in whether old regime beats new regime.
- For someone paying ₹20-30K/month rent in a metro/non-metro with basic of ₹5-8L:
  - HRA exemption alone can be ₹1.5-3L
  - Combined with 80C (₹1.5L) + 80D (₹25-75K) → easily crosses breakeven
- **TaxHawk should ALWAYS factor HRA into regime comparison, not check it in isolation**
