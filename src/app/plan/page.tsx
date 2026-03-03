"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { usePlanStore } from "@/store/planStore";
import { simulatePlan } from "@/engine";
import type { LifeEvent, Mutation } from "@/scenario/lifeEvents/types";
import { buildOverridesFromLifeEvent } from "@/scenario/lifeEvents/toTargetedOverrides";
import { buildScenarioYearInputsFromOverrides, extendYearInputsToAge } from "@/rulespec/index";
import { LifeEventsSidebar } from "@/components/layout/LifeEventsSidebar";
import { RoadmapPanel } from "@/components/layout/RoadmapPanel";
import { ProjectionChart } from "@/components/chart/ProjectionChart";

/* ── Helpers ─────────────────────────────────────────────────── */

function fmt(n: number, decimals = 1) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function fmtPct(n: number) {
  return `${Math.round(n)}%`;
}

/* ── Event marker helpers ────────────────────────────────────── */

const EVENT_MARKER: Record<string, { emoji: string; hexColor: string }> = {
  marriage:    { emoji: "💍", hexColor: "#B8922A" },
  first_child: { emoji: "👶", hexColor: "#8B3D3D" },
  home:        { emoji: "🏠", hexColor: "#3D5470" },
  career:      { emoji: "🚀", hexColor: "#3D6B50" },
  sabbatical:  { emoji: "🌍", hexColor: "#8B5A2B" },
  college:     { emoji: "🎓", hexColor: "#5C3D70" },
};

function getMutationStartAge(m: Mutation): number | null {
  switch (m.kind) {
    case "income_set_range":
    case "income_growth_range":
    case "income_cap_range":
    case "expense_recurring":
      return m.startAge;
    case "income_milestone":
    case "income_one_time_bonus":
    case "income_growth_step":
    case "expense_one_time":
    case "home_purchase":
      return m.age;
    default:
      return null;
  }
}

function getEventTriggerAge(evt: LifeEvent): number | null {
  for (const m of evt.mutations) {
    const age = getMutationStartAge(m);
    if (age != null) return age;
  }
  return null;
}

/* ── Event display metadata ───────────────────────────────────── */

const EVENT_DISPLAY_META: Record<string, { emoji: string; color: string; bg: string; desc: string }> = {
  marriage:    { emoji: "💍", color: "var(--gold)",  bg: "var(--gold-bg)",  desc: "Shared cost savings from age 31" },
  first_child: { emoji: "👶", color: "var(--rose)",  bg: "var(--rose-bg)",  desc: "Childcare + expenses through age 18" },
  home:        { emoji: "🏠", color: "var(--slate)", bg: "var(--slate-bg)", desc: "$450K home purchase at age 35" },
  career:      { emoji: "🚀", color: "var(--sage)",  bg: "var(--sage-bg)",  desc: "Senior role salary leap at age 40" },
  sabbatical:  { emoji: "🌍", color: "var(--amber)", bg: "var(--amber-bg)", desc: "One year off at age 45" },
  college:     { emoji: "🎓", color: "var(--plum)",  bg: "var(--plum-bg)",  desc: "Four years college expenses from age 47" },
};

/* ── Milestone data ──────────────────────────────────────────── */

