"use client";

import { useState } from "react";

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  /** When true, the displayed number becomes a text input the user can type into. */
  editable?: boolean;
}

/** Parse a typed money string: "50K" → 50000, "$1.2M" → 1200000, "75000" → 75000 */
function parseMoney(s: string): number | null {
  const clean = s.trim().replace(/[$,\s]/g, "");
  if (!clean) return null;
  let numStr = clean;
  let multiplier = 1;
  if (/[Kk]$/.test(clean)) { numStr = clean.slice(0, -1); multiplier = 1_000; }
  else if (/[Mm]$/.test(clean)) { numStr = clean.slice(0, -1); multiplier = 1_000_000; }
  const n = parseFloat(numStr);
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * multiplier);
}

export function SliderInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
  editable = false,
}: SliderInputProps) {
  const [inputText, setInputText] = useState<string | null>(null);
  const isEditing = inputText !== null;

  // Slider always clamped — value itself can exceed range when editable
  const sliderValue = Math.max(min, Math.min(max, value));
  const pct = ((sliderValue - min) / (max - min)) * 100;

  const displayText = isEditing
    ? inputText
    : (formatValue ? formatValue(value) : String(value));

  const commit = (text: string) => {
    const parsed = parseMoney(text) ?? parseInt(text.replace(/\D/g, ""), 10);
    if (isFinite(parsed) && parsed >= 0) onChange(parsed);
    setInputText(null);
  };

  const displayStyle: React.CSSProperties = {
    fontFamily: "var(--font-lora), Georgia, serif",
    fontSize: "28px",
    fontWeight: 500,
    letterSpacing: "-0.02em",
    color: "var(--gold)",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div className="w-full space-y-3">
      {editable ? (
        <input
          type="text"
          inputMode="numeric"
          value={displayText}
          onFocus={() => setInputText(String(value))}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          style={{
            ...displayStyle,
            width: "100%",
            textAlign: "center",
            background: "transparent",
            border: "none",
            borderBottom: isEditing ? "1.5px solid var(--gold)" : "1.5px solid transparent",
            outline: "none",
            padding: "2px 0 4px",
            cursor: "text",
            transition: "border-color 0.15s",
          }}
        />
      ) : (
        <div
          className="type-display text-center"
          style={{ color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}
        >
          {formatValue ? formatValue(value) : value}
        </div>
      )}

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
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
