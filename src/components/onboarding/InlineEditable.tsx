"use client";

import { useState } from "react";

interface InlineEditableProps {
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  min?: number;
  max?: number;
}

function parseMoney(s: string): number | null {
  const clean = s.trim().replace(/[$,\s]/g, "");
  if (!clean) return null;
  let numStr = clean;
  let multiplier = 1;
  if (/[Kk]$/.test(clean)) { numStr = clean.slice(0, -1); multiplier = 1_000; }
  else if (/[Mm]$/.test(clean)) { numStr = clean.slice(0, -1); multiplier = 1_000_000; }
  // Strip trailing % for percentage inputs
  else if (/%$/.test(clean)) { numStr = clean.slice(0, -1); }
  const n = parseFloat(numStr);
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * multiplier);
}

export function InlineEditable({
  value,
  onChange,
  format,
  min = 0,
  max = Infinity,
}: InlineEditableProps) {
  const [editText, setEditText] = useState<string | null>(null);
  const isEditing = editText !== null;

  const commit = (text: string) => {
    const parsed = parseMoney(text);
    if (parsed !== null && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
    setEditText(null);
  };

  const sharedStyle: React.CSSProperties = {
    fontFamily: "var(--font-geist-sans)",
    fontSize: "11px",
    fontWeight: 300,
    lineHeight: "inherit",
  };

  if (isEditing) {
    return (
      <input
        type="text"
        autoFocus
        value={editText}
        size={Math.max(editText.length, 4)}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditText(null);
        }}
        style={{
          ...sharedStyle,
          background: "transparent",
          border: "none",
          borderBottom: "1.5px solid var(--gold)",
          outline: "none",
          color: "var(--gold)",
          padding: "0 1px 1px",
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditText(format(value))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditText(format(value));
        }
      }}
      style={{
        ...sharedStyle,
        borderBottom: "1px dashed var(--ink-30)",
        cursor: "text",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor = "var(--ink-60)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor = "var(--ink-30)";
      }}
    >
      {format(value)}
    </span>
  );
}
