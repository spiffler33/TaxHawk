import { CITY_OPTIONS } from '../../engine/ctcEstimator.js';

export default function CityQuestion({ answers, onNext }) {
  const existing = answers.city || null;

  function handleSelect(cityCode) {
    onNext({ city: cityCode });
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-5 pt-4">
        <h2 className="text-lg font-bold leading-snug">
          which city do you live in?
        </h2>
        <p className="text-xs text-(--color-muted) mt-1">
          metro = higher HRA exemption
        </p>

        {/* City grid — 2 columns */}
        <div className="grid grid-cols-2 gap-2 mt-6">
          {CITY_OPTIONS.map((city) => (
            <button
              key={city.code}
              type="button"
              onClick={() => handleSelect(city.code)}
              className={`py-3.5 px-4 border font-[inherit] text-sm cursor-pointer
                text-left transition-colors
                ${
                  existing === city.code
                    ? 'border-(--color-green) bg-(--color-paper-alt) text-(--color-green) font-bold'
                    : 'border-(--color-line) bg-transparent text-(--color-ink) hover:bg-(--color-paper-alt) active:bg-(--color-paper-alt)'
                }`}
            >
              {city.label}
              {city.metro && (
                <span className="text-[10px] text-(--color-muted) ml-1">
                  *
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-(--color-muted) mt-3">
          * metro = Delhi, Mumbai, Chennai, Kolkata (for HRA calculation)
        </p>
      </div>
    </div>
  );
}
