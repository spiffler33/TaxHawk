import { useState } from 'react';
import { fetchDemo, optimize, parseForm16 } from './api';
import ResultsDashboard from './ResultsDashboard';
import UploadZone from './UploadZone';

const STATES = { IDLE: 'idle', LOADING: 'loading', RESULTS: 'results', ERROR: 'error' };

export default function App() {
  const [state, setState] = useState(STATES.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleDemo() {
    setState(STATES.LOADING);
    setError(null);
    try {
      const data = await fetchDemo();
      setResult(data);
      setState(STATES.RESULTS);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  }

  async function handleFileUpload(file, city, monthlyRent, epf) {
    setState(STATES.LOADING);
    setError(null);
    try {
      // Step 1: Parse Form 16
      const parsed = await parseForm16(file, city, monthlyRent, epf);

      // Step 2: Inject user-provided context
      const salary = {
        ...parsed.profile,
        city,
        monthly_rent: monthlyRent,
      };
      if (epf !== null) salary.epf_employee_contribution = epf;

      // Step 3: Optimize
      const data = await optimize(salary);
      setResult(data);
      setState(STATES.RESULTS);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  }

  function handleReset() {
    setState(STATES.IDLE);
    setResult(null);
    setError(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen">
      {/* ── Header ───────────────────────────────────────── */}
      <header className="mb-8">
        <div className="text-2xl font-bold tracking-tight">TaxHawk</div>
        <div className="text-xs text-(--color-muted) mt-1">
          find money your employer missed
        </div>
        <div className="text-(--color-line) text-[10px] mt-2 select-none">
          ────────────────────────────────────────────────
        </div>
      </header>

      {/* ── Idle State ───────────────────────────────────── */}
      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <div>
          <div className="text-xs text-(--color-muted) mb-4 leading-relaxed">
            Upload your Form 16 PDF or try the demo to see<br />
            how much tax you could save for FY 2024-25.
          </div>

          <div className="mb-6">
            <button
              onClick={handleDemo}
              className="px-6 py-2.5 bg-(--color-ink) text-(--color-paper) border-0 font-[inherit] text-xs tracking-wider cursor-pointer hover:opacity-80"
            >
              [ try demo ]
            </button>
            <span className="text-[10px] text-(--color-muted) ml-3">
              -- uses Priya Sharma, 15 LPA, Mumbai
            </span>
          </div>

          <div className="text-[10px] tracking-[0.2em] text-(--color-muted) uppercase mb-3">
            ── or upload your own ──────────────────────
          </div>

          <UploadZone
            onFileSelected={handleFileUpload}
            loading={state === STATES.LOADING}
          />

          {error && (
            <div className="mt-4 p-3 border border-(--color-red) text-(--color-red) text-xs">
              error: {error}
            </div>
          )}
        </div>
      )}

      {/* ── Loading State ────────────────────────────────── */}
      {state === STATES.LOADING && (
        <div className="text-center py-16">
          <div className="text-sm mb-2">running 6 checks...</div>
          <div className="text-xs text-(--color-muted) animate-pulse">
            ████████████████░░░░░░░░
          </div>
        </div>
      )}

      {/* ── Results State ────────────────────────────────── */}
      {state === STATES.RESULTS && result && (
        <ResultsDashboard result={result} onReset={handleReset} />
      )}

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="mt-12 text-center text-[10px] text-(--color-muted)">
        <div className="select-none">
          ────────────────────────────────────────────────
        </div>
        <div className="mt-2">
          TaxHawk v0.1 -- FY 2024-25 -- not tax advice
        </div>
      </footer>
    </div>
  );
}
