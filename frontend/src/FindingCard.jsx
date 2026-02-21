import { useState } from 'react';

const STATUS_LABEL = {
  opportunity: '[ OPPORTUNITY ]',
  optimized: '[ OPTIMIZED ]',
  not_applicable: '[ N/A ]',
};

const STATUS_COLOR = {
  opportunity: 'text-(--color-green)',
  optimized: 'text-(--color-muted)',
  not_applicable: 'text-(--color-muted)',
};

const CONFIDENCE_MAP = {
  definite: 'definite',
  likely: 'likely',
  needs_verification: 'verify',
};

function formatINR(n) {
  if (n === 0) return '0';
  return n.toLocaleString('en-IN');
}

export default function FindingCard({ check }) {
  const [open, setOpen] = useState(false);

  const hasSavings = check.savings > 0;

  return (
    <div className="border border-(--color-line) bg-(--color-paper) mb-3">
      {/* ── Header ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 cursor-pointer bg-transparent border-0 font-[inherit] text-[inherit] hover:bg-(--color-paper-alt) transition-colors"
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs tracking-widest text-(--color-muted) uppercase mb-1">
              {check.check_name}
            </div>
            <div className="text-sm leading-snug">
              {check.finding}
            </div>
          </div>
          <div className="text-right shrink-0">
            {hasSavings ? (
              <div className="text-lg font-bold text-(--color-green)">
                +{formatINR(check.savings)}
              </div>
            ) : (
              <div className="text-sm text-(--color-muted)">--</div>
            )}
            <div className={`text-[10px] tracking-wider ${STATUS_COLOR[check.status]}`}>
              {STATUS_LABEL[check.status]}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-(--color-muted) mt-2">
          {open ? '[-] collapse' : '[+] expand'}
          {check.confidence && (
            <span className="ml-4">
              confidence: {CONFIDENCE_MAP[check.confidence] || check.confidence}
            </span>
          )}
        </div>
      </button>

      {/* ── Expanded Detail ──────────────────────────────── */}
      {open && (
        <div className="border-t border-(--color-line) p-4 text-xs leading-relaxed bg-(--color-paper-alt)">
          {check.action && (
            <div className="mb-3">
              <span className="text-(--color-muted)">action  : </span>
              {check.action}
            </div>
          )}
          {check.deadline && (
            <div className="mb-3">
              <span className="text-(--color-muted)">deadline: </span>
              {check.deadline}
            </div>
          )}
          {check.explanation && (
            <div className="mb-3">
              <div className="text-(--color-muted) mb-1">explanation:</div>
              <pre className="whitespace-pre-wrap font-[inherit] m-0 pl-2 border-l-2 border-(--color-line)">
                {check.explanation}
              </pre>
            </div>
          )}
          {check.details && Object.keys(check.details).length > 0 && (
            <div>
              <div className="text-(--color-muted) mb-1">details:</div>
              <pre className="whitespace-pre-wrap font-[inherit] m-0 pl-2 border-l-2 border-(--color-line) text-[11px]">
                {JSON.stringify(check.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
