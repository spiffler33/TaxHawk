import { useState } from 'react';
import { formatINR, formatINRShort } from '../../utils/format.js';

const AMOUNT_PRESETS = [
  { label: '₹25K', value: 25_000 },
  { label: '₹50K', value: 50_000 },
  { label: '₹75K', value: 75_000 },
  { label: '₹1L+', value: 1_00_000 },
];

export default function Existing80CQuestion({ answers, onNext }) {
  const existing = answers.extra80C;
  const hasExisting = existing != null && existing > 0;
  const [showAmount, setShowAmount] = useState(hasExisting);
  const [input, setInput] = useState(hasExisting ? String(existing) : '');
  const [selectedPreset, setSelectedPreset] = useState(
    hasExisting
      ? AMOUNT_PRESETS.find((p) => p.value === existing)?.value ?? null
      : null
  );

  const amount = parseInt(input, 10) || 0;

  // Estimate EPF from CTC
  const ctc = answers.ctc || 0;
  const estimatedEPF = Math.round(ctc * 0.40 * 0.12);

  function handleNo() {
    onNext({ extra80C: 0 });
  }

  function handleYes() {
    setShowAmount(true);
  }

  function handlePreset(preset) {
    setInput(String(preset.value));
    setSelectedPreset(preset.value);
  }

  function handleInputChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setInput(val);
    setSelectedPreset(null);
  }

  function handleContinue() {
    if (amount > 0) onNext({ extra80C: amount });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && amount > 0) handleContinue();
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-5 pt-4">
        <h2 className="text-lg font-bold leading-snug">
          tax-saving investments beyond EPF?
        </h2>
        <p className="text-xs text-(--color-muted) mt-1">
          PPF, ELSS, LIC, Sukanya Samriddhi, etc.
        </p>

        {estimatedEPF > 0 && (
          <div className="mt-3 p-3 border border-(--color-line) bg-(--color-paper-alt)">
            <p className="text-[10px] text-(--color-muted) leading-relaxed">
              EPF ~{formatINRShort(estimatedEPF)}/yr already counted. this is <span className="font-bold">extra</span> investments only.
            </p>
          </div>
        )}

        {!showAmount ? (
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={handleNo}
              className="flex-1 py-3.5 border border-(--color-line) bg-transparent
                font-[inherit] text-sm cursor-pointer
                hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt) transition-colors"
            >
              no, just EPF
            </button>
            <button
              type="button"
              onClick={handleYes}
              className="flex-1 py-3.5 border border-(--color-line) bg-transparent
                font-[inherit] text-sm cursor-pointer
                hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt) transition-colors"
            >
              yes
            </button>
          </div>
        ) : (
          <div className="mt-5 animate-slide-in">
            <div className="text-[10px] tracking-[0.15em] text-(--color-muted) uppercase mb-2">
              ── how much per year ──────────────
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {AMOUNT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`py-3 border font-[inherit] text-xs cursor-pointer transition-colors
                    ${
                      selectedPreset === p.value
                        ? 'border-(--color-green) bg-(--color-paper-alt) text-(--color-green) font-bold'
                        : 'border-(--color-line) bg-transparent text-(--color-ink) active:bg-(--color-paper-alt)'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-(--color-muted) text-sm shrink-0">₹</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 50000"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 py-2.5 px-3 text-base border border-(--color-line) bg-(--color-paper)
                  font-[inherit] focus:border-(--color-ink) focus:outline-none
                  placeholder:text-(--color-line)"
              />
              <span className="text-(--color-muted) text-xs shrink-0">/ year</span>
            </div>
            {amount > 0 && (
              <p className="text-xs text-(--color-muted) mt-1.5 ml-5">
                total 80C: ~{formatINR(Math.min(estimatedEPF + amount, 1_50_000))}
                {estimatedEPF + amount > 1_50_000 && (
                  <span className="text-(--color-amber)"> (limit ₹1.5L)</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {showAmount && (
        <div className="shrink-0 px-5 pb-6 pt-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={amount <= 0}
            className="w-full py-3.5 bg-(--color-ink) text-(--color-paper) border-0
              font-[inherit] text-xs tracking-wider cursor-pointer
              disabled:opacity-30 disabled:cursor-not-allowed
              hover:opacity-80 active:opacity-70 transition-opacity"
          >
            [ continue → ]
          </button>
        </div>
      )}
    </div>
  );
}
