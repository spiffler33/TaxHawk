import { useState } from 'react';
import { RANGE_OPTIONS } from '../engine/ltcgEstimator.js';

/**
 * InvestmentFlow — post-results mini wizard for Q9 + Q10.
 *
 * Q9: "Do you have stocks or mutual funds?" → yes/no
 * Q10: "Roughly how much unrealized profit?" → range picker
 *
 * These questions appear AFTER initial results to keep the main
 * 8-question flow under 60 seconds. They unlock capital gains
 * optimization when the user has equity investments.
 *
 * @param {object} props
 * @param {function} props.onComplete - Called with { hasInvestments, ltcgRange }
 * @param {function} props.onSkip - Return to results without answering
 */
export default function InvestmentFlow({ onComplete, onSkip }) {
  const [step, setStep] = useState(0);

  // ── Q9: Do you have stocks or mutual funds? ──────────────────────
  if (step === 0) {
    return (
      <div className="min-h-dvh min-h-[100svh] flex flex-col bg-(--color-paper) px-5">
        <div className="shrink-0 pt-4">
          <button
            type="button"
            onClick={onSkip}
            className="py-2 text-(--color-muted) bg-transparent border-0 font-[inherit]
              text-xs cursor-pointer hover:text-(--color-ink) transition-colors"
          >
            ← back to results
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-4">
            unlock capital gains optimization
          </div>
          <div className="text-sm mb-6">
            do you have stocks or mutual funds?
          </div>

          <div className="space-y-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-3.5 bg-(--color-ink) text-(--color-paper) border-0
                font-[inherit] text-xs tracking-wider cursor-pointer
                hover:opacity-80 active:opacity-70 transition-opacity"
            >
              [ yes ]
            </button>
            <button
              type="button"
              onClick={() => onComplete({ hasInvestments: false, ltcgRange: 'skip' })}
              className="w-full py-3.5 bg-transparent text-(--color-muted) border border-(--color-line)
                font-[inherit] text-xs cursor-pointer hover:text-(--color-ink) transition-colors"
            >
              [ no ]
            </button>
          </div>

          <div className="text-[10px] text-(--color-muted) mt-4 tabular-nums">
            [ 1 / 2 ]
          </div>
        </div>
      </div>
    );
  }

  // ── Q10: Unrealized profit range ─────────────────────────────────
  return (
    <div className="min-h-dvh min-h-[100svh] flex flex-col bg-(--color-paper) px-5">
      <div className="shrink-0 pt-4">
        <button
          type="button"
          onClick={() => setStep(0)}
          className="text-(--color-muted) bg-transparent border-0 font-[inherit]
            text-xs cursor-pointer hover:text-(--color-ink) transition-colors"
        >
          ← back
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="text-sm mb-2">
          roughly how much unrealized profit
          <br />
          on holdings older than 1 year?
        </div>
        <div className="text-[10px] text-(--color-muted) mb-6">
          check your broker app -- portfolio P&L
        </div>

        <div className="space-y-3 w-full max-w-xs">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() =>
                onComplete({ hasInvestments: true, ltcgRange: opt.key })
              }
              className={`w-full py-3.5 border font-[inherit] text-xs cursor-pointer transition-all
                ${
                  opt.key === 'skip'
                    ? 'bg-transparent text-(--color-muted) border-(--color-line) hover:text-(--color-ink)'
                    : 'bg-(--color-ink) text-(--color-paper) border-transparent hover:opacity-80 active:opacity-70'
                }`}
            >
              [ {opt.label.toLowerCase()} ]
            </button>
          ))}
        </div>

        <div className="text-[10px] text-(--color-muted) mt-4 tabular-nums">
          [ 2 / 2 ]
        </div>
      </div>
    </div>
  );
}
