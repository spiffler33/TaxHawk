# TaxHawk - Indian Tax Optimization Agent

## Project Overview
TaxHawk is an AI-powered tax optimization agent for Indian salaried professionals (₹10-30 LPA). Unlike ClearTax/TaxBuddy which help you FILE taxes, TaxHawk finds money you're LEAVING ON THE TABLE before you file.

The agent parses a user's Form 16 (PDF), analyzes their investment holdings, and runs 6 deterministic tax checks to find specific, actionable savings with exact ₹ amounts.

**Target demo output:** "You could save ₹82,400/year by making these 5 changes."

## Architecture Philosophy

### CRITICAL: LLM vs Deterministic Split
- **LLM does:** PDF text extraction → structured data, natural language explanations, edge case lookups from knowledge base
- **Deterministic code does:** ALL tax math. Every calculation is a pure function with known inputs/outputs.
- **NEVER** let the LLM compute tax amounts, slab rates, or deduction limits. The LLM will hallucinate ₹2L as the 80C limit or invent slab rates. All math is done by Python functions that reference the knowledge base constants.

### The 6 Agent Checks
Each check is an independent function that takes structured salary/investment data and returns:
```python
{
    "check_name": str,
    "finding": str,           # What we found
    "current_amount": float,  # What user currently pays/claims
    "optimal_amount": float,  # What they should pay/claim
    "savings": float,         # Exact ₹ saved
    "action": str,            # Specific next step
    "deadline": str,          # When they need to act
    "confidence": str,        # "definite" | "likely" | "depends"
    "explanation": str        # Plain English why
}
```

The 6 checks in priority order:
1. **Regime Arbitrage** - Compare old vs new regime with actual numbers
2. **80C Gap Analysis** - EPF + investments vs ₹1.5L limit
3. **80D Health Insurance** - Self + parents coverage opportunity
4. **HRA Optimization** - Rent claimed vs claimable
5. **Capital Gains Harvesting** - LTCG exemption + holding period optimization
6. **NPS Top-up (80CCD)** - Additional ₹50K deduction opportunity

## Tech Stack
- **Backend:** Python 3.11+, FastAPI
- **PDF Parsing:** pdfplumber for text extraction, then LLM for field extraction
- **Tax Engine:** Pure Python functions, no ML - deterministic rule engine
- **Frontend:** React (Vite), TailwindCSS
- **No database** - session-based, everything in memory for hackathon

## Project Structure
```
TaxHawk/
├── CLAUDE.md                    # This file
├── docs/
│   ├── ARCHITECTURE.md          # Detailed system design + schemas
│   └── DEMO_SCENARIO.md         # "Priya" persona + expected outputs
├── knowledge_base/
│   ├── 01_tax_slabs.md          # Old vs New regime rates
│   ├── 02_section_80c.md        # 80C eligible instruments + limits
│   ├── 03_section_80d.md        # Health insurance deduction rules
│   ├── 04_hra_rules.md          # HRA exemption calculation
│   ├── 05_capital_gains.md      # LTCG/STCG rules for equity
│   ├── 06_nps_80ccd.md          # NPS deduction rules
│   ├── 07_standard_deduction.md # Standard deduction by regime
│   └── 08_deadlines.md          # Key dates and deadlines
├── sample_data/
│   └── priya_profile.json       # Demo persona complete data
├── src/
│   ├── main.py                  # FastAPI app entry point
│   ├── parsers/
│   │   ├── form16_parser.py     # PDF → structured JSON
│   │   └── holdings_parser.py   # CSV/manual → structured holdings
│   ├── agents/
│   │   ├── orchestrator.py      # Runs all 6 checks, ranks by savings
│   │   ├── regime_comparator.py # Check 1: Old vs New regime
│   │   ├── section_80c.py       # Check 2: 80C gap analysis
│   │   ├── section_80d.py       # Check 3: Health insurance
│   │   ├── hra_optimizer.py     # Check 4: HRA optimization
│   │   ├── capital_gains.py     # Check 5: LTCG/STCG harvesting
│   │   └── nps_check.py         # Check 6: NPS 80CCD(1B)
│   └── utils/
│       ├── tax_constants.py     # All rates, limits, slabs as code constants
│       └── tax_calculator.py    # Shared calculation functions
└── frontend/                    # React app (Vite + Tailwind)
    └── ...
```

## Development Order
1. **`src/utils/tax_constants.py`** — Encode ALL knowledge base rules as Python constants/dataclasses
2. **`src/utils/tax_calculator.py`** — Shared functions: compute_tax_old(), compute_tax_new(), marginal_rate()
3. **`src/agents/regime_comparator.py`** — The highest-impact check, build first
4. **`src/agents/`** — Remaining 5 checks (each is independent, can be built in any order)
5. **`src/agents/orchestrator.py`** — Wire all checks together
6. **`src/parsers/form16_parser.py`** — PDF parsing (use pdfplumber + Claude for extraction)
7. **`src/main.py`** — FastAPI endpoints
8. **`frontend/`** — React dashboard (last, after backend works with demo data)

## Key Rules for Claude Code

### Tax Accuracy Rules
- ALWAYS reference knowledge_base/ files for rules. Don't assume any threshold or rate.
- FY 2024-25 (AY 2025-26) is the PRIMARY target year (most recent Form 16s people have)
- FY 2025-26 (AY 2026-27) rules from Budget 2025 should be noted as "upcoming" where different
- The ₹1.5L limit for 80C has not changed. Don't hallucinate a higher number.
- New regime does NOT allow 80C, 80D, HRA exemption. Only: standard deduction (₹75K), employer NPS (80CCD(2)), Agniveer (80CCH)
- Old regime standard deduction is ₹50,000 (NOT ₹75,000 — that's new regime only for FY 2024-25)
- UPDATE for FY 2025-26: Standard deduction is ₹75,000 under BOTH regimes

### Form 16 Parsing Rules
- Form 16 has Part A (TDS certificates) and Part B (income computation)
- We only care about Part B for tax optimization
- Part B structure varies by payroll provider but always contains the same statutory fields
- Use LLM extraction, NOT regex. Prompt: "Extract these specific fields as JSON from this Form 16 text"
- Validate extracted data: gross salary should be > sum of components, tax paid should be > 0

### Demo-First Development
- Build with sample_data/priya_profile.json first, not PDF parsing
- Every check should produce the EXACT numbers specified in docs/DEMO_SCENARIO.md
- Once all checks produce correct numbers with demo data, THEN build the PDF parser
- The demo is the test suite

### Frontend Rules
- "Money found" total displayed prominently (large number, green)
- Each check as a card: finding headline, ₹ saved, action required, deadline
- Expandable detail section on each card for explanation
- Upload zone for Form 16 PDF (drag & drop)
- Simple table for investment holdings input
- Mobile-friendly (many users will demo on phone)

### What NOT to Build
- No user authentication
- No database / persistence
- No actual filing capability
- No live market data feeds
- No Account Aggregator integration
- No multi-year analysis (one FY at a time)
- No Hindi/regional language support (English only for v1)

## Testing
- Run all 6 checks against Priya's profile
- Verify each ₹ amount matches DEMO_SCENARIO.md expected outputs
- Edge cases to test: zero deductions, max deductions, salary exactly at slab boundary, no investments

## Starting Prompt for Claude Code
When beginning work, start by:
1. Reading ALL files in knowledge_base/ to understand tax rules
2. Reading docs/ARCHITECTURE.md for schemas
3. Reading docs/DEMO_SCENARIO.md for expected outputs
4. Building tax_constants.py and tax_calculator.py FIRST
5. Then building each agent check and validating against demo scenario
