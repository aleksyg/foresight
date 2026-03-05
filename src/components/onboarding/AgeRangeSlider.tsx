"use client";

import { useEffect, useRef, useState } from "react";

interface AgeRangeSliderProps {
  minAge: number;
  maxAge: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  absoluteMin?: number;
  absoluteMax?: number;
  minGap?: number;
}

export function AgeRangeSlider({
  minAge,
  maxAge,
  onMinChange,
  onMaxChange,
  absoluteMin = 22,
  absoluteMax = 80,
  minGap = 5,
}: AgeRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);

  const range = absoluteMax - absoluteMin;
  const minPct = ((minAge - absoluteMin) / range) * 100;
  const maxPct = ((maxAge - absoluteMin) / range) * 100;

  useEffect(() => {
    if (!activeThumb) return;

    const onMove = (e: PointerEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const raw = Math.round(pct * range + absoluteMin);

      if (activeThumb === "min") {
        const clamped = Math.min(raw, maxAge - minGap);
        onMinChange(Math.max(absoluteMin, clamped));
      } else {
        const clamped = Math.max(raw, minAge + minGap);
        onMaxChange(Math.min(absoluteMax, clamped));
      }
    };

    const onUp = () => setActiveThumb(null);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [activeThumb, minAge, maxAge, absoluteMin, absoluteMax, minGap, range, onMinChange, onMaxChange]);

  const thumbStyle = (active: boolean): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "var(--gold)",
    border: "2px solid var(--paper)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
    transform: "translate(-50%, -50%)",
    cursor: active ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
    zIndex: 2,
  });

  return (
    <div className="w-full space-y-4">
      {/* Large age display */}
      <div
        style={{
          fontFamily: "var(--font-lora), Georgia, serif",
          fontSize: "34px",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--gold)",
          fontVariantNumeric: "tabular-nums",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {minAge} → {maxAge}
      </div>

      {/* Track */}
      <div style={{ position: "relative", padding: "12px 0" }}>
        <div
          ref={trackRef}
          style={{
            position: "relative",
            height: "4px",
            background: "var(--border)",
            borderRadius: "2px",
          }}
        >
          {/* Active range fill */}
          <div
            style={{
              position: "absolute",
              left: `${minPct}%`,
              width: `${maxPct - minPct}%`,
              height: "100%",
              background: "var(--gold)",
              borderRadius: "2px",
            }}
          />

          {/* Min thumb */}
          <div
            style={{ ...thumbStyle(activeThumb === "min"), left: `${minPct}%` }}
            onPointerDown={(e) => {
              e.preventDefault();
              setActiveThumb("min");
            }}
          />

          {/* Max thumb */}
          <div
            style={{ ...thumbStyle(activeThumb === "max"), left: `${maxPct}%` }}
            onPointerDown={(e) => {
              e.preventDefault();
              setActiveThumb("max");
            }}
          />
        </div>

        {/* Labels */}
        <div style={{ position: "relative", marginTop: "10px", height: "16px" }}>
          <span
            className="type-label-caps"
            style={{
              position: "absolute",
              left: `${minPct}%`,
              transform: "translateX(-50%)",
              color: "var(--ink-30)",
              whiteSpace: "nowrap",
            }}
          >
            You today
          </span>
          <span
            className="type-label-caps"
            style={{
              position: "absolute",
              left: `${maxPct}%`,
              transform: "translateX(-50%)",
              color: "var(--ink-30)",
              whiteSpace: "nowrap",
            }}
          >
            Retire at
          </span>
        </div>
      </div>
    </div>
  );
}
