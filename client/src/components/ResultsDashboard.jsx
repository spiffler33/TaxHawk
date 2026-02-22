import { useState, useEffect } from 'react';
import FindingCard from './FindingCard.jsx';
import AdjustPanel from './AdjustPanel.jsx';
import { formatINR } from '../utils/format.js';
import { shareResults } from '../utils/shareFormatter.js';

/**
 * ResultsDashboard — the "holy shit" moment.
 *
 * Shows total savings prominently, individual findings as cards,
 * assumptions banner with adjustment option, investment unlock CTA,
 * and privacy badge.
 *
 * Data flow context:
 *   - `result.total_savings` = regime_switch + capital_gains ONLY (no double-counting)
 *   - When old regime recommended: deduction checks show COMPONENT savings
 *     (already included in regime total — labeled "part of regime switch")
 *   - When new regime recommended: deduction checks are NOT_APPLICABLE
 *
 * @param {object} props
 * @param {object}   props.result     - TaxHawkResult from orchestrator
 * @param {object}   props.profile    - SalaryProfile (for adjust panel)
 * @param {object}   [props.answers]  - Original question answers (null in demo)
 * @param {object}   [props.holdings] - Holdings (null until investment unlock)
 * @param {boolean}  props.isDemo     - Demo mode flag
 * @param {function} props.onStartOver
 * @param {function} props.onAdjust   - Called with corrected salary values
 * @param {function} props.onInvestmentUnlock - Navigate to Q9-Q10
 */