const MILESTONES = [
  {
    id: "emergency",
    emoji: "🌱",
    name: "Emergency Fund",
    amount: "$30K",
    state: "next" as "next" | "locked" | "reached",
    eta: "Age 31 · 1y away",
    progress: 72,
    why: "Six months of expenses covered — sleep soundly.",
  },
  {
    id: "100k",
    emoji: "🏆",
    name: "First $100K",
    amount: "$100K",
    state: "locked" as const,
    eta: "Age 32 · 2y away",
    progress: 0,
    why: "The hardest milestone. Compounding starts working for you.",
  },
  {
    id: "downpayment",
    emoji: "🏡",
    name: "Down Payment Ready",
    amount: "$90K",
    state: "locked" as const,
    eta: "Age 37 · 7y away",
    progress: 0,
    why: "Ready to buy without touching retirement.",
  },
  {
    id: "250k",
    emoji: "💎",
    name: "Quarter Million",
    amount: "$250K",
    state: "locked" as const,
    eta: "Age 39 · 9y away",
    progress: 0,
    why: "You've built a real financial foundation.",
  },
  {
    id: "500k",
    emoji: "⚡",
    name: "Half a Million",
    amount: "$500K",
    state: "locked" as const,
    eta: "Age 44 · 14y away",
    progress: 0,
    why: "Your portfolio earns more annually than most people save.",
  },
  {
    id: "1m",
    emoji: "🌟",
    name: "Seven Figures",
    amount: "$1M",
    state: "locked" as const,
    eta: "Age 52 · 22y away",
    progress: 0,
    why: "The second million comes faster.",
  },
];

/* ── Allocation data ─────────────────────────────────────────── */

const ALLOC_PHASES = [
  {
    label: "Age 30",
    income: "$140K",
    rows: [
      { priority: 1 as const, label: "Emergency Fund (HYSA)", detail: "Building to 6mo cushion", monthly: "$388/mo", annual: "$4,656", bucket: "Emergency" },
      { priority: 2 as const, label: "401(k) to employer match", detail: "4% to capture full match", monthly: "$483/mo", annual: "$5,796", bucket: "Tax-sheltered" },
      { priority: 3 as const, label: "HSA max", detail: "Triple tax-advantaged health", monthly: "$305/mo", annual: "$3,660", bucket: "Growth" },
      { priority: 2 as const, label: "Down payment savings", detail: "Targeting $90K by age 37", monthly: "$1,288/mo", annual: "$15,432", bucket: "Tax-sheltered" },
      { priority: 4 as const, label: "Taxable brokerage", detail: "Flexibility + liquidity buffer", monthly: "$573/mo", annual: "$6,876", bucket: "Flexibility" },
    ],
  },
  {
    label: "Ages 31–32 · 💍 Marriage",
    income: "$160K",
    rows: [
      { priority: 2 as const, label: "401(k) to employer match", detail: "4% to capture full match", monthly: "$483/mo", annual: "$5,796", bucket: "Tax-sheltered" },
      { priority: 3 as const, label: "HSA max", detail: "Triple tax-advantaged health", monthly: "$305/mo", annual: "$3,660", bucket: "Growth" },
      { priority: 2 as const, label: "Down payment savings", detail: "Targeting $90K by age 37", monthly: "$1,288/mo", annual: "$15,432", bucket: "Tax-sheltered" },
      { priority: 4 as const, label: "Taxable brokerage", detail: "Flexibility + liquidity buffer", monthly: "$483/mo", annual: "$5,796", bucket: "Flexibility" },
    ],
  },
];

const PRIORITY_COLOR: Record<number, { fg: string; bg: string }> = {
  1: { fg: "var(--gold)",  bg: "var(--gold-bg)"  },
  2: { fg: "var(--slate)", bg: "var(--slate-bg)" },
  3: { fg: "var(--sage)",  bg: "var(--sage-bg)"  },
  4: { fg: "var(--plum)",  bg: "var(--plum-bg)"  },
};

