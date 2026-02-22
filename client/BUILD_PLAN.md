# TaxHawk Client — Build Plan

## Core UX Principle

No documents. No uploads. No parsing. Just questions.

8 questions about salary/deductions + 2 optional questions about investments. All tappable on a phone. Under 60 seconds. Value first, precision later.

```
LAYER 1 (default): 8+2 questions → CTC-based estimates → results + actions + calendar
LAYER 2 (optional): "Want exact numbers?" → manual entry of Form 16 fields → refined results  
LAYER 3 (future): Form 16 upload → server-side LLM extraction → precise results
```

Layer 1 is the product. Layers 2-3 are power-user features added later.

---

## Phase 1: JS Tax Engine Port ✅ DONE
- 104/104 tests passing
- Priya numbers verified: ₹20,982 total savings

---

## Phase 2: CTC Estimator + Smart Defaults
**Goal**: Turn 8 simple answers into a full SalaryProfile that feeds the existing tax engine.

### The 8+2 Questions

```
SALARY QUESTIONS (8):
Q1: "What's your annual CTC?"
    → Number input, ₹ prefix, common presets: [₹8L] [₹12L] [₹18L] [₹25L] [₹35L]
    
Q2: "Monthly rent?"  
    → Number input, ₹ prefix
    → Option: "I don't pay rent" (sets to 0, skips Q3)

Q3: "Which city?"
    → Quick picker: Delhi / Mumbai / Bangalore / Chennai / Kolkata / Hyderabad / Pune / Other
    → Maps to metro (Delhi, Mumbai, Chennai, Kolkata) vs non-metro for HRA
    → Note: Bangalore is legally non-metro for HRA but most employers use metro rates.
      Default to metro for Bangalore — flag in results if it matters.

Q4: "Do you have a home loan?"
    → [No] → skip
    → [Yes] → "Annual interest paid?" Number input (helper: "Check your bank statement or loan app. Typically ₹2-8L/year")

Q5: "Health insurance beyond employer group cover?"
    → [None — just employer cover]
    → [Yes, for myself] → "Annual premium?" (or estimate ₹10-15K)
    → [Yes, for myself + parents] → "Annual premium for parents?" (or estimate ₹20-30K)
    → [Not sure] → default to "None" (we'll flag the opportunity)

Q6: "Are your parents over 60?"
    → [Under 60] / [Over 60] / [Skip — no parents to cover]
    → Only shows if Q5 involves parents or if Q5 = "None" (we'll recommend parent cover)

Q7: "Do you invest in PPF, ELSS, LIC, or similar tax-saving instruments (beyond EPF)?"
    → [No, just EPF]
    → [Yes] → "Approximately how much per year?" Number input
    → helper: "EPF is auto-deducted and already counted. This is for EXTRA investments you actively make."

Q8: "Do you contribute to NPS (National Pension System)?"
    → [No] / [Yes] → "How much per year?" Number input

INVESTMENT QUESTIONS (2, optional — shown after initial results):
Q9: "Do you have stocks or mutual funds?"
    → [Yes] / [No]

Q10: "Roughly how much unrealized profit on holdings older than 1 year?"
     → [Under ₹50,000]
     → [₹50,000 – ₹1,25,000] 
     → [Over ₹1,25,000]
     → [Not sure — skip for now]
     → Helper: "Open your Zerodha/Groww app → Portfolio → Total P&L"
```

### CTC to SalaryProfile Estimator

```javascript
function estimateFromCTC(answers) {
  const ctc = answers.ctc;
  
  // Industry-standard salary structure for Indian tech
  const basic = Math.round(ctc * 0.40);
  const hra = Math.round(basic * 0.50);
  const employerEpf = Math.round(basic * 0.12);  // not in gross salary
  const gratuity = Math.round(basic * 0.0481);    // not in gross salary  
  const grossSalary = ctc - employerEpf - gratuity;
  const specialAllowance = grossSalary - basic - hra;
  const epfEmployee = Math.round(basic * 0.12);   // employee share, counts in 80C

  return {
    financial_year: "2024-25",
    regime_chosen: "new",  // assume new (default since 2023)
    
    basic_salary: basic,
    hra_received: hra,
    special_allowance: specialAllowance,
    gross_salary: grossSalary,
    
    // From questions
    monthly_rent: answers.rent,
    city_type: answers.cityType,  // "metro" or "non_metro"
    
    // Deductions
    epf_contribution: epfEmployee,
    section_80c_total: epfEmployee + (answers.extra80C || 0),
    section_80d: (answers.healthPremiumSelf || 0) + (answers.healthPremiumParents || 0),
    section_80ccd_1b: answers.npsContribution || 0,
    home_loan_interest: answers.homeLoanInterest || 0,
    
    // User attributes
    age: 30,  // default, refine later
    parents_age: answers.parentsOver60 ? 65 : 55,
    has_health_insurance: (answers.healthPremiumSelf || 0) > 0,
    has_parent_health_insurance: (answers.healthPremiumParents || 0) > 0,
    
    // Defaults (not in Form 16 but needed)
    standard_deduction: 75000,  // new regime default
    professional_tax: 2400,     // typical
    hra_exemption_claimed: 0,   // new regime = no HRA exemption
    section_80ccd_2: 0,
    section_80g: 0,
    other_vi_a: 0,
    perquisites: 0,
    profits_in_lieu: 0,
    lta_received: 0,
    lta_exemption_claimed: 0,
    
    // Computed by engine
    taxable_income: 0,
    total_tax_paid: 0,
  };
}
```

