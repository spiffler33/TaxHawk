# TaxHawk Architecture

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Form 16    │────▶│  PDF Parser  │────▶│  Tax Engine   │────▶│  Dashboard   │
│  (PDF)      │     │  (LLM-based) │     │  (6 Checks)   │     │  (React)     │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                                               │
┌─────────────┐     ┌──────────────┐           │
│  Holdings   │────▶│  CSV Parser  │───────────┘
│  (CSV/JSON) │     │              │
└─────────────┘     └──────────────┘
```

---

## Data Schemas

### SalaryData (extracted from Form 16 Part B)
```python
@dataclass
class SalaryData:
    # Identity
    financial_year: str          # "2024-25"
    employee_name: str
    pan: str
    employer_name: str
    
    # Salary Components (annual amounts in ₹)
    gross_salary: float          # Total gross salary
    basic_salary: float          # Basic pay
    hra_received: float          # House Rent Allowance received
    special_allowance: float     # Special / other allowance
    lta: float                   # Leave Travel Allowance
    bonus: float                 # Performance bonus / variable pay
    other_salary: float          # Any other components
    
    # Exemptions Claimed (Section 10)
    hra_exemption: float         # HRA exemption under 10(13A)
    lta_exemption: float         # LTA exemption under 10(5)
    other_exemptions: float      # Other Section 10 exemptions
    
    # Deductions
    standard_deduction: float    # ₹50K or ₹75K depending on year/regime
    professional_tax: float      # State professional tax (typically ₹2,400)
    
    # Chapter VI-A Deductions (what's currently claimed)
    deduction_80c: float         # 80C total (EPF + PPF + ELSS + etc.)
    deduction_80ccc: float       # Pension fund contribution
    deduction_80ccd_1: float     # Employee NPS (within 80C limit)
    deduction_80ccd_1b: float    # Additional NPS (₹50K above 80C)
    deduction_80ccd_2: float     # Employer NPS contribution
    deduction_80d: float         # Health insurance premium
    deduction_80e: float         # Education loan interest
    deduction_80g: float         # Donations
    deduction_80tta: float       # Savings account interest (up to ₹10K)
    deduction_24b: float         # Home loan interest
    other_deductions: float      # Any other Chapter VI-A
    
    # Tax Computation (from Form 16)
    taxable_income: float        # As computed by employer
    tax_payable: float           # Total tax computed
    cess: float                  # Health & education cess
    total_tax_paid: float        # TDS deducted by employer
    
    # Regime
    regime: str                  # "new" or "old" — what employer applied
    
    # Additional context (may need user input)
    city: str                    # For HRA calculation (metro/non-metro)
    monthly_rent: float          # If paying rent (not in Form 16)
    epf_employee_contribution: float  # Employee EPF (subset of 80C)
```

### HoldingsData (from CSV upload or manual entry)
```python
@dataclass
class Holding:
    security_name: str           # "HDFC Bank" or "Axis Bluechip Fund"
    security_type: str           # "equity_share" | "equity_mf" | "debt_mf" | "elss" | "other"
    purchase_date: date          # When acquired
    purchase_price: float        # Cost per unit/share
    quantity: float              # Number of units/shares
    current_price: float         # Current market price per unit/share
    
    @property
    def total_cost(self) -> float:
        return self.purchase_price * self.quantity
    
    @property
    def current_value(self) -> float:
        return self.current_price * self.quantity
    
    @property
    def unrealized_gain(self) -> float:
        return self.current_value - self.total_cost
    
    @property
    def holding_months(self) -> int:
        return months_between(self.purchase_date, today)
    
    @property
    def is_long_term(self) -> bool:
        if self.security_type in ("equity_share", "equity_mf", "elss"):
            return self.holding_months > 12
        else:
            return self.holding_months > 24

@dataclass
class HoldingsData:
    holdings: list[Holding]
    realized_stcg_this_fy: float = 0  # Already sold positions — STCG
    realized_ltcg_this_fy: float = 0  # Already sold positions — LTCG
