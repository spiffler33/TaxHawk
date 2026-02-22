import { useState, useCallback } from 'react';
import Landing from './components/Landing.jsx';
import QuestionFlow from './components/QuestionFlow.jsx';
import ResultsDashboard from './components/ResultsDashboard.jsx';
import InvestmentFlow from './components/InvestmentFlow.jsx';
import { estimateFromCTC } from './engine/ctcEstimator.js';
import { estimateLTCG } from './engine/ltcgEstimator.js';
import { runAllChecks } from './engine/checks/orchestrator.js';
import { createSalaryProfile, createHoldings } from './engine/models.js';
import { PRIYA_PROFILE } from './data/demoProfile.js';
import { PRIYA_HOLDINGS } from './data/demoHoldings.js';

/**
 * App — top-level screen router.
 *
 * Screens:
 *   1. landing              — hero + CTA + demo button
 *   2. questions            — 8-question wizard
 *   3. results              — ResultsDashboard with finding cards
 *   4. investment-questions  — post-results Q9-Q10
 *
 * Data flow:
 *   Regular: answers → estimateFromCTC() → SalaryProfile → runAllChecks() → results
 *   Demo:    PRIYA_PROFILE + PRIYA_HOLDINGS → runAllChecks() → results
 *   Adjust:  corrected values → new SalaryProfile → runAllChecks() → updated results
 *   Invest:  Q9-Q10 answers → estimateLTCG() → Holdings → runAllChecks() → updated results
 */
function App() {
  const [screen, setScreen] = useState('landing');
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [holdings, setHoldings] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // ── Landing → Questions ──────────────────────────────────────────
  const handleStart = useCallback(() => {
    setScreen('questions');
  }, []);

  // ── Questions → Results ──────────────────────────────────────────
  const handleComplete = useCallback((ans) => {
    const prof = estimateFromCTC(ans);
    const engineResult = runAllChecks(prof, null, {
      parentsSenior: ans.parentsOver60 || false,
    });

    setAnswers(ans);
    setProfile(prof);
    setHoldings(null);
    setResult(engineResult);
    setIsDemo(false);
    setScreen('results');
  }, []);

  // ── Demo → Results ───────────────────────────────────────────────
  // Uses FY 2024-25 end date for capital gains so demo numbers are stable
  const handleDemo = useCallback(() => {
    const prof = createSalaryProfile(PRIYA_PROFILE);
    const hold = createHoldings(PRIYA_HOLDINGS);
    const engineResult = runAllChecks(prof, hold, {
      parentsSenior: false,
      cgAsOf: new Date('2025-03-31'),
    });

    setProfile(prof);
    setHoldings(hold);
    setResult(engineResult);
    setAnswers(null);
    setIsDemo(true);
    setScreen('results');
  }, []);

  // ── Back to landing ──────────────────────────────────────────────
  const handleExit = useCallback(() => {
    setScreen('landing');
  }, []);

  const handleStartOver = useCallback(() => {
    setResult(null);
    setProfile(null);
    setAnswers(null);
    setHoldings(null);
    setIsDemo(false);
    setScreen('landing');
  }, []);

  // ── Adjust salary assumptions ────────────────────────────────────
  // Builds a new SalaryProfile from corrected values, keeping deduction
  // answers intact, then re-runs all checks.
  const handleAdjust = useCallback(
    (corrected) => {
      const newProfile = createSalaryProfile({
        financial_year: '2024-25',
        employee_name: '',

        // Corrected salary structure
        gross_salary: corrected.gross,
        basic_salary: corrected.basic,
        hra_received: corrected.hra,
        special_allowance: corrected.special,

        // Standard deductions
        standard_deduction: 75_000,
        professional_tax: 2_400,

        // Deductions from original answers (unchanged)
        deduction_80c: Math.min(
          corrected.epf + (answers?.extra80C || 0),
          150_000
        ),
        deduction_80d:
          (answers?.healthPremiumSelf || 0) +
          (answers?.healthPremiumParents || 0),
        deduction_80ccd_1b: answers?.npsContribution || 0,
        deduction_24b: answers?.homeLoanInterest || 0,

        // Context from original answers
        regime: 'new',
        city: (answers?.city || 'other').toLowerCase(),
        monthly_rent: answers?.monthlyRent || 0,
        epf_employee_contribution: corrected.epf,
      });

      const engineResult = runAllChecks(newProfile, holdings, {
        parentsSenior: answers?.parentsOver60 || false,
      });

      setProfile(newProfile);
      setResult(engineResult);
    },
    [answers, holdings]
  );

  // ── Investment unlock → Q9-Q10 ──────────────────────────────────
  const handleInvestmentUnlock = useCallback(() => {
    setScreen('investment-questions');
  }, []);

  const handleInvestmentComplete = useCallback(
    (investmentAnswers) => {
      const hold = estimateLTCG(investmentAnswers);
      const engineResult = runAllChecks(profile, hold, {
        parentsSenior: answers?.parentsOver60 || false,
      });

      setHoldings(hold);
      setResult(engineResult);
      setScreen('results');
    },
    [profile, answers]
  );

  const handleInvestmentSkip = useCallback(() => {
    setScreen('results');
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  if (screen === 'landing') {
    return <Landing onStart={handleStart} onDemo={handleDemo} />;
  }

  if (screen === 'questions') {
    return <QuestionFlow onComplete={handleComplete} onExit={handleExit} />;
  }

  if (screen === 'investment-questions') {
    return (
      <InvestmentFlow
        onComplete={handleInvestmentComplete}
        onSkip={handleInvestmentSkip}
      />
    );
  }

  // Results
  return (
    <ResultsDashboard
      result={result}
      profile={profile}
      answers={answers}
      holdings={holdings}
      isDemo={isDemo}
      onStartOver={handleStartOver}
      onAdjust={handleAdjust}
      onInvestmentUnlock={handleInvestmentUnlock}
    />
  );
}

export default App;
