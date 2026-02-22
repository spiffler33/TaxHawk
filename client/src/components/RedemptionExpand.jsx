import { useState } from 'react';
import { computeRedemptionTax } from '../engine/redemptionPlanner.js';
import { formatINR } from '../utils/format.js';

const PRESETS = [200_000, 500_000, 1_000_000, 2_500_000];
const PRESET_LABELS = ['2L', '5L', '10L', '25L'];

/**
 * RedemptionExpand — inline planner inside FindingCard's expand region.
 *
 * Two-step fog-of-war:
 *   Step 1: input with presets + custom field
 *   Step 2: one-FY vs split-FY tax comparison
 *
 * @param {object} props
 * @param {number} props.exemptionRemaining - This FY's remaining LTCG exemption (₹)
 */
export default function RedemptionExpand({ exemptionRemaining }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);

  const calculate = (amount) => {
    const ltcg = Math.max(Number(amount) || 0, 0);
    if (ltcg === 0) return;
    setResult(computeRedemptionTax(ltcg, { exemptionRemaining }));
  };

  const handlePreset = (amount) => {
    setInput(String(amount));
    calculate(amount);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    calculate(input);
  };

  const fmtRate = (rate) => (rate * 100).toFixed(1) + '%';

  return (
    <div className="mt-2 border-l-2 border-(--color-line) pl-3 animate-slide-in">
      <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-2">
        ── plan a sale ────────────────────
      </div>

      <div className="text-xs text-(--color-muted) mb-2">
        how much long-term gain will you book?
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESETS.map((amount, i) => (
          <button
            key={amount}
            type="button"
            onClick={() => handlePreset(amount)}
            className="text-[10px] px-2 py-1 border border-(--color-line) bg-transparent
              font-[inherit] cursor-pointer hover:border-(--color-green) hover:text-(--color-green)
              transition-colors"
          >
            {PRESET_LABELS[i]}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-1">
        <span className="text-xs text-(--color-muted)">₹</span>
        <input
          type="number"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="enter amount"
          className="flex-1 bg-transparent border-b border-(--color-line) font-[inherit]
            text-xs p-1 outline-none focus:border-(--color-green) text-(--color-ink) tabular-nums"
        />
        <button
          type="submit"
          className="text-[10px] text-(--color-green) hover:text-(--color-green-bright)
            bg-transparent border-0 font-[inherit] cursor-pointer p-0 underline"
        >
          [ calculate ]
        </button>
      </form>
      <div className="text-[10px] text-(--color-muted) mb-3">
        check your broker app for P&L
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-2">
          {/* One-FY scenario */}
          <div className="text-xs">
            <span className="text-(--color-muted)">sell all now</span>
            <span className="mx-1">{'\u00B7'}</span>
            <span className={result.one_fy.tax > 0 ? 'text-(--color-red)' : ''}>
              tax: {formatINR(result.one_fy.tax)}
            </span>
            <span className="mx-1">{'\u00B7'}</span>
            <span className="text-(--color-muted)">
              {fmtRate(result.one_fy.effective_rate)} effective
            </span>
          </div>

          {/* Split-FY scenario (only if beneficial) */}
          {result.split_beneficial && (
            <div className="border border-dashed border-(--color-green) p-3 text-xs">
              <div className="text-(--color-green) mb-2">
                split across two FYs to save {formatINR(result.split_savings)}
              </div>
              <div className="text-(--color-muted)">
                {formatINR(result.split_fy.sell_fy1)} before march 31
              </div>
              <div className="text-(--color-muted)">
                {formatINR(result.split_fy.sell_fy2)} after april 1
              </div>
              <div className="mt-1">
                <span className={result.split_fy.total_tax > 0 ? 'text-(--color-red)' : 'text-(--color-green)'}>
                  tax: {formatINR(result.split_fy.total_tax)}
                </span>
                <span className="mx-1 text-(--color-muted)">{'\u00B7'}</span>
                <span className="text-(--color-muted)">
                  {fmtRate(result.split_fy.effective_rate)} effective
                </span>
              </div>
            </div>
          )}

          <div className="text-[10px] text-(--color-muted)">
            ltcg above ₹1,25,000/FY taxed at 12.5% + 4% cess
          </div>
        </div>
      )}
    </div>
  );
}