```

### CheckResult (output from each agent check)
```python
@dataclass
class CheckResult:
    check_id: str                # "regime_arbitrage" | "80c_gap" | etc.
    check_name: str              # Human-readable name
    status: str                  # "opportunity" | "optimized" | "not_applicable"
    finding: str                 # One-line summary
    savings: float               # ₹ amount saved (0 if already optimized)
    action: str                  # What to do
    deadline: str                # When to act
    confidence: str              # "definite" | "likely" | "needs_verification"
    explanation: str             # Detailed explanation (2-3 paragraphs)
    details: dict                # Check-specific details (e.g., old vs new tax breakdown)
```

### TaxHawkReport (final output)
```python
@dataclass 
class TaxHawkReport:
    user_name: str
    financial_year: str
    current_regime: str
    recommended_regime: str
    total_savings: float          # Sum of all check savings
    checks: list[CheckResult]     # All 6 checks, sorted by savings descending
    summary: str                  # AI-generated plain English summary
    disclaimer: str               # Standard tax disclaimer
```

---

## API Endpoints

### POST /api/analyze
Upload Form 16 + optional holdings, get full analysis.

**Request:**
```json
{
    "form16_text": "string (extracted PDF text)",
    "holdings": [...],  // optional
    "monthly_rent": 25000,  // optional
    "city": "bangalore"  // optional
}
```

**Response:**
```json
{
    "report": {
        "total_savings": 82400,
        "recommended_regime": "old",
        "checks": [
            {
                "check_id": "regime_arbitrage",
                "check_name": "Tax Regime Optimization",
                "status": "opportunity",
                "finding": "Switching to old regime saves ₹41,000",
                "savings": 41000,
                "action": "File ITR under old tax regime",
                "deadline": "July 31, 2025",
                ...
            },
            ...
        ]
    }
}
```

### POST /api/parse-form16
Upload Form 16 PDF, get extracted structured data.

**Request:** multipart/form-data with PDF file
**Response:** SalaryData as JSON

### GET /api/demo
Returns pre-computed analysis for Priya demo persona.

---

## Agent Orchestrator Flow

```python
def analyze(salary_data: SalaryData, holdings: HoldingsData) -> TaxHawkReport:
    # Step 1: Run all checks independently
    checks = [
        regime_comparator.check(salary_data),      # Most impactful, runs first
        section_80c.check(salary_data),
        section_80d.check(salary_data),
        hra_optimizer.check(salary_data),
        capital_gains.check(holdings),
        nps_check.check(salary_data),
    ]
    
    # Step 2: Handle interdependencies
    # If regime_comparator says "switch to old" → 80C, 80D, HRA, NPS become relevant
    # If regime_comparator says "stay on new" → 80C, 80D, HRA, NPS savings = 0
    recommended_regime = checks[0].details.get("recommended_regime", "new")
    
    if recommended_regime == "new":
        # Zero out deduction-based savings (not available in new regime)
        for check in checks[1:5]:  # 80C, 80D, HRA, NPS
            if check.check_id != "capital_gains":  # CG applies in both regimes
                check.savings = 0
                check.status = "not_applicable"
                check.finding = f"Not applicable under new regime (but would save ₹{check.details.get('old_regime_savings', 0):,.0f} under old regime)"
    
    # Step 3: Capital gains check applies regardless of regime
    # (already computed independently)
    
    # Step 4: Calculate total and sort
    total_savings = sum(c.savings for c in checks)
    checks.sort(key=lambda c: c.savings, reverse=True)
    
    # Step 5: Generate report
    return TaxHawkReport(
        user_name=salary_data.employee_name,
        financial_year=salary_data.financial_year,
        current_regime=salary_data.regime,
        recommended_regime=recommended_regime,
        total_savings=total_savings,
        checks=checks,
        summary=generate_summary(checks, total_savings),
        disclaimer=STANDARD_DISCLAIMER
    )
