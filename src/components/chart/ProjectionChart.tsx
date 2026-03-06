"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { YearRow } from "@/engine";

export interface EventMarker {
  age: number;
  emoji: string;
  hexColor: string;
}

interface ProjectionChartProps {
  baselineRows: YearRow[];
  scenarioRows?: YearRow[];
  markers?: EventMarker[];
  /** Hides title/legend header — for embedding in the onboarding preview. */
  compact?: boolean;
}

function formatK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function EventMarkerLabel({
  viewBox,
  emoji,
  hexColor,
}: {
  viewBox?: { x?: number; y?: number };
  emoji: string;
  hexColor: string;
}) {
  const cx = viewBox?.x ?? 0;
  const cy = (viewBox?.y ?? 0) + 13;

  return (
    <g style={{ pointerEvents: "none" }}>
      <circle
        cx={cx}
        cy={cy}
        r={11}
        fill="var(--paper)"
        stroke={hexColor}
        strokeWidth="1.5"
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
      >
        {emoji}
      </text>
    </g>
  );
}

export function ProjectionChart({ baselineRows, scenarioRows, markers, compact }: ProjectionChartProps) {
  const hasScenario = scenarioRows && scenarioRows.length > 0;
  const hasMarkers = markers && markers.length > 0;

  const data = baselineRows.map((row, i) => ({
    age: row.age,
    baseline: Math.max(0, row.endNetWorth),
    scenario: hasScenario
      ? Math.max(0, scenarioRows[i]?.endNetWorth ?? row.endNetWorth)
      : undefined,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Title row + legend — hidden in compact mode */}
      {!compact && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-lora)",
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              Net Worth Projection
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-60)", marginTop: "2px" }}>
              {hasScenario
                ? "With your events (solid) vs without (dashed)"
                : "Without life events"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <LegendItem color="var(--border)" label="Without events" dashed />
            {hasScenario && <LegendItem color="var(--gold)" label="With events" />}
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 22, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="age"
              tick={{
                fontSize: 9,
                fill: "var(--ink-30)",
                fontFamily: "var(--font-geist-mono)",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "var(--ink-30)",
                fontFamily: "var(--font-geist-mono)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatK}
              width={48}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined): [string, string] => [
                value != null ? formatK(value) : "—",
                name === "baseline" ? "Without events" : "With your plan",
              ]}
              labelFormatter={(age) => `Age ${age}`}
              contentStyle={{
                background: "var(--paper)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "11px",
                fontFamily: "var(--font-geist-sans)",
                color: "var(--ink)",
                padding: "8px 12px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
              itemStyle={{ color: "var(--ink-60)" }}
            />

            {/* Event markers — thin vertical lines with emoji badges */}
            {hasMarkers &&
              markers.map((m) => (
                <ReferenceLine
                  key={`${m.age}-${m.emoji}`}
                  x={m.age}
                  stroke={m.hexColor}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  strokeOpacity={0.5}
                  label={
                    <EventMarkerLabel
                      emoji={m.emoji}
                      hexColor={m.hexColor}
                    />
                  }
                />
              ))}

            {/* Baseline — muted, dashed when scenario active */}
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--border)"
              strokeWidth={hasScenario ? 1.5 : 2}
              strokeDasharray={hasScenario ? "4 2" : undefined}
              dot={false}
              activeDot={{ r: 3, fill: "var(--ink-30)", strokeWidth: 0 }}
            />
            {/* Scenario — gold */}
            {hasScenario && (
              <Line
                type="monotone"
                dataKey="scenario"
                stroke="var(--gold)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--gold)", strokeWidth: 0 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      {dashed ? (
        <svg width="16" height="8" style={{ flexShrink: 0 }}>
          <line
            x1="0"
            y1="4"
            x2="16"
            y2="4"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
        </svg>
      ) : (
        <div
          style={{
            width: "16px",
            height: "2px",
            background: color,
            borderRadius: "1px",
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ fontSize: "11px", color: "var(--ink-60)" }}>{label}</span>
    </div>
  );
}
