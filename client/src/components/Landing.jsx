/**
 * Landing screen -- Meridian: every element earns its place.
 *
 * 5 elements total:
 *   1. Brand name
 *   2. Value prop (one line)
 *   3. Supporting context (one line, dot-separated)
 *   4. Primary + secondary CTA
 *   5. Trust badge
 *
 * @param {object} props
 * @param {function} props.onStart - Begin 8-question wizard
 * @param {function} props.onDemo  - Load Priya's demo profile and skip to results
 */
export default function Landing({ onStart, onDemo }) {
  return (
    <div className="min-h-dvh min-h-[100svh] flex flex-col bg-(--color-paper) px-5">
      {/* Hero -- centered vertically */}
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="text-2xl font-bold tracking-tight">taxhawk</div>

        <p className="text-sm text-(--color-muted) mt-4 leading-relaxed max-w-xs">
          find money your employer missed.
        </p>

        <div className="mt-3 text-[11px] text-(--color-muted)">
          30 seconds {'\u00B7'} 8 questions {'\u00B7'} no sign-up
        </div>
      </div>

      {/* Bottom CTA + privacy */}
      <div className="shrink-0 pb-8 space-y-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-3.5 bg-(--color-ink) text-(--color-paper) border-0
            font-[inherit] text-xs tracking-wider cursor-pointer
            hover:opacity-80 active:opacity-70 transition-opacity"
        >
          [ find my savings ]
        </button>

        <button
          type="button"
          onClick={onDemo}
          className="w-full py-3 bg-transparent text-(--color-muted) border border-(--color-line)
            font-[inherit] text-xs tracking-wider cursor-pointer
            hover:text-(--color-ink) transition-colors"
        >
          [ see demo ]
        </button>

        <div className="text-center text-[10px] text-(--color-muted) mt-2">
          * your data never leaves your phone
        </div>

        <div className="text-center text-[10px] text-(--color-muted) mt-3 leading-relaxed">
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
    </div>
  );
}
