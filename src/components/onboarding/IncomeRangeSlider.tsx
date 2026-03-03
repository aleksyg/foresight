"use client";

const BRACKETS = [50_000, 100_000, 150_000, 200_000, 250_000];
const LABELS = ["$50K", "$100K", "$150K", "$200K", "$250K+"];

interface IncomeRangeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function formatIncome(n: number) {
  if (n >= 250_000) return "$250K+";
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

export function IncomeRangeSlider({ value, onChange }: IncomeRangeSliderProps) {
  const min = 30_000;
  const max = 300_000;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full space-y-3">
      <div
        className="type-display text-center"
        style={{ color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}
      >
        {formatIncome(value)}
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={5000}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none cursor-pointer"
          style={{
            height: "2px",
            background: `linear-gradient(to right, var(--gold) ${pct}%, var(--border) ${pct}%)`,
            borderRadius: "1px",
            outline: "none",
          }}
        />
        <style>{`
          input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--gold);
            border: 2px solid var(--paper);
            box-shadow: 0 1px 4px rgba(0,0,0,0.18);
            cursor: pointer;
          }
          input[type='range']::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--gold);
            border: 2px solid var(--paper);
            box-shadow: 0 1px 4px rgba(0,0,0,0.18);
            cursor: pointer;
          }
        `}</style>
      </div>
      <div className="flex justify-between">
        {BRACKETS.map((bracket, i) => {
          const isActive = Math.abs(value - bracket) < 12_500;
          return (
            <button
              key={bracket}
              type="button"
              onClick={() => onChange(bracket)}
              className="type-body-small transition-colors"
              style={{
                color: isActive ? "var(--gold)" : "var(--ink-30)",
                fontWeight: isActive ? 500 : 300,
              }}
            >
              {LABELS[i]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
