import { useState, useCallback } from 'react';
import ProgressBar from './ProgressBar.jsx';
import CTCQuestion from './questions/CTCQuestion.jsx';
import RentQuestion from './questions/RentQuestion.jsx';
import CityQuestion from './questions/CityQuestion.jsx';
import HomeLoanQuestion from './questions/HomeLoanQuestion.jsx';
import HealthInsuranceQuestion from './questions/HealthInsuranceQuestion.jsx';
import ParentsAgeQuestion from './questions/ParentsAgeQuestion.jsx';
import Existing80CQuestion from './questions/Existing80CQuestion.jsx';
import NPSQuestion from './questions/NPSQuestion.jsx';

/**
 * The 8 steps in the question wizard.
 * Each produces key-value pairs that merge into the accumulated answers object.
 * The final answers object feeds into estimateFromCTC().
 *
 * Flow: Q1→Q2→Q3→Q4→Q5→Q6→Q7→Q8→RESULTS
 * Investment questions (Q9-Q10) appear after results, not in this flow.
 */
const STEPS = [
  { id: 'ctc', Component: CTCQuestion },
  { id: 'rent', Component: RentQuestion },
  { id: 'city', Component: CityQuestion },
  { id: 'homeLoan', Component: HomeLoanQuestion },
  { id: 'healthInsurance', Component: HealthInsuranceQuestion },
  { id: 'parentsAge', Component: ParentsAgeQuestion },
  { id: 'existing80c', Component: Existing80CQuestion },
  { id: 'nps', Component: NPSQuestion },
];

/**
 * QuestionFlow — 8-screen mobile wizard controller.
 *
 * Manages step index, accumulated answers, and navigation.
 * Each question component calls onNext({key: value}) to advance.
 *
 * @param {object} props
 * @param {function} props.onComplete - Called with final answers object
 * @param {function} [props.onExit] - Called when user goes back from first step
 */
export default function QuestionFlow({ onComplete, onExit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleNext = useCallback(
    (updates) => {
      const newAnswers = { ...answers, ...updates };
      setAnswers(newAnswers);

      if (stepIndex >= STEPS.length - 1) {
        onComplete(newAnswers);
      } else {
        setStepIndex((prev) => prev + 1);
      }
    },
    [answers, stepIndex, onComplete]
  );

  const handleBack = useCallback(() => {
    if (stepIndex === 0) {
      if (onExit) onExit();
    } else {
      setStepIndex((prev) => prev - 1);
    }
  }, [stepIndex, onExit]);

  const { Component } = STEPS[stepIndex];

  return (
    <div className="min-h-dvh min-h-[100svh] flex flex-col bg-(--color-paper)">
      {/* Progress + navigation */}
      <div className="shrink-0">
        <ProgressBar current={stepIndex} total={STEPS.length} />

        <div className="flex items-center justify-between px-4 pt-2 pb-0">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 -ml-2 text-(--color-muted) bg-transparent border-0
              font-[inherit] cursor-pointer hover:text-(--color-ink) transition-colors"
            aria-label="Go back"
          >
            ← back
          </button>
          <span className="text-[10px] text-(--color-muted) tabular-nums">
            [ {stepIndex + 1} / {STEPS.length} ]
          </span>
        </div>
      </div>

      {/* Question content — keyed for re-mount animation */}
      <div key={stepIndex} className="flex-1 flex flex-col animate-slide-in">
        <Component answers={answers} onNext={handleNext} />
      </div>
    </div>
  );
}