### LTCG Estimator

```javascript
function estimateLTCG(answers) {
  if (!answers.hasInvestments) return null;
  
  // Map range selection to a representative amount
  const rangeMap = {
    'under_50k': 35000,
    '50k_to_125k': 87500,
    'over_125k': 150000,
    'skip': null,
  };
  
  const estimatedLTCG = rangeMap[answers.ltcgRange];
  if (!estimatedLTCG) return null;
  
  // Single synthetic holding representing total position
  return {
    holdings: [{
      name: "Your stock/MF portfolio",
      quantity: 1,
      buy_price: 0,
      current_price: estimatedLTCG,
      buy_date: "2023-01-01",
      asset_type: "equity",
    }]
  };
}
```

### Tasks
1. Create `src/engine/ctcEstimator.js` — the estimateFromCTC function
2. Create `src/engine/ltcgEstimator.js` — the estimateLTCG function  
3. Write tests:
   - CTC of ₹18L → produces valid SalaryProfile → orchestrator returns positive savings
   - Various CTC levels (₹8L, ₹12L, ₹25L, ₹50L) → all produce valid profiles
   - With/without home loan, health insurance, existing 80C
   - LTCG range selections → valid Holdings → scanner produces findings
   - Edge cases: zero rent, zero investments, max deductions

### Done when
- estimateFromCTC with ₹18L CTC + ₹25K rent + metro → orchestrator → savings > 0
- All edge cases handled
- Tests pass

---

## Phase 3: Core UI — Question Flow
**Goal**: The 8+2 questions as a buttery-smooth mobile wizard. This IS the product.

### UX Principles
- ONE question per screen (no scrolling, no forms)
- Big tap targets for preset/option buttons
- Number inputs get numeric keyboard (inputMode="numeric")
- Progress bar at top (thin, minimal)
- Back arrow to revise previous answers
- Smooth transitions between screens
- Skip/default options always visible
- Total time target: under 60 seconds

### Smart UX Details
- Q1 (CTC): Preset buttons [₹8L] [₹12L] [₹15L] [₹18L] [₹25L] [₹35L] [₹50L+] PLUS free-entry. Tapping preset fills input and auto-advances after 500ms.
- Q2 (Rent): "I don't pay rent" button, if tapped sets rent=0.
- Q4 (Home loan): If "No" → just advance, no number input shown.
- Q5 (Health insurance): Drives Q6. If "None" → still show Q6 (we recommend parent insurance).
- Q7 (80C): Helper: "Your EPF is ~₹{12% of estimated basic}/year. This is about extra investments beyond that."
- Q9-Q10 (Investments): Appear AFTER initial results, not in main flow. Keeps primary flow to 8 screens max.

### Conditional Flow
```
Q1 (CTC) → Q2 (Rent)
  → Q3 (City) [always asked]
  → Q4 (Home Loan)
    → if yes: amount input → Q5
    → if no: Q5
  → Q5 (Health Insurance)
  → Q6 (Parents Age)
  → Q7 (80C investments)
  → Q8 (NPS)
  → RESULTS
Results → optional: Q9 (Stocks?) → Q10 (Gains?) → UPDATED RESULTS
```

### Components to Build
3. `src/components/QuestionFlow.jsx` — wizard controller (tracks step, answers, navigation)
4. `src/components/questions/CTCQuestion.jsx` — CTC input with presets
5. `src/components/questions/RentQuestion.jsx` — rent input + "I don't pay rent"
6. `src/components/questions/CityQuestion.jsx` — city picker grid
7. `src/components/questions/HomeLoanQuestion.jsx` — yes/no + amount
8. `src/components/questions/HealthInsuranceQuestion.jsx` — none/self/self+parents + premiums
9. `src/components/questions/ParentsAgeQuestion.jsx` — under 60 / over 60
10. `src/components/questions/Existing80CQuestion.jsx` — beyond EPF investments
11. `src/components/questions/NPSQuestion.jsx` — yes/no + amount
12. `src/components/questions/InvestmentQuestion.jsx` — stocks yes/no
13. `src/components/questions/LTCGRangeQuestion.jsx` — gain range picker
14. `src/components/ProgressBar.jsx` — thin progress indicator

