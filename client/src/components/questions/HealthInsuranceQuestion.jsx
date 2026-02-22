import { useState } from 'react';
import { formatINR } from '../../utils/format.js';

const SELF_PRESETS = [
  { label: '₹10K', value: 10_000 },
  { label: '₹15K', value: 15_000 },
  { label: '₹20K', value: 20_000 },
  { label: '₹25K', value: 25_000 },
];

const PARENT_PRESETS = [
  { label: '₹20K', value: 20_000 },
  { label: '₹30K', value: 30_000 },
  { label: '₹40K', value: 40_000 },
  { label: '₹50K', value: 50_000 },
];

export default function HealthInsuranceQuestion({ answers, onNext }) {
  const existingSelf = answers.healthPremiumSelf || 0;
  const existingParents = answers.healthPremiumParents || 0;
  const hasExisting = existingSelf > 0 || existingParents > 0;
  const initialSubState = hasExisting
    ? existingParents > 0 ? 'both' : 'self'
    : 'choice';

  const [subState, setSubState] = useState(initialSubState);
  const [selfInput, setSelfInput] = useState(existingSelf > 0 ? String(existingSelf) : '');
  const [parentsInput, setParentsInput] = useState(existingParents > 0 ? String(existingParents) : '');

  const selfAmount = parseInt(selfInput, 10) || 0;
  const parentsAmount = parseInt(parentsInput, 10) || 0;

  function handleNone() {
    onNext({ healthPremiumSelf: 0, healthPremiumParents: 0 });
  }

  function handleContinue() {
    onNext({
      healthPremiumSelf: selfAmount,
      healthPremiumParents: subState === 'both' ? parentsAmount : 0,
    });
  }

  const canContinue =
    subState === 'self' ? selfAmount > 0 : selfAmount > 0 && parentsAmount > 0;

  // ── Choice screen ─────────────────────────────────────────────
  if (subState === 'choice') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 px-5 pt-4">
          <h2 className="text-lg font-bold leading-snug">
            health insurance beyond employer cover?
          </h2>
          <p className="text-xs text-(--color-muted) mt-1">
            deductible under section 80D
          </p>

          <div className="space-y-2 mt-6">
            <button
              type="button"
              onClick={handleNone}
              className="w-full py-3.5 px-4 border border-(--color-line) bg-transparent
                font-[inherit] text-sm cursor-pointer text-left
                hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt) transition-colors"
            >
              none <span className="text-(--color-muted)">-- employer cover only</span>
            </button>

            <button
              type="button"
              onClick={() => setSubState('self')}
              className="w-full py-3.5 px-4 border border-(--color-line) bg-transparent
                font-[inherit] text-sm cursor-pointer text-left
                hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt) transition-colors"
            >
              self / family
            </button>

            <button
              type="button"
              onClick={() => setSubState('both')}
              className="w-full py-3.5 px-4 border border-(--color-line) bg-transparent
                font-[inherit] text-sm cursor-pointer text-left
                hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt) transition-colors"
            >
              self + parents
            </button>

            <button
              type="button"
              onClick={handleNone}
              className="mt-1 py-2 text-xs text-(--color-muted) underline cursor-pointer
                bg-transparent border-0 font-[inherit] hover:text-(--color-ink)"
              aria-label="Skip health insurance question"
            >
              skip →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Premium input screen ──────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col animate-slide-in">
      <div className="flex-1 px-5 pt-4">
        <h2 className="text-lg font-bold leading-snug">
          {subState === 'both' ? 'health insurance premiums' : 'your health insurance premium'}
        </h2>
        <p className="text-xs text-(--color-muted) mt-1">
          not employer's group cover
        </p>

        {/* Self premium */}
        <div className="mt-5">
          <div className="text-[10px] tracking-[0.15em] text-(--color-muted) uppercase mb-2">
            ── {subState === 'both' ? 'your / family premium' : 'annual premium'} ──
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {SELF_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSelfInput(String(p.value))}
                className={`py-3 border font-[inherit] text-xs cursor-pointer transition-colors
                  ${
                    selfAmount === p.value
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
              placeholder="e.g. 15000"
              value={selfInput}
              onChange={(e) => setSelfInput(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus
              className="flex-1 py-2.5 px-3 text-base border border-(--color-line) bg-(--color-paper)
                font-[inherit] focus:border-(--color-ink) focus:outline-none
                placeholder:text-(--color-line)"
            />
            <span className="text-(--color-muted) text-xs shrink-0">/ year</span>
          </div>
        </div>

        {/* Parents premium */}
        {subState === 'both' && (
          <div className="mt-5">
            <div className="text-[10px] tracking-[0.15em] text-(--color-muted) uppercase mb-2">
              ── parents' premium ─────────────────
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {PARENT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setParentsInput(String(p.value))}
                  className={`py-3 border font-[inherit] text-xs cursor-pointer transition-colors
                    ${
                      parentsAmount === p.value
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
                placeholder="e.g. 25000"
                value={parentsInput}
                onChange={(e) => setParentsInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="flex-1 py-2.5 px-3 text-base border border-(--color-line) bg-(--color-paper)
                  font-[inherit] focus:border-(--color-ink) focus:outline-none
                  placeholder:text-(--color-line)"
              />
              <span className="text-(--color-muted) text-xs shrink-0">/ year</span>
            </div>
          </div>
        )}

        {selfAmount > 0 && (
          <p className="text-xs text-(--color-muted) mt-3">
            total: {formatINR(selfAmount + (subState === 'both' ? parentsAmount : 0))} / year
          </p>
        )}
      </div>

      <div className="shrink-0 px-5 pb-6 pt-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
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
