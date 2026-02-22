export default function ParentsAgeQuestion({ answers, onNext }) {
  const existing = answers.parentsOver60;

  function handleSelect(over60) {
    onNext({ parentsOver60: over60 });
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-5 pt-4">
        <h2 className="text-lg font-bold leading-snug">
          are your parents over 60?
        </h2>
        <p className="text-xs text-(--color-muted) mt-1">
          senior = ₹50K limit vs ₹25K
        </p>

        <div className="space-y-2 mt-6">
          <button
            type="button"
            onClick={() => handleSelect(false)}
            className={`w-full py-3.5 px-4 border font-[inherit] text-sm cursor-pointer
              text-left transition-colors
              ${
                existing === false
                  ? 'border-(--color-green) bg-(--color-paper-alt) text-(--color-green) font-bold'
                  : 'border-(--color-line) bg-transparent text-(--color-ink) hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt)'
              }`}
          >
            under 60
          </button>

          <button
            type="button"
            onClick={() => handleSelect(true)}
            className={`w-full py-3.5 px-4 border font-[inherit] text-sm cursor-pointer
              text-left transition-colors
              ${
                existing === true
                  ? 'border-(--color-green) bg-(--color-paper-alt) text-(--color-green) font-bold'
                  : 'border-(--color-line) bg-transparent text-(--color-ink) hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt)'
              }`}
          >
            over 60 <span className="text-(--color-muted)">-- senior citizen</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(false)}
            className="mt-1 py-2 text-xs text-(--color-muted) underline cursor-pointer
              bg-transparent border-0 font-[inherit] hover:text-(--color-ink)"
            aria-label="Skip parents age question"
          >
            skip →
          </button>
        </div>
      </div>
    </div>
  );
}
