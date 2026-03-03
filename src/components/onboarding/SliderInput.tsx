"use client";

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function SliderInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
}: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full space-y-3">
      <div
        className="type-display text-center"
        style={{ color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}
      >
        {formatValue ? formatValue(value) : value}
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
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
      <div
        className="flex justify-between type-body-small"
        style={{ color: "var(--ink-30)" }}
      >
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}
