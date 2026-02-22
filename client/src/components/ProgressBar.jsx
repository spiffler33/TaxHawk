/**
 * Thin progress bar — terminal aesthetic.
 * Uses theme colors: green fill on line background.
 */
export default function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div
      className="h-px bg-(--color-line) w-full"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Question ${current + 1} of ${total}`}
    >
      <div
        className="h-px bg-(--color-green) transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
