# TaxHawk Build Plan

## Phase 1: Data Models + Demo Persona + Tax Utils
**Goal**: Foundation layer. No API, no frontend. Just data structures and math.

### Tasks
1. Create `backend/tax_engine/__init__.py`
2. Create `backend/tax_engine/models.py` — Pydantic models:
   - `SalaryProfile` (see ARCHITECTURE.md for full schema)
   - `Holding`, `Holdings` 
   - `Finding`
   - `TaxHawkResult`
3. Create `backend/tax_engine/tax_utils.py` — helper functions:
   - `calculate_old_regime_tax(taxable_income) -> float` (using old regime slabs from knowledge_base/regime_rules.md)
   - `calculate_new_regime_tax(taxable_income) -> float` (using new regime slabs)
   - `apply_cess(tax) -> float` (4% Health & Education Cess)
   - `apply_87a_rebate(tax, taxable_income, regime) -> float`
   - `get_marginal_rate(taxable_income, regime) -> float`
4. Create `demo/priya_form16.json` — Priya's SalaryProfile (exact values in DEMO_SCENARIO.md)
5. Create `demo/priya_holdings.json` — Priya's stock/MF holdings (exact values in DEMO_SCENARIO.md)
6. Write quick sanity test: load Priya JSON, calculate her new regime tax, should be ~₹1,29,501

### Done when
- All models importable
- `calculate_new_regime_tax` on Priya's taxable ₹14,22,600 returns ₹1,29,501 ✅
- `calculate_old_regime_tax` on ₹9,82,600 returns ₹1,13,381 ✅
- Old regime std deduction for FY 2024-25 is ₹50,000 (not ₹75K — that's FY 2025-26)

---

## Phase 2: Six Agent Functions
**Goal**: Each optimization check as a standalone function. Deterministic math — NO LLM calls.

### Tasks
7. `backend/tax_engine/regime_comparator.py`
   - Takes SalaryProfile, calculates FULLY OPTIMIZED old regime vs current new regime
   - "Fully optimized" = max 80C (₹1.5L), max 80D, max NPS, optimal HRA
   - Returns Finding with savings amount
   
8. `backend/tax_engine/eighty_c_gap.py`
   - gap = 150000 - epf_contribution - other 80C investments
   - tax_saved = gap × marginal_rate
   
9. `backend/tax_engine/eighty_d_check.py`
   - Check self + parent health insurance opportunity
   - Limits from knowledge_base/section_80d.md
   
10. `backend/tax_engine/hra_optimizer.py`
    - Three-way minimum formula from knowledge_base/hra_rules.md
    - Compare optimal vs currently claimed
    
11. `backend/tax_engine/ltcg_scanner.py`
    - Takes Holdings, calculates harvestable LTCG within ₹1.25L exemption
    - Independent of regime choice
    
12. `backend/tax_engine/nps_check.py`
    - 80CCD(1B) gap = 50000 - current NPS contribution
    - tax_saved = gap × marginal_rate

13. `backend/tax_engine/orchestrator.py`
    - Runs all 6 checks
    - CRITICAL: Don't double-count. HRA saving is PART of regime_comparator result.
      HRA finding should have amount_saveable=0 with note "included in regime switch"
    - Rank findings by amount_saveable descending
    - Calculate correct total (regime_arbitrage + ltcg_harvest only, others are components)

### Key Rules
- ALL tax math is deterministic Python. Never call an LLM for calculations.
- Reference knowledge_base/ files for every threshold, rate, formula.
- Every function returns a Finding (schema in models.py)

### Done when
- Orchestrator on Priya's profile produces findings within ₹500 of targets
- Regime switch savings: ~₹16,120
- LTCG harvest savings: ~₹5,313
- Total savings: ~₹21,433

---

## Phase 3: Tests
**Goal**: Lock in correctness before building the API layer.

### Tasks
14. Create `tests/test_tax_utils.py` — test slab calculations, cess, rebate
15. Create `tests/test_demo_scenario.py` — end-to-end: load Priya JSON → orchestrator → assert findings
16. Run all tests green

### Done when
- All tests pass
- Priya's regime switch saves ~₹16,120
- LTCG harvest saves ~₹5,313
- Total ~₹21,433

---

## Phase 4: PDF Parser + LLM Extractor
**Goal**: Parse real Form 16 PDFs into SalaryProfile.

### Tasks
17. `pip install pdfplumber anthropic`
18. `backend/pdf_parser.py` — extract raw text from PDF using pdfplumber
19. `backend/llm_extractor.py`:
    - Send extracted text to Claude API with structured extraction prompt
    - Prompt template is in knowledge_base/form16_structure.md
    - Return validated SalaryProfile
    - Add validation: gross ≈ basic+hra+special, regime detection consistency
20. `backend/__init__.py`

### Done when
- Can upload a Form 16 PDF and get back a clean SalaryProfile JSON
- For demo: create a simple test Form 16 text and verify extraction

---

## Phase 5: FastAPI Backend
**Goal**: HTTP API serving the agent.

### Tasks
21. `pip install fastapi uvicorn python-multipart`
22. `backend/main.py` with endpoints:
    - `POST /api/parse-form16` — upload PDF, return SalaryProfile
    - `POST /api/optimize` — SalaryProfile + Holdings → TaxHawkResult  
    - `GET /api/demo` — return Priya's pre-computed results
23. Add CORS middleware (allow localhost:3000/5173)
24. Create `backend/requirements.txt`

### Done when
- `GET /api/demo` returns Priya's findings
- `POST /api/optimize` with Priya's JSON returns correct results
- Can test with curl

---

## Phase 6: React Frontend
**Goal**: Clean dashboard UI.

### Tasks
25. Init React app (vite or create-react-app)
26. Components:
    - `UploadZone` — drag-drop PDF upload
    - `HoldingsInput` — simple table for stocks/MFs (optional)
    - `ResultsDashboard` — hero "Total Money Found" number + finding cards
    - `FindingCard` — title, amount, action, deadline, expandable explanation
27. "Try Demo" button that hits GET /api/demo
28. Wire up upload → parse → optimize → display flow
29. Clean, modern fintech aesthetic. Dark header, white cards, green for savings amounts.

### Done when
- Click "Try Demo" → see Priya's ~₹21,433 in savings with all finding cards
- Upload PDF → see personalized results