/* ── Sub-components ──────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  delta,
  deltaPositive,
  small,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-60)",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-lora)",
          fontSize: small ? "15px" : "22px",
          fontWeight: 500,
          color: "var(--ink)",
          marginTop: "4px",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            fontSize: "11px",
            marginTop: "2px",
            fontWeight: 500,
            color: deltaPositive ? "var(--sage)" : "var(--rose)",
          }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function DashboardTab({
  baselineRows,
  scenarioRows,
  activeEvents,
}: {
  baselineRows: ReturnType<typeof simulatePlan>;
  scenarioRows: ReturnType<typeof simulatePlan>;
  activeEvents: LifeEvent[];
}) {
  const baseEnd = baselineRows[baselineRows.length - 1]?.endNetWorth ?? 0;
  const scenEnd = scenarioRows.length > 0
    ? scenarioRows[scenarioRows.length - 1]?.endNetWorth ?? baseEnd
    : baseEnd;
  const totalDelta = scenEnd - baseEnd;

  const chartMarkers = activeEvents.flatMap((evt) => {
    const age = getEventTriggerAge(evt);
    const info = EVENT_MARKER[evt.id];
    if (age == null || !info) return [];
    return [{ age, emoji: info.emoji, hexColor: info.hexColor }];
  });

  return (
    <div style={{ padding: "20px 28px 28px" }}>
      {/* Chart */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px",
          marginBottom: "16px",
          height: "280px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ProjectionChart
          baselineRows={baselineRows}
          scenarioRows={scenarioRows.length > 0 ? scenarioRows : undefined}
          markers={chartMarkers}
        />
      </div>

      {/* Active events impact */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-60)",
              fontWeight: 500,
            }}
          >
            Active events
          </div>
          {activeEvents.length > 0 && (
            <div
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-geist-mono)",
                fontWeight: 500,
                color: totalDelta >= 0 ? "var(--sage)" : "var(--rose)",
              }}
            >
              {totalDelta >= 0 ? "+" : ""}{fmt(totalDelta)} at retirement
            </div>
          )}
        </div>

        {activeEvents.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--ink-60)", fontStyle: "italic" }}>
            No active life events — toggle some on in the sidebar.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {activeEvents.map((evt) => {
              const meta = EVENT_DISPLAY_META[evt.id] ?? {
                emoji: "✦",
                color: "var(--gold)",
                bg: "var(--gold-bg)",
                desc: "",
              };
              return (
                <div
                  key={evt.id}
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: meta.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    {meta.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink)" }}>
                      {evt.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--ink-60)" }}>
                      {meta.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MilestonesTab({ currentNetWorth }: { currentNetWorth: number }) {
  return (
    <div style={{ padding: "20px 28px 28px" }}>
      {/* Summary bar */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "14px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-60)",
              fontWeight: 500,
            }}
          >
            Current net worth
          </div>
          <div
            style={{
              fontFamily: "var(--font-lora)",
              fontSize: "28px",
              fontWeight: 500,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
              marginTop: "2px",
            }}
          >
            {fmt(currentNetWorth, 0)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-60)",
              fontWeight: 500,
            }}
          >
            Next milestone
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--gold)",
              marginTop: "2px",
            }}
          >
            First $100K
          </div>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        {MILESTONES.map((m) => {
          const isNext = m.state === "next";
          const isReached = m.state === "reached";
          return (
            <div
              key={m.id}
              style={{
                background: isReached
                  ? "linear-gradient(135deg, #FEFDF9 0%, #F8F5EC 100%)"
                  : "white",
                border: isReached
                  ? "1.5px solid var(--gold)"
                  : "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Badge */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  marginBottom: "10px",
                  background: isReached
                    ? "linear-gradient(135deg, #FFF8E6 0%, #FDECC0 100%)"
                    : "var(--surface)",
                  opacity: !isNext && !isReached ? 0.5 : 1,
                  filter: !isNext && !isReached ? "grayscale(1)" : "none",
                }}
              >
                {m.emoji}
              </div>

              <div
                style={{
                  fontFamily: "var(--font-lora)",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                {m.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: "13px",
                  color: isNext ? "var(--gold)" : "var(--ink-60)",
                  fontWeight: 500,
                  marginTop: "2px",
                }}
              >
                {m.amount}
              </div>

              {isReached ? (
                <div style={{ fontSize: "11px", color: "var(--sage)", fontWeight: 500, marginTop: "6px" }}>
                  ✓ Reached at age 31
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: "var(--ink-60)", marginTop: "6px" }}>
                  {m.eta}
                </div>
              )}

              {/* Progress bar — show for next milestone */}
              {isNext && (
                <div
                  style={{
                    height: "3px",
                    background: "var(--border)",
                    borderRadius: "2px",
                    marginTop: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${m.progress}%`,
                      background: "var(--gold)",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-60)",
                  marginTop: "8px",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                {m.why}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AllocationTab() {
  return (
    <div style={{ padding: "20px 28px 28px" }}>
      {/* Drift alert */}
      <div
        style={{
          background: "var(--amber-bg)",
          border: "1px solid var(--amber)",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "16px",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "14px", flexShrink: 0 }}>⚡</span>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--amber)", marginBottom: "2px" }}>
            Home purchase in 7 years
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--amber)", lineHeight: 1.5 }}>
            Roadmap has reduced brokerage contributions to prioritize down payment savings at $750/mo.
          </div>
        </div>
      </div>

      {/* Allocation sections */}
      {ALLOC_PHASES.map((phase) => (
        <div key={phase.label} style={{ marginBottom: "28px" }}>
          {/* Section header */}
          <div
            style={{
              fontFamily: "var(--font-lora)",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: "10px",
              paddingBottom: "8px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {phase.label}
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Account / Goal", "Monthly", "Annual", "Priority"].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--ink-30)",
                      fontWeight: 500,
                      textAlign: h === "Account / Goal" ? "left" : "right",
                      padding: "0 0 8px",
                      paddingLeft: h !== "Account / Goal" ? "12px" : 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {phase.rows.map((row) => {
                const pc = PRIORITY_COLOR[row.priority];
                return (
                  <tr key={row.label}>
                    <td
                      style={{
                        fontSize: "12px",
                        color: "var(--ink)",
                        padding: "8px 0",
                        borderTop: "1px solid var(--border)",
                        verticalAlign: "top",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: pc.bg,
                            color: pc.fg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "9px",
                            fontWeight: 600,
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          {row.priority}
                        </div>
                        <div>
                          {row.label}
                          <div
                            style={{
                              fontSize: "10.5px",
                              color: "var(--ink-60)",
                              marginTop: "2px",
                              lineHeight: 1.4,
                            }}
                          >
                            {row.detail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        fontSize: "12px",
                        color: "var(--ink)",
                        padding: "8px 0 8px 12px",
                        borderTop: "1px solid var(--border)",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono)",
                        verticalAlign: "top",
                      }}
                    >
                      {row.monthly}
                    </td>
                    <td
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-60)",
                        padding: "8px 0 8px 12px",
                        borderTop: "1px solid var(--border)",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono)",
                        verticalAlign: "top",
                      }}
                    >
                      {row.annual}
                    </td>
                    <td
                      style={{
                        padding: "8px 0 8px 12px",
                        borderTop: "1px solid var(--border)",
                        textAlign: "right",
                        verticalAlign: "top",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          fontSize: "10px",
                          fontWeight: 500,
                          background: pc.bg,
                          color: pc.fg,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.bucket}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */

const TABS = [
  { id: "dashboard" as const,   label: "Dashboard"         },
  { id: "allocation" as const,  label: "Allocation Detail" },
  { id: "milestones" as const,  label: "Milestones"        },
];

const SIM_MAX_AGE = 85;

export default function PlanPage() {
  const router = useRouter();
  const { plan, activeTab, setActiveTab, lifeEvents } = usePlanStore();

  useEffect(() => {
    if (!plan) router.replace("/onboarding/stage1");
  }, [plan, router]);

  const baselineRows = useMemo(
    () => (plan ? simulatePlan(plan, { minEndAge: SIM_MAX_AGE }) : []),
    [plan]
  );

  const activeEvents = lifeEvents.filter((e) => e.enabled);

  const scenarioRows = useMemo(() => {
    if (!plan || activeEvents.length === 0) return [];
    const overrides = activeEvents.flatMap((e) =>
      buildOverridesFromLifeEvent(e, { minAge: plan.startAge, maxAge: SIM_MAX_AGE })
    );
    const yearInputs = extendYearInputsToAge(
      buildScenarioYearInputsFromOverrides(plan, overrides),
      plan,
      SIM_MAX_AGE,
    );
    return simulatePlan(plan, { yearInputs, minEndAge: SIM_MAX_AGE });
  }, [plan, activeEvents]);

  if (!plan) {
    return null; // useEffect above handles the redirect
  }

  const firstName = (plan as unknown as { firstName?: string }).firstName ?? "Alex";
  const activeCount = activeEvents.length;

  const rows = scenarioRows.length > 0 ? scenarioRows : baselineRows;
  const retireRow = rows.find((r) => r.age === plan.endAge);
  const firstRow  = baselineRows[0];
  const projectedAtRetirement = retireRow?.endNetWorth ?? 0;
  const currentNetWorth = firstRow?.endNetWorth ?? 0;

  const baseRetireNW = baselineRows.find((r) => r.age === plan.endAge)?.endNetWorth ?? 0;
  const scenarioDelta = projectedAtRetirement - baseRetireNW;

  // Estimate savings rate from first year's simulation data
  const firstSimRow = baselineRows[0];
  const annualSavings = firstSimRow?.annualSavings ?? 0;
  const annualIncome = plan.household.user.income.baseAnnual;
  const savingsRate = annualIncome > 0
    ? Math.max(0, Math.round((annualSavings / annualIncome) * 100))
    : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 320px",
        height: "100vh",
        overflow: "hidden",
        background: "var(--paper)",
      }}
    >
      {/* Left sidebar */}
      <LifeEventsSidebar />

      {/* Main */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--paper)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 28px 0", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-lora)",
              fontSize: "26px",
              fontWeight: 500,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            Hello, {firstName}.
          </div>
          <div style={{ fontSize: "12px", color: "var(--ink-60)", marginTop: "4px" }}>
            {activeCount} life events active · Age {plan.startAge} Today
          </div>
        </div>

        {/* Hero metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            padding: "16px 28px 0",
            flexShrink: 0,
          }}
        >
          <MetricCard
            label={`At retirement · Age ${plan.endAge}`}
            value={fmt(projectedAtRetirement)}
            delta={
              scenarioRows.length > 0 && Math.abs(scenarioDelta) >= 1000
                ? `${scenarioDelta >= 0 ? "▲" : "▼"} ${fmt(Math.abs(scenarioDelta))} vs baseline`
                : undefined
            }
            deltaPositive={scenarioDelta >= 0}
          />
          <MetricCard
            label="Monthly savings rate"
            value={fmtPct(savingsRate)}
            delta={savingsRate >= 20 ? "Above 20% target" : "Below 20% target"}
            deltaPositive={savingsRate >= 20}
          />
          <MetricCard
            label="Next milestone"
            value="First $100K"
            delta="Age 32 · 2y away"
            deltaPositive
            small
          />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            padding: "14px 28px 0",
            flexShrink: 0,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: activeTab === tab.id ? "var(--ink)" : "var(--ink-60)",
                padding: "8px 14px",
                borderBottom: activeTab === tab.id
                  ? "2px solid var(--ink)"
                  : "2px solid transparent",
                marginBottom: "-1px",
                transition: "all 0.15s",
                letterSpacing: "0.01em",
                background: "none",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {activeTab === "dashboard"  && (
            <DashboardTab
              baselineRows={baselineRows}
              scenarioRows={scenarioRows}
              activeEvents={activeEvents}
            />
          )}
          {activeTab === "allocation" && <AllocationTab />}
          {activeTab === "milestones" && <MilestonesTab currentNetWorth={currentNetWorth} />}
        </div>
      </main>

      {/* Right roadmap */}
      <RoadmapPanel />
    </div>
  );
}
