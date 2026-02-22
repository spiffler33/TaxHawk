import { useState } from 'react';
import { formatINR } from '../../utils/format.js';

const RENT_PRESETS = [
  { label: '₹10K', value: 10_000 },
  { label: '₹15K', value: 15_000 },
  { label: '₹20K', value: 20_000 },
  { label: '₹25K', value: 25_000 },
  { label: '₹30K', value: 30_000 },
  { label: '₹40K', value: 40_000 },
];

export default function RentQuestion({ answers, onNext }) {
  const existing = answers.monthlyRent;
  const [input, setInput] = useState(
    existing > 0 ? String(existing) : ''
  );
  const [selectedPreset, setSelectedPreset] = useState(
    existing > 0
      ? RENT_PRESETS.find((p) => p.value === existing)?.value ?? null
      : null
  );

  const amount = parseInt(input, 10) || 0;

  function handlePreset(preset) {
    setInput(String(preset.value));
    setSelectedPreset(preset.value);
  }

  function handleInputChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setInput(val);
    setSelectedPreset(null);
  }

  function handleNoPay() {
    onNext({ monthlyRent: 0 });
  }

  function handleContinue() {
    onNext({ monthlyRent: amount });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && amount > 0) handleContinue();
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-5 pt-4">
        <h2 className="text-lg font-bold leading-snug">
          how much rent do you pay monthly?
        </h2>
        <p className="text-xs text-(--color-muted) mt-1">
          for HRA exemption
        </p>

        {/* Preset chips */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {RENT_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePreset(p)}
              className={`py-3 border font-[inherit] text-sm cursor-pointer transition-colors
                ${
                  selectedPreset === p.value
                    ? 'border-(--color-green) bg-(--color-paper-alt) text-(--color-green) font-bold'
                    : 'border-(--color-line) bg-transparent text-(--color-ink) hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt)'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Number input */}
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="text-(--color-muted) text-sm shrink-0">₹</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="monthly rent"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 py-2.5 px-3 text-base border border-(--color-line) bg-(--color-paper)
                font-[inherit] focus:border-(--color-ink) focus:outline-none
                placeholder:text-(--color-line)"
            />
            <span className="text-(--color-muted) text-xs shrink-0">/ month</span>
          </div>
          {amount > 0 && (
            <p className="text-xs text-(--color-muted) mt-1.5 ml-5">
              = {formatINR(amount * 12)} per year
            </p>
          )}
        </div>

        {/* No rent option */}
        <button
          type="button"
          onClick={handleNoPay}
          className="mt-5 py-2 text-xs text-(--color-muted) underline cursor-pointer
            bg-transparent border-0 font-[inherit] hover:text-(--color-ink)"
          aria-label="I don't pay rent, skip to next question"
        >
          i don't pay rent →
        </button>
      </div>

      {/* Continue */}
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
    </div>
  );
}
