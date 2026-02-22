import { useState } from 'react';
import { formatINR } from '../utils/format.js';

/**
 * AdjustPanel — inline collapsible panel for correcting salary assumptions.
 *
 * The CTC estimator uses industry-standard ratios (40% basic, 20% HRA, 12% EPF).
 * This panel lets users who know their actual salary structure correct these
 * values for more accurate results. Editing triggers an instant recalculation.
 *
 * @param {object} props
 * @param {number} props.ctc - Original CTC from answers
 * @param {object} props.profile - Current SalaryProfile (pre-fills fields)
 * @param {function} props.onApply - Called with { basic, hra, epf, gross, special }
 * @param {function} props.onClose - Close the panel
 */
export default function AdjustPanel({ ctc, profile, onApply, onClose }) {
  const [basic, setBasic] = useState(profile.basic_salary);
  const [hra, setHra] = useState(profile.hra_received);
  const [epf, setEpf] = useState(profile.epf_employee_contribution);

  // Derive dependent values from edited inputs + original CTC
  const employerEpf = epf; // employee and employer EPF are mirrored
  const gratuity = Math.round(basic * 0.0481);
  const gross = ctc - employerEpf - gratuity;
  const special = Math.max(gross - basic - hra, 0);

  const handleApply = () => {
    onApply({ basic, hra, epf, gross, special });
  };

  return (
    <div className="border border-(--color-line) bg-(--color-paper-alt) p-4 mt-3 animate-slide-in">
      <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-3">
        ── adjust salary structure ────────────
      </div>

      <div className="space-y-3 text-xs">
        <Field label="basic salary" value={basic} onChange={setBasic} />
        <Field label="hra received" value={hra} onChange={setHra} />
        <Field label="epf (employee)" value={epf} onChange={setEpf} />

        <div className="text-(--color-line) text-[10px] select-none">
          ─────────────────────────────────
        </div>

        <div className="flex justify-between items-center gap-3">
          <span className="text-(--color-muted)">gross salary</span>
          <span className="text-(--color-muted) tabular-nums">{formatINR(gross)}</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-(--color-muted)">special allowance</span>
          <span className="text-(--color-muted) tabular-nums">{formatINR(special)}</span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 py-3 bg-(--color-ink) text-(--color-paper) border-0
            font-[inherit] text-xs tracking-wider cursor-pointer
            hover:opacity-80 active:opacity-70 transition-opacity"
        >
          [ recalculate ]
        </button>
        <button
          type="button"
          onClick={onClose}
          className="py-3 px-4 bg-transparent text-(--color-muted) border border-(--color-line)
            font-[inherit] text-xs cursor-pointer hover:text-(--color-ink) transition-colors"
        >
          [ cancel ]
        </button>
      </div>
    </div>
  );
}

/**
 * Editable number field with label.
 */
function Field({ label, value, onChange }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <label className="text-(--color-muted) shrink-0">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-32 text-right bg-transparent border-b border-(--color-line)
          font-[inherit] text-xs p-1 outline-none focus:border-(--color-green)
          text-(--color-ink) tabular-nums"
      />
    </div>
  );
}
