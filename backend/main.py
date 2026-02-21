"""FastAPI backend for TaxHawk.

Endpoints:
    GET  /api/demo          — Priya's pre-computed demo results
    POST /api/optimize      — Run tax engine on provided salary + holdings
    POST /api/parse-form16  — Upload PDF → extract SalaryProfile via LLM
"""

import json
import os
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.tax_engine.models import SalaryProfile, Holdings, TaxHawkResult
from backend.tax_engine.checks.orchestrator import run_all_checks
from backend.pdf_parser import extract_text_from_pdf
from backend.llm_extractor import extract_salary_profile

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="TaxHawk API",
    description="AI-powered tax optimization for Indian salaried professionals",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths to demo data ───────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEMO_SALARY_PATH = PROJECT_ROOT / "demo" / "priya_form16.json"
DEMO_HOLDINGS_PATH = PROJECT_ROOT / "demo" / "priya_holdings.json"


# ── Request schemas ───────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    salary: SalaryProfile
    holdings: Optional[Holdings] = None
    parents_senior: bool = False


class ParseForm16Response(BaseModel):
    profile: SalaryProfile
    warnings: list[str]


# ── GET /api/demo ─────────────────────────────────────────────────────────────

@app.get("/api/demo", response_model=TaxHawkResult)
def demo():
    """Return pre-computed analysis for Priya Sharma (demo persona).

    Loads demo JSON, runs the full orchestrator, returns TaxHawkResult.
    No LLM call needed — this is pure deterministic computation.
    """
    try:
        salary_data = json.loads(DEMO_SALARY_PATH.read_text())
        holdings_data = json.loads(DEMO_HOLDINGS_PATH.read_text())
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Demo data not found: {e}")

    salary = SalaryProfile(**salary_data)
    holdings = Holdings(**holdings_data)

    # Use March 31, 2025 as CG evaluation date (end of FY 2024-25)
    result = run_all_checks(
        salary=salary,
        holdings=holdings,
        parents_senior=False,
        cg_as_of=date(2025, 3, 31),
    )
    return result


# ── POST /api/optimize ────────────────────────────────────────────────────────

@app.post("/api/optimize", response_model=TaxHawkResult)
def optimize(request: OptimizeRequest):
    """Run all 6 tax optimization checks on provided salary + holdings.

    This endpoint does NOT call the LLM. It's pure deterministic tax math.
    """
    result = run_all_checks(
        salary=request.salary,
        holdings=request.holdings,
        parents_senior=request.parents_senior,
    )
    return result


# ── POST /api/parse-form16 ───────────────────────────────────────────────────

@app.post("/api/parse-form16", response_model=ParseForm16Response)
async def parse_form16(
    file: UploadFile = File(...),
    city: str = Form("other"),
    monthly_rent: float = Form(0),
    epf_employee_contribution: Optional[float] = Form(None),
):
    """Upload a Form 16 PDF and extract structured salary data.

    Pipeline: PDF → pdfplumber text extraction → Claude API → SalaryProfile.

    Query params (passed as form fields alongside the file):
        city: City for HRA calc (e.g. 'mumbai', 'bangalore')
        monthly_rent: Monthly rent paid (₹)
        epf_employee_contribution: EPF if known
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Phase 1: Extract text
    try:
        text = extract_text_from_pdf(contents)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Phase 2: LLM extraction
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY not configured on server",
        )

    try:
        result = extract_salary_profile(
            form16_text=text,
            api_key=api_key,
            city=city,
            monthly_rent=monthly_rent,
            epf_employee_contribution=epf_employee_contribution,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Extraction failed: {e}")

    return ParseForm16Response(
        profile=result["profile"],
        warnings=result["warnings"],
    )


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "taxhawk"}
