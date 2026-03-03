"use client";

type Priority = 1 | 2 | 3 | 4;

interface AllocRow {
  label: string;
  detail: string;
  amount: string;
  priority: Priority;
}

interface RoadmapPhase {
  fromAge: number;
  toAge: number | null;
  income: string;
  current: boolean;
  eventBadge?: { emoji: string; label: string; color: string; bg: string };
  allocations: AllocRow[];
}

const PRIORITY_DOT: Record<Priority, string> = {
  1: "var(--gold)",
  2: "var(--slate)",
  3: "var(--sage)",
  4: "var(--plum)",
};

const PHASES: RoadmapPhase[] = [
  {
    fromAge: 30,
    toAge: 31,
    income: "$140K",
    current: true,
    allocations: [
      { label: "Emergency Fund (HYSA)", detail: "Building to 6mo cushion", amount: "$388/mo", priority: 1 },
      { label: "401(k) to employer match", detail: "4% to capture full match", amount: "$483/mo", priority: 2 },
      { label: "HSA max", detail: "Triple tax-advantaged health", amount: "$305/mo", priority: 3 },
      { label: "Down payment savings", detail: "Targeting $90K by age 37", amount: "$1,288/mo", priority: 2 },
      { label: "Taxable brokerage", detail: "Flexibility + liquidity buffer", amount: "$573/mo", priority: 4 },
    ],
  },
  {
    fromAge: 31,
    toAge: 32,
    income: "$160K",
    current: false,
    eventBadge: { emoji: "💍", label: "Marriage", color: "var(--gold)", bg: "var(--gold-bg)" },
    allocations: [
      { label: "401(k) to employer match", detail: "4% to capture full match", amount: "$483/mo", priority: 2 },
      { label: "HSA max", detail: "Triple tax-advantaged health", amount: "$305/mo", priority: 3 },
      { label: "Down payment savings", detail: "Targeting $90K by age 37", amount: "$1,288/mo", priority: 2 },
      { label: "Taxable brokerage", detail: "Flexibility + liquidity buffer", amount: "$573/mo", priority: 4 },
    ],
  },
  {
    fromAge: 33,
    toAge: null,
    income: "$160K",
    current: false,
    eventBadge: { emoji: "👶", label: "First child", color: "var(--rose)", bg: "var(--rose-bg)" },
    allocations: [
      { label: "401(k) to employer match", detail: "4% to capture full match", amount: "$483/mo", priority: 2 },
      { label: "HSA max", detail: "Triple tax-advantaged health", amount: "$305/mo", priority: 3 },
      { label: "Down payment savings", detail: "Targeting $90K by age 37", amount: "$1,028/mo", priority: 2 },
    ],
  },
];

function AllocRow({ row }: { row: AllocRow }) {
  const isPriority1 = row.priority === 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        padding: "7px 10px",
        background: isPriority1 ? "var(--gold-bg)" : "var(--surface)",
        borderRadius: "8px",
        border: isPriority1 ? "1px solid var(--gold)" : "1px solid transparent",
      }}
    >
      <div
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: PRIORITY_DOT[row.priority],
          flexShrink: 0,
          marginTop: "5px",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 }}>
          {row.label}
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--ink-60)", marginTop: "1px", lineHeight: 1.4 }}>
          {row.detail}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-geist-mono)",
          fontSize: "11px",
          fontWeight: 500,
          color: isPriority1 ? "var(--gold)" : "var(--ink-60)",
          whiteSpace: "nowrap",
          paddingTop: "1px",
        }}
      >
        {row.amount}
      </div>
    </div>
  );
}

export function RoadmapPanel() {
  return (
    <aside
      style={{
        width: "320px",
        minWidth: "320px",
        background: "white",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 20px 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: "15px",
            fontWeight: 500,
            color: "var(--ink)",
          }}
        >
          Financial Roadmap
        </div>
        <div style={{ fontSize: "11px", color: "var(--ink-60)", marginTop: "2px" }}>
          Your allocation plan, updated for life events
        </div>
      </div>

      {/* Phases */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 20px",
        }}
      >
        {PHASES.map((phase, i) => (
          <div
            key={`${phase.fromAge}-${phase.toAge ?? "+"}`}
            style={{
              position: "relative",
              paddingLeft: "26px",
              marginBottom: "20px",
            }}
          >
            {/* Vertical line */}
            {i < PHASES.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "22px",
                  bottom: "-20px",
                  width: "1px",
                  background: "var(--border)",
                }}
              />
            )}

            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: "6px",
                top: "5px",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                border: `1.5px solid ${phase.current ? "var(--gold)" : "var(--border)"}`,
                background: phase.current ? "var(--gold)" : "white",
              }}
            />

            {/* Age label */}
            <div
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: phase.current ? "var(--gold)" : "var(--ink-30)",
                fontWeight: 500,
                fontFamily: "var(--font-geist-mono)",
                marginBottom: "6px",
              }}
            >
              {phase.toAge
                ? `Ages ${phase.fromAge}–${phase.toAge} · ${phase.income} income`
                : `Age ${phase.fromAge}+ · ${phase.income} income`}
              {phase.current && " · Now"}
            </div>

            {/* Event badge */}
            {phase.eventBadge && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  fontWeight: 500,
                  padding: "2px 7px",
                  borderRadius: "20px",
                  marginBottom: "6px",
                  background: phase.eventBadge.bg,
                  color: phase.eventBadge.color,
                  border: `1px solid ${phase.eventBadge.color}40`,
                }}
              >
                {phase.eventBadge.emoji} {phase.eventBadge.label}
              </div>
            )}

            {/* Allocation rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {phase.allocations.map((row) => (
                <AllocRow key={row.label} row={row} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
