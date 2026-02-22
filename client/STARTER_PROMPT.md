# TaxHawk Client — Claude Code Prompts

Copy one prompt at a time. After each phase, verify, then /clear and paste the next.

Phase 1 is already complete (JS tax engine, 104 tests passing).

---

## Phase 2 — CTC Estimator
```
Read client/CLAUDE.md and client/BUILD_PLAN.md (Phase 2). Then read the existing engine code in client/src/engine/ to understand the SalaryProfile shape and orchestrator.

Build src/engine/ctcEstimator.js and src/engine/ltcgEstimator.js. The CTC estimator converts simple user answers (CTC, rent, city, insurance, etc.) into a full SalaryProfile using standard Indian salary ratios (40% basic, 20% HRA, 12% EPF). The LTCG estimator converts a gain range selection into synthetic Holdings. Write tests verifying ₹18L CTC produces a valid profile that the orchestrator can process with positive savings.
```

## Phase 3 — Question Flow UI
```
Read client/CLAUDE.md and client/BUILD_PLAN.md (Phase 3). 

Build the 8-question mobile wizard: QuestionFlow controller + individual question components (CTC, Rent, City, HomeLoan, HealthInsurance, ParentsAge, Existing80C, NPS). ONE question per screen, big tap targets, numeric keyboard on number inputs, progress bar, back navigation. The investment questions (Q9-Q10) are NOT in this flow — they appear after results. Mobile-first with Tailwind — must work perfectly on 375px screen.
```

## Phase 4 — Results Dashboard
```
Read client/CLAUDE.md and client/BUILD_PLAN.md (Phase 4).

Build Landing page, ResultsDashboard, and FindingCard components. Wire up: Landing → QuestionFlow → CTC estimator → orchestrator → ResultsDashboard. Demo button loads Priya's profile and skips to results. Hero "₹X saved" number, finding cards with actions/deadlines/action-links (Groww, PolicyBazaar), investment unlock CTA ("Answer 2 more questions"), privacy badge. Component findings labeled "Part of regime switch."
```

## Phase 5 — Calendar + Share
```
Read client/CLAUDE.md and client/BUILD_PLAN.md (Phase 5).

Build calendar reminder generation (.ics download + Google Calendar URLs) and share functionality (Web Share API with clipboard fallback). "Remind Me" button per finding, "Share with Friends" on results page. Share messages include link but NEVER include salary/financial details.
```

## Phase 6 — Polish + Deploy  
```
Read client/CLAUDE.md and client/BUILD_PLAN.md (Phase 6).

Configure Vite for GitHub Pages (base: /TaxHawk/). Add OpenGraph meta tags for WhatsApp previews. Mobile optimization pass — test all flows on 375px, ensure 44px tap targets, numeric keyboards, smooth transitions. Error handling for edge cases (low income, high income, zero rent). Footer with attribution and disclaimer. Deploy to GitHub Pages.
```