```

### Interdependency Logic (CRITICAL)
The regime decision affects everything else:
1. First compute: "If user switches to old regime, what's the total tax?"
2. This INCLUDES the impact of 80C, 80D, HRA, NPS that old regime unlocks
3. Compare to: "Current tax under new regime"
4. The regime_comparator ALREADY factors in all deductions
5. Individual check savings show the COMPONENTS of the regime switch benefit
6. **Total savings is NOT the sum of all checks** — it's regime_switch_savings + capital_gains_savings
7. Show individual checks for transparency ("here's where the savings come from") but the total is the regime difference + CG optimization

---

## Form 16 Parser Strategy

### Phase 1: Text Extraction
```python
import pdfplumber

def extract_text(pdf_path: str) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text
```

### Phase 2: LLM Field Extraction
Send extracted text to Claude/GPT with this prompt:

```
You are a Form 16 (India income tax) parser. Extract the following fields from the Form 16 Part B text below. Return ONLY a JSON object with these fields. Use 0 for any field not found. All monetary values should be numbers (no commas, no ₹ symbol).

Fields to extract:
- financial_year: string
- employee_name: string  
- pan: string
- employer_name: string
- gross_salary: number
- basic_salary: number (look for "Basic" or "Basic Pay" or "Basic Salary")
- hra_received: number (look for "House Rent Allowance" or "HRA")
- special_allowance: number
- lta: number (Leave Travel Allowance)
- bonus: number (Performance Bonus / Variable Pay)
- hra_exemption: number (under Section 10 exemptions)
- standard_deduction: number
- professional_tax: number
- deduction_80c: number (total under 80C including EPF)
- deduction_80ccd_1b: number (NPS additional)
- deduction_80ccd_2: number (Employer NPS)
- deduction_80d: number
- deduction_24b: number (home loan interest)
- taxable_income: number
- total_tax_paid: number
- regime: "old" or "new" (look for "Section 115BAC" = new regime)

Form 16 Text:
{extracted_text}
```

### Phase 3: Validation
```python
def validate_salary_data(data: SalaryData) -> list[str]:
    warnings = []
    if data.gross_salary <= 0:
        warnings.append("Gross salary is 0 — parsing may have failed")
    if data.basic_salary > data.gross_salary:
        warnings.append("Basic salary exceeds gross — check parsing")
    if data.total_tax_paid <= 0:
        warnings.append("No tax paid — verify Form 16 was complete")
    if data.deduction_80c > 150000:
        warnings.append("80C exceeds ₹1.5L limit — possible parsing error")
    return warnings
```

---

## Frontend Components

### Main Dashboard Layout
```
┌──────────────────────────────────────────┐
│  🦅 TaxHawk                              │
│  "Find money your employer missed"       │
├──────────────────────────────────────────┤
│                                          │
│  [ Upload Form 16 PDF ]  [ Use Demo ]   │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  💰 Total Savings Found          │   │
│  │       ₹82,400/year              │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Regime  │ │  80C    │ │  80D    │   │
│  │ ₹41,000 │ │ ₹23,400 │ │ ₹7,500  │   │
│  │ Switch  │ │ Invest  │ │ Insure  │   │
│  │ to Old  │ │ in ELSS │ │ Parents │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐               │
│  │  LTCG   │ │  NPS    │               │
│  │ ₹10,500 │ │ ₹0      │               │
│  │ Harvest │ │ Consider│               │
│  └─────────┘ └─────────┘               │
│                                          │
│  [ Download Report ]                     │
└──────────────────────────────────────────┘
```

### Each Check Card (Expanded)
```
┌──────────────────────────────────────┐
│  🔄 Tax Regime Optimization          │
│  Savings: ₹41,000/year      [HIGH]  │
├──────────────────────────────────────┤
│  You're on the new tax regime        │
│  (employer default). Switching to    │
│  old regime saves ₹41,000 because    │
│  you can claim HRA + 80C + 80D.     │
│                                      │
│  Old regime tax:  ₹1,23,500         │
│  New regime tax:  ₹1,64,500         │
│  Difference:      ₹41,000           │
│                                      │
│  Action: File ITR under old regime   │
│  Deadline: July 31, 2025            │
│                                      │
│  [Show detailed calculation ▼]       │
└──────────────────────────────────────┘
```
