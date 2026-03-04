"use client";

import { useState } from "react";

const BRACKETS = [50_000, 100_000, 150_000, 200_000, 250_000];
const LABELS = ["$50K", "$100K", "$150K", "$200K", "$250K+"];

const MIN = 30_000;
const MAX = 300_000;

interface IncomeRangeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function formatIncome(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

/** Parse a typed money string: "250K" → 250000, "$1.2M" → 1200000, "180000" → 180000 */
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

export function IncomeRangeSlider({ value, onChange }: IncomeRangeSliderProps) {
  const [inputText, setInputText] = useState<string | null>(null);
  const isEditing = inputText !== null;

  // Slider clamped to [MIN, MAX]; typed value can exceed range
  const sliderValue = Math.max(MIN, Math.min(MAX, value));
  const pct = ((sliderValue - MIN) / (MAX - MIN)) * 100;

  const displayText = isEditing ? inputText : formatIncome(value);

  const commit = (text: string) => {
    const parsed = parseMoney(text) ?? parseInt(text.replace(/\D/g, ""), 10);
    if (isFinite(parsed) && parsed >= 0) onChange(parsed);
    setInputText(null);
  };

  return (
    <div className="w-full space-y-3">
      {/* Editable large number */}
      <input
        type="text"
        inputMode="numeric"
        value={displayText}
        onFocus={() => setInputText(String(value))}
        onChange={(e) => setInputText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        style={{
          width: "100%",
          textAlign: "center",
          fontFamily: "var(--font-lora), Georgia, serif",
          fontSize: "28px",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--gold)",
          fontVariantNumeric: "tabular-nums",
          background: "transparent",
          border: "none",
          borderBottom: isEditing ? "1.5px solid var(--gold)" : "1.5px solid transparent",
          outline: "none",
          padding: "2px 0 4px",
          cursor: "text",
          transition: "border-color 0.15s",
        }}
      />

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={5000}
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

      {/* Bracket buttons */}
      <div className="flex justify-between">
        {BRACKETS.map((bracket, i) => {
          const isActive = Math.abs(sliderValue - bracket) < 12_500;
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