### Done when
- Full 8-question flow completes in under 60 seconds on phone
- Each screen is one focused question with big tap targets
- Back navigation works
- Conditional skips work
- Flow produces valid SalaryProfile → orchestrator → results

---

## Phase 4: Results Dashboard  
**Goal**: The "holy shit" moment. Show money + specific actions + calendar + share.

### Components to Build
15. `src/components/ResultsDashboard.jsx`:
    - Hero: "🦅 TaxHawk found ₹{total}/year in tax savings!"
    - Summary: "Estimated current tax: ~₹{current}. Optimized: ~₹{optimized}."
    - Finding cards sorted by impact
    - Investment unlock CTA (if not yet entered):
      "Got stocks or MFs? [Answer 2 more questions →]"
    - Bottom: [📤 Share] + [🔄 Start Over]
    - Subtle note: "Estimated from your CTC. For exact numbers, [enter Form 16 details →]" (links to future Layer 2)
    - Privacy badge persistent

16. `src/components/FindingCard.jsx`:
    - Title + ₹ amount (green, prominent)
    - "What to do" — plain English action
    - "By when" — deadline with urgency color (red <30d, amber <90d, green >90d)
    - Action links where applicable:
      - 80C: "Buy ELSS on Groww →"
      - 80D: "Compare plans on PolicyBazaar →"  
      - NPS: "Open NPS on Zerodha →"
    - Expandable "Why this works" section
    - [📅 Remind Me] + [📤 Share Tip] buttons
    - Component findings labeled "Part of your regime switch savings"

17. `src/components/Landing.jsx`:
    - Headline + Start button + Demo button
    - Privacy badge: "🔒 Your data never leaves your phone"
    - No mention of PDFs or uploads

18. `src/App.jsx`:
    - Routes: Landing → QuestionFlow → ResultsDashboard
    - State: answers + results in React state
    - Demo mode: pre-fills Priya's answers, skips to results

### Done when
- Demo → shows savings with finding cards
- Full flow → question answers → correct results
- Investment unlock → updated results with LTCG
- Mobile-readable finding cards with action links

---

## Phase 5: Calendar Reminders + Share
**Goal**: Turn results into action (calendar) and distribution (share).

### Tasks
19. `src/utils/calendarGenerator.js`:
    - Finding → .ics calendar event (date = 15 days before deadline)
    - Google Calendar URL alternative
    - "Add All Reminders" batch option

20. `src/components/CalendarReminder.jsx`:
    - "📅 Remind Me" per finding
    - Dropdown: Apple/Outlook (.ics) or Google Calendar

21. `src/utils/shareFormatter.js`:
    - Results: "I found ₹{total} in tax savings with TaxHawk! 🦅\n30 seconds. Try yours 👉 {url}"
    - Tips: "💡 {finding.title}\n{one-liner}\nFind your savings 👉 {url}"
    - Never share actual salary/breakdown (privacy + curiosity gap)

22. `src/components/ShareButton.jsx`:
    - navigator.share() on mobile, clipboard fallback on desktop
    - Two placements: results page + each finding card

### Done when
- .ics downloads and opens in calendar apps
- Google Calendar link works
- Share opens native share sheet on mobile
- Share text includes link, never includes financial details

---

## Phase 6: Polish + Deploy
**Goal**: Live on GitHub Pages. Works perfectly on phones.

### Tasks
23. Vite config for GitHub Pages (base: `/TaxHawk/`)
24. OpenGraph meta tags for WhatsApp link previews:
    - og:title: "TaxHawk — Find Your Hidden Tax Savings 🦅"
    - og:description: "Most salaried Indians lose ₹20,000+ every year. Find yours in 30 seconds."
    - og:image: preview card image (1200x630)
25. Mobile optimization:
    - iPhone Safari + Android Chrome tested
    - Tap targets ≥ 44px
    - No horizontal scroll
    - Numeric keyboard on number inputs
    - Smooth transitions between screens
26. Error handling:
    - CTC ≤ 0: validation message
    - CTC < ₹2.5L: "You likely don't owe tax at this income level!"
    - CTC > ₹1Cr: works but flags surcharge applicability
27. Footer:
    - "Built by [Your Name]"
    - "Not a CA. Not tax advice. Use at your own discretion."
    - GitHub link + feedback contact
28. Accessibility: screen reader labels, color contrast, focus management

### Done when
- Live at https://spiffler33.github.io/TaxHawk/
- End-to-end on iPhone and Android
- WhatsApp preview card shows correctly
- Demo + full flow + investment unlock all work
- Calendar + share work
- Loads instantly (no server calls)
