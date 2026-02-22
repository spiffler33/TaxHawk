import { useState, useRef, useEffect } from 'react';
import { formatINR, lakhsToRupees, rupeesToLakhs } from '../../utils/format.js';

const CTC_PRESETS = [
  { label: '₹8L', lakhs: 8, value: 8_00_000 },
  { label: '₹12L', lakhs: 12, value: 12_00_000 },
  { label: '₹15L', lakhs: 15, value: 15_00_000 },
  { label: '₹18L', lakhs: 18, value: 18_00_000 },
  { label: '₹25L', lakhs: 25, value: 25_00_000 },
  { label: '₹35L', lakhs: 35, value: 35_00_000 },
  { label: '₹50L+', lakhs: 50, value: 50_00_000 },
];

export default function CTCQuestion({ answers, onNext }) {
  const existing = answers.ctc || 0;
  const [inputLakhs, setInputLakhs] = useState(
    existing > 0 ? rupeesToLakhs(existing) : ''
  );
  const [selectedPreset, setSelectedPreset] = useState(
    existing > 0
      ? CTC_PRESETS.find((p) => p.value === existing)?.lakhs ?? null
      : null
  );
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const ctcRupees = lakhsToRupees(inputLakhs);

  function handlePreset(preset) {
    setInputLakhs(String(preset.lakhs));
    setSelectedPreset(preset.lakhs);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onNext({ ctc: preset.value });
    }, 500);
  }

  function handleInputChange(e) {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
    setInputLakhs(sanitized);
    setSelectedPreset(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const isBelowTaxable = ctcRupees > 0 && ctcRupees < 2_50_000;

  function handleContinue() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (ctcRupees > 0) onNext({ ctc: ctcRupees });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && ctcRupees > 0) handleContinue();
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-5 pt-4">
        <h2 className="text-lg font-bold leading-snug">
          what's your annual CTC?
        </h2>
        <p className="text-xs text-(--color-muted) mt-1">
          the number on your offer letter
        </p>

        {/* Preset grid */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {CTC_PRESETS.map((p) => (
            <button
              key={p.lakhs}
              type="button"
              onClick={() => handlePreset(p)}
              className={`py-3 border font-[inherit] text-sm cursor-pointer transition-colors
                ${
                  selectedPreset === p.lakhs
                    ? 'border-(--color-green) bg-(--color-paper-alt) text-(--color-green) font-bold'
                    : 'border-(--color-line) bg-transparent text-(--color-ink) hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt)'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="mt-5">
          <div className="text-[10px] tracking-[0.15em] text-(--color-muted) uppercase mb-2">
            ── or enter CTC ──────────────────────
          </div>
          <div className="flex items-center gap-2">
            <span className="text-(--color-muted) text-sm shrink-0">₹</span>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              placeholder="e.g. 18"
              value={inputLakhs}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 py-2.5 px-3 text-base border border-(--color-line) bg-(--color-paper)
                font-[inherit] focus:border-(--color-ink) focus:outline-none
                placeholder:text-(--color-line)"
            />
            <span className="text-(--color-muted) text-xs shrink-0">lakhs/yr</span>
          </div>
          {ctcRupees > 0 && (
            <p className="text-xs text-(--color-muted) mt-1.5 ml-5">
              = {formatINR(ctcRupees)} per year
            </p>
          )}
          {isBelowTaxable && (
            <p className="text-xs text-(--color-green) mt-2 ml-5">
              you likely don't owe tax at this income level
            </p>
          )}
          {ctcRupees > 1_00_00_000 && (
            <p className="text-xs text-(--color-amber) mt-2 ml-5">
              surcharge may apply above ₹1Cr -- we'll calculate it
            </p>
          )}
        </div>
      </div>

      {/* Continue */}
      <div className="shrink-0 px-5 pb-6 pt-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={ctcRupees <= 0}
          className="w-full py-3.5 bg-(--color-ink) text-(--color-paper) border-0
            font-[inherit] text-xs tracking-wider cursor-pointer
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:opacity-80 active:opacity-70 transition-opacity"
        >
          [ continue → ]
        </button>
      </div>
    </div>
  );
}
