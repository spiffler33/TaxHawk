"""LLM-based structured extraction from Form 16 text.

Phase 2 of the parsing pipeline:
    raw text → Claude API → validated SalaryProfile

The LLM does the "understanding" (mapping messy text to fields).
ALL tax math stays in Python.
"""

import json
import os
from typing import Optional

import anthropic

from backend.tax_engine.models import SalaryProfile

# ── Extraction prompt (based on ARCHITECTURE.md template) ───────────────────

EXTRACTION_PROMPT = """You are a Form 16 (India income tax) parser. Extract the following fields from the Form 16 Part B text below. Return ONLY a valid JSON object with these fields. Use 0 for any field not found. All monetary values should be numbers (no commas, no ₹ symbol).

Fields to extract:
- financial_year: string (e.g. "2024-25")
- employee_name: string
- pan: string
- employer_name: string
- gross_salary: number (total gross salary under Section 17(1)+17(2)+17(3))
- basic_salary: number (look for "Basic" or "Basic Pay" or "Basic Salary")
- hra_received: number (look for "House Rent Allowance" or "HRA")
- special_allowance: number (any special / other allowances)
- lta: number (Leave Travel Allowance / Concession)
- bonus: number (Performance Bonus / Variable Pay)
- other_salary: number (any other components not captured above)
- hra_exemption: number (HRA exemption under Section 10(13A))
- lta_exemption: number (LTA exemption under Section 10(5))
- other_exemptions: number (other Section 10 exemptions)
- standard_deduction: number (under Section 16(ia))
- professional_tax: number (under Section 16(iii))
- deduction_80c: number (total under 80C including EPF, PPF, ELSS, LIC)
- deduction_80ccc: number (pension fund contribution)
- deduction_80ccd_1: number (employee NPS within 80C limit)
- deduction_80ccd_1b: number (additional NPS, separate ₹50K limit)
- deduction_80ccd_2: number (employer NPS contribution)
- deduction_80d: number (health insurance premium)
- deduction_80e: number (education loan interest)
- deduction_80g: number (donations)
- deduction_80tta: number (savings account interest up to ₹10K)
- deduction_24b: number (home loan interest under Section 24(b))
- other_deductions: number (any other Chapter VI-A deductions)
- taxable_income: number (total taxable income as computed)
- tax_payable: number (tax on total income)
- cess: number (health & education cess)
- total_tax_paid: number (total TDS deducted)
- regime: "old" or "new" (if "Section 115BAC" or "new tax regime" mentioned → "new", otherwise → "old")

IMPORTANT:
- gross_salary is the sum of all salary components (Section 17(1) + 17(2) + 17(3))
- If you see "Income chargeable under head salaries" it may be AFTER exemptions
- Return ONLY the JSON object. No explanation, no markdown fences.

Form 16 Text:
{extracted_text}"""


def extract_salary_profile(
    form16_text: str,
    api_key: Optional[str] = None,
    city: str = "other",
    monthly_rent: float = 0,
    epf_employee_contribution: Optional[float] = None,
) -> dict:
    """Extract structured salary data from Form 16 text using Claude API.

    Args:
        form16_text: Raw text extracted from Form 16 PDF.
        api_key: Anthropic API key. Falls back to ANTHROPIC_API_KEY env var.
        city: City for HRA calculation (not in Form 16, user-provided).
        monthly_rent: Monthly rent paid (not in Form 16, user-provided).
        epf_employee_contribution: EPF amount if known; otherwise inferred from 80C.

    Returns:
        Dict with 'profile' (SalaryProfile) and 'warnings' (list[str]).
    """
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise ValueError(
            "Anthropic API key required. Set ANTHROPIC_API_KEY env var or pass api_key."
        )

    client = anthropic.Anthropic(api_key=key)

    prompt = EXTRACTION_PROMPT.format(extracted_text=form16_text)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_json = message.content[0].text.strip()

    # Strip markdown fences if the LLM wraps the JSON
    if raw_json.startswith("```"):
        lines = raw_json.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw_json = "\n".join(lines)

    data = json.loads(raw_json)

    # Inject user-provided context fields (not in Form 16)
    data["city"] = city
    data["monthly_rent"] = monthly_rent
    if epf_employee_contribution is not None:
        data["epf_employee_contribution"] = epf_employee_contribution

    # Build and validate SalaryProfile
    profile = SalaryProfile(**data)
    warnings = validate_extraction(profile)

    return {"profile": profile, "warnings": warnings}


def validate_extraction(profile: SalaryProfile) -> list[str]:
    """Validate extracted data for common parsing errors.

    Returns a list of warning strings (empty = looks good).
    """
    warnings = []

    if profile.gross_salary <= 0:
        warnings.append("Gross salary is 0 — parsing may have failed")

    if profile.basic_salary > profile.gross_salary:
        warnings.append("Basic salary exceeds gross — check parsing")

    if profile.total_tax_paid <= 0:
        warnings.append("No tax paid recorded — verify Form 16 was complete")

    if profile.deduction_80c > 150_000:
        warnings.append(
            f"80C deduction is ₹{profile.deduction_80c:,.0f} (exceeds ₹1.5L limit) — possible parsing error"
        )

    if profile.standard_deduction > 75_000:
        warnings.append(
            f"Standard deduction is ₹{profile.standard_deduction:,.0f} (max is ₹75K) — check value"
        )

    # Sanity: gross should be >= basic + HRA
    component_sum = profile.basic_salary + profile.hra_received
    if component_sum > profile.gross_salary * 1.05:  # 5% tolerance
        warnings.append(
            f"Basic + HRA (₹{component_sum:,.0f}) exceeds gross (₹{profile.gross_salary:,.0f}) — check parsing"
        )

    return warnings
