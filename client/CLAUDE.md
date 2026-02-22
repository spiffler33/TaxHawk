# TaxHawk Client — Fully Client-Side Tax Optimization Agent

## What This Is

TaxHawk finds tax savings for Indian salaried professionals in 30 seconds. No documents, no uploads, no sign-up. 8 questions on your phone → personalized action plan with exact ₹ amounts, deadlines, and calendar reminders.

Everything runs in the browser. Financial data never leaves the user's device.

## How It Works

```
8 quick questions (CTC, rent, city, insurance, investments)
        ↓
CTC Estimator → derives salary structure from CTC
        ↓
Tax Engine (JS) → 6 deterministic optimization checks
        ↓
Results Dashboard → findings with actions, deadlines, calendar, share
```

No PDFs. No server calls. No API costs. Works on any phone with a browser.

## Architecture

### Input: 8+2 Questions → CTC Estimator
Users answer 8 questions about salary/deductions + 2 optional questions about investments. The CTC Estimator converts these into a full SalaryProfile using industry-standard salary structure ratios (40% basic, 20% HRA, 12% EPF, etc.).

This is approximate (within ₹2-5K of exact) but sufficient for the "find your savings" moment. Precision is available as an optional later step.

### Processing: Tax Engine (JS port)
The 6 optimization checks from the Python reference implementation, ported to JavaScript:
- regimeComparator — old vs new regime with full optimization
- eightyCGap — unused 80C room beyond EPF
- eightyDCheck — health insurance opportunity (self + parents)
- hraOptimizer — HRA exemption from rent
- ltcgScanner — capital gains harvesting within ₹1.25L exemption
- npsCheck — 80CCD(1B) NPS deduction

Plus a new check added for client:
- homeLoanCheck — Section 24b interest deduction (up to ₹2L)

### Output: Results + Actions + Calendar + Share
Each finding includes: what to do, how much it saves, deadline, where to do it (Groww, PolicyBazaar, etc.), and a calendar reminder button.

## Critical Design Principles

### 1. ZERO financial data leaves the browser
No salary, no PAN, no deduction amounts hit any server. The privacy badge "🔒 Your data never leaves your phone" is a core feature, not a footnote.

### 2. Tax math is deterministic — no LLM
All calculations use the same deterministic functions as the Python reference. The JS engine must produce identical results to the Python test suite. Key verified numbers (Priya demo): ₹20,982 total savings.

### 3. Questions replace documents
The CTC-based estimator replaces Form 16 parsing entirely. The user knows their CTC, rent, and insurance status — they don't need to find a PDF. For investments, a rough range ("Under ₹50K / ₹50K-₹1.25L / Over ₹1.25L") replaces individual holdings data.

### 4. Mobile-first, always
80%+ of users arrive via WhatsApp link on their phone. Every interaction must work on a 375px screen. One question per screen. Big tap targets. Numeric keyboard on number inputs.

### 5. Prescription, not calculation
Online calculators show "old regime saves ₹16K." TaxHawk tells you: invest ₹78K in ELSS on Groww before March 31 → save ₹16K. The action links and calendar reminders are the product differentiation.

## Tech Stack

- **Framework**: React + Vite
- **Styling**: Tailwind CSS (mobile-first utilities)
- **Calendar**: Manual .ics generation + Google Calendar URL
- **Share**: Web Share API with clipboard fallback
- **Hosting**: GitHub Pages (static, free, HTTPS)
- **No backend. No database. No API keys.**

## Reference Implementation

The Python backend at repo root is the source of truth:
- `backend/tax_engine/` — reference calculations
- `tests/` — 107 tests defining correct behavior
- `demo/priya_form16.json` + `demo/priya_holdings.json` — golden demo data

Key numbers (must match):
- Priya new regime tax: ₹1,29,501
- Priya old regime optimized: ₹1,13,381
- Total savings: ₹20,982

## Project Structure

```
client/
├── CLAUDE.md
├── BUILD_PLAN.md
├── STARTER_PROMPT.md
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── engine/                    # Tax engine (ported from Python) ✅ DONE
│   │   ├── models.js
│   │   ├── taxUtils.js
│   │   ├── ctcEstimator.js        # NEW: CTC → SalaryProfile
│   │   ├── ltcgEstimator.js       # NEW: range → Holdings
│   │   ├── checks/
│   │   │   ├── regimeComparator.js
│   │   │   ├── eightyCGap.js
│   │   │   ├── eightyDCheck.js
│   │   │   ├── hraOptimizer.js
│   │   │   ├── ltcgScanner.js
│   │   │   ├── npsCheck.js
│   │   │   └── orchestrator.js
│   │   └── __tests__/
│   ├── components/
│   │   ├── Landing.jsx
│   │   ├── QuestionFlow.jsx       # Wizard controller
│   │   ├── questions/             # One component per question screen
│   │   │   ├── CTCQuestion.jsx
│   │   │   ├── RentQuestion.jsx
│   │   │   ├── CityQuestion.jsx
│   │   │   ├── HomeLoanQuestion.jsx
│   │   │   ├── HealthInsuranceQuestion.jsx
│   │   │   ├── ParentsAgeQuestion.jsx
│   │   │   ├── Existing80CQuestion.jsx
│   │   │   ├── NPSQuestion.jsx
│   │   │   ├── InvestmentQuestion.jsx
│   │   │   └── LTCGRangeQuestion.jsx
│   │   ├── ResultsDashboard.jsx
│   │   ├── FindingCard.jsx
│   │   ├── CalendarReminder.jsx
│   │   ├── ShareButton.jsx
│   │   └── PrivacyBadge.jsx
│   ├── utils/
│   │   ├── calendarGenerator.js
│   │   └── shareFormatter.js
│   └── data/
│       ├── demoProfile.js
│       └── demoHoldings.js
└── public/
    └── og-image.png               # WhatsApp preview card
```

## Key Gotchas

- CTC ≠ gross salary. CTC includes employer EPF + gratuity. Gross ≈ CTC × 0.83
- Basic salary ratio varies (35-50% of CTC). Using 40% as default. Good enough for estimates.
- Bangalore: legally non-metro for HRA, practically treated as metro. Default to metro.
- The investment questions (Q9-Q10) appear AFTER initial results, not in the main flow
- navigator.share() requires HTTPS (GitHub Pages provides) and a user gesture
- The ₹1.25L LTCG exemption is cumulative per FY across all equity sales
- Home loan interest (Section 24b) only applies under old regime, up to ₹2,00,000