export default function ResultsDashboard({
  result,
  profile,
  answers,
  holdings,
  isDemo,
  onStartOver,
  onAdjust,
  onInvestmentUnlock,
}) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [shareToast, setShareToast] = useState(null);

  // Auto-dismiss share toast after 2 seconds
  useEffect(() => {
    if (!shareToast) return;
    const timer = setTimeout(() => setShareToast(null), 2000);
    return () => clearTimeout(timer);
  }, [shareToast]);

  const handleShare = async () => {
    const outcome = await shareResults();
    if (outcome === 'copied') {
      setShareToast('copied to clipboard');
    }
  };

  const opportunities = (result?.checks || []).filter(
    (c) => c.status === 'opportunity'
  );
  const optimized = (result?.checks || []).filter(
    (c) => c.status === 'optimized'
  );
  const notApplicable = (result?.checks || []).filter(
    (c) => c.status === 'not_applicable'
  );

  const handleAdjustApply = (corrected) => {
    setShowAdjust(false);
    onAdjust(corrected);
  };

  return (
    <div className="min-h-dvh min-h-[100svh] bg-(--color-paper) max-w-2xl mx-auto px-5 py-8" role="main" aria-label="Tax savings results">
      {/* ── Hero: Total Savings ──────────────────────────────────── */}
      <div className="border border-(--color-line) p-6 mb-4 text-center animate-slide-in">
        <div className="text-[10px] tracking-[0.3em] text-(--color-muted) uppercase mb-2">
          total savings found
        </div>
        <div className="text-4xl font-bold text-(--color-green) mb-1">
          {formatINR(result?.total_savings || 0)}
        </div>
        <div className="text-xs text-(--color-muted) mt-1">
          estimated annual savings
          <span className="mx-1">·</span>
          FY {result?.financial_year || '2024-25'}
        </div>
        {result?.recommended_regime && (
          <div className="text-xs mt-2">
            <span className="text-(--color-muted)">recommended: </span>
            <span className="text-(--color-green) font-bold">
              {result.recommended_regime} regime
            </span>
          </div>
        )}
      </div>

      {/* ── Assumptions Banner (CTC flow only) ───────────────────── */}
      {!isDemo && answers?.ctc && (
        <div className="text-xs text-(--color-muted) mb-4 p-3 border border-dashed border-(--color-line) animate-slide-in">
          <div>
            based on typical salary structure (40% basic, 20% HRA)
          </div>
          <button
            type="button"
            onClick={() => setShowAdjust(!showAdjust)}
            className="mt-1 text-xs text-(--color-green) hover:text-(--color-green-bright)
              bg-transparent border-0 font-[inherit] cursor-pointer p-0 underline"
          >
            {showAdjust
              ? '[ hide details ]'
              : '[ these numbers off? adjust details → ]'}
          </button>

          {showAdjust && (
            <AdjustPanel
              ctc={answers.ctc}
              profile={profile}
              onApply={handleAdjustApply}
              onClose={() => setShowAdjust(false)}
            />
          )}
        </div>
      )}

      {/* ── No savings found ────────────────────────────────────── */}
      {(result?.total_savings || 0) === 0 && opportunities.length === 0 && (
        <div className="border border-(--color-line) p-4 mb-4 text-center text-sm text-(--color-muted) animate-slide-in">
          no additional savings found -- you're already well optimized.
        </div>
      )}

      {/* ── Opportunities ─────────────────────────────────────────── */}
      {opportunities.length > 0 && (
        <>
          <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-3">
            ── opportunities ({opportunities.length}) ────────────────
          </div>
          {opportunities.map((check) => (
            <FindingCard
              key={check.check_id}
              check={check}
              recommendedRegime={result.recommended_regime}
            />
          ))}
        </>
      )}

      {/* ── Already Optimized ─────────────────────────────────────── */}
      {optimized.length > 0 && (
        <>
          <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-3 mt-6">
            ── already optimized ({optimized.length}) ──────────────
          </div>
          {optimized.map((check) => (
            <div
              key={check.check_id}
              className="border border-(--color-line) bg-(--color-paper-alt) mb-2 p-3"
            >
              <div className="text-[10px] tracking-widest text-(--color-muted) uppercase">
                {check.check_name}
              </div>
              <div className="text-xs text-(--color-muted) mt-1">
                {check.finding}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Not Applicable (new regime) ───────────────────────────── */}
      {notApplicable.length > 0 && result.recommended_regime === 'new' && (
        <>
          <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-3 mt-6">
            ── not applicable under new regime ──────────
          </div>
          {notApplicable.map((check) => (
            <div
              key={check.check_id}
              className="border border-(--color-line) bg-(--color-paper-alt) mb-2 p-3 opacity-60"
            >
              <div className="text-[10px] tracking-widest text-(--color-muted) uppercase">
                {check.check_name}
              </div>
              <div className="text-xs text-(--color-muted) mt-1">
                {check.finding}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Investment Unlock CTA ─────────────────────────────────── */}
      {!holdings && onInvestmentUnlock && (
        <div className="border border-(--color-green) bg-(--color-paper) p-4 mt-6 text-center">
          <div className="text-xs text-(--color-muted) mb-2">
            got stocks or mutual funds?
          </div>
          <button
            type="button"
            onClick={onInvestmentUnlock}
            className="py-2.5 px-6 bg-(--color-green) text-(--color-paper) border-0
              font-[inherit] text-xs tracking-wider cursor-pointer
              hover:opacity-80 active:opacity-70 transition-opacity"
          >
            [ answer 2 more questions ]
          </button>
          <div className="text-[10px] text-(--color-muted) mt-2">
            unlock capital gains optimization
          </div>
        </div>
      )}

      {/* ── Disclaimer ────────────────────────────────────────────── */}
      <div className="text-[10px] text-(--color-muted) mt-6 p-3 border border-dashed border-(--color-line) leading-relaxed">
        {result?.disclaimer}
      </div>

      {/* ── Share + Start Over + Privacy ─────────────────────────── */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={handleShare}
          className="text-xs text-(--color-green) hover:text-(--color-green-bright) underline
            cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          [ share with friends ]
        </button>

        {shareToast && (
          <div className="text-[10px] text-(--color-muted) mt-1 animate-slide-in">
            {shareToast}
          </div>
        )}
      </div>

      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={onStartOver}
          className="text-xs text-(--color-muted) hover:text-(--color-ink) underline
            cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          [ start over ]
        </button>
      </div>

      <div className="text-center text-[10px] text-(--color-muted) mt-4 pb-4 leading-relaxed">
        * your data never left your phone
        <br />
        not a CA. not tax advice. use at your own discretion.
        <br />
        <a
          href="https://github.com/spiffler33/TaxHawk"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-(--color-ink)"
        >
          source on github
        </a>
      </div>
    </div>
  );
}
