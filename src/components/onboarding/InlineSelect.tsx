"use client";

import { useEffect, useRef, useState } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface InlineSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
}

export function InlineSelect<T extends string>({
  value,
  onChange,
  options,
}: InlineSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <span
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: "11px",
          fontWeight: 300,
          borderBottom: open ? "1px solid var(--ink-60)" : "1px dashed var(--ink-30)",
          cursor: "pointer",
          color: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLElement).style.borderBottomColor = "var(--ink-60)";
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLElement).style.borderBottomColor = "var(--ink-30)";
        }}
      >
        {selectedLabel}
      </span>

      {open && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            background: "var(--paper)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            minWidth: "200px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: "8px 12px",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-geist-sans)",
                fontSize: "12px",
                fontWeight: opt.value === value ? 500 : 400,
                color: opt.value === value ? "var(--gold)" : "var(--ink-60)",
                width: "100%",
              }}
            >
              {opt.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
