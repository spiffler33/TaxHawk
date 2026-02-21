import FindingCard from './FindingCard';

function formatINR(n) {
  return n.toLocaleString('en-IN');
}

export default function ResultsDashboard({ result, onReset }) {
  return (
    <div>
      {/* ── Hero: Total Savings ──────────────────────────── */}
      <div className="border border-(--color-line) p-6 mb-6 text-center">
        <div className="text-xs tracking-[0.3em] text-(--color-muted) uppercase mb-2">
          total savings found
        </div>
        <div className="text-4xl font-bold text-(--color-green) mb-1">
          +{formatINR(result.total_savings)}
        </div>
        <div className="text-xs text-(--color-muted)">
          {result.user_name} / FY {result.financial_year}
        </div>
        <div className="text-xs mt-2">
          <span className="text-(--color-muted)">current: </span>
          {result.current_regime} regime
          <span className="mx-2 text-(--color-line)">|</span>
          <span className="text-(--color-muted)">recommended: </span>
          <span className="text-(--color-green) font-bold">{result.recommended_regime} regime</span>
        </div>
      </div>

      {/* ── Summary ──────────────────────────────────────── */}
      {result.summary && (
        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-[inherit] mb-6 p-4 border-l-2 border-(--color-green) bg-(--color-paper-alt)">
          {result.summary}
        </pre>
      )}

      {/* ── Section header ───────────────────────────────── */}
      <div className="text-xs tracking-[0.2em] text-(--color-muted) uppercase mb-3">
        ── checks ({result.checks.length}) ──────────────────────────
      </div>

      {/* ── Finding Cards ────────────────────────────────── */}
      {result.checks.map((check) => (
        <FindingCard key={check.check_id} check={check} />
      ))}

      {/* ── Disclaimer ───────────────────────────────────── */}
      <div className="text-[10px] text-(--color-muted) mt-6 p-3 border border-dashed border-(--color-line) leading-relaxed">
        {result.disclaimer}
      </div>

      {/* ── Reset ────────────────────────────────────────── */}
      <div className="mt-6 text-center">
        <button
          onClick={onReset}
          className="text-xs text-(--color-muted) hover:text-(--color-ink) underline cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          [start over]
        </button>
      </div>
    </div>
  );
}
