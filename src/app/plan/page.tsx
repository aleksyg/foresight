"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePlanStore } from "@/store/planStore";
import { simulatePlan } from "@/engine";
import type { LifeEvent, Mutation } from "@/scenario/lifeEvents/types";
import { computeMilestones, type MilestoneResult } from "@/scenario/compute/milestoneEtas";
import { buildOverridesFromLifeEvent } from "@/scenario/lifeEvents/toTargetedOverrides";
import { buildScenarioYearInputsFromOverrides, extendYearInputsToAge } from "@/rulespec/index";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { OnboardingInputs } from "@/store/onboardingStore";
import { buildPlanFromOnboarding } from "@/lib/buildPlanFromOnboarding";
import { LifeEventsSidebar } from "@/components/layout/LifeEventsSidebar";
import { RoadmapPanel } from "@/components/layout/RoadmapPanel";
import { ProjectionChart } from "@/components/chart/ProjectionChart";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  label: ReactNode;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--paper)",
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
          background: "var(--paper)",
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
          background: "var(--paper)",
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

function MilestonesTab({
  milestones,
  currentNetWorth,
  startAge,
}: {
  milestones: MilestoneResult[];
  currentNetWorth: number;
  startAge: number;
}) {
  const nextMilestone = milestones.find((m) => m.state === "next");
  const reachedCount = milestones.filter((m) => m.state === "reached").length;

  return (
    <div style={{ padding: "20px 28px 28px" }}>
      {/* Summary bar */}
      <div
        style={{
          background: "var(--paper)",
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
            {reachedCount > 0 ? `${reachedCount} reached · next` : "Next milestone"}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--gold)",
              marginTop: "2px",
            }}
          >
            {nextMilestone ? `${nextMilestone.name} · ${nextMilestone.amountLabel}` : "All reached 🎉"}
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
        {milestones.map((m) => {
          const isNext = m.state === "next";
          const isReached = m.state === "reached";

          const etaLabel = m.etaAge != null
            ? `Age ${m.etaAge} · ${m.etaAge - startAge}y away`
            : "Beyond projection";

          return (
            <div
              key={m.id}
              style={{
                background: isReached
                  ? "linear-gradient(135deg, #FEFDF9 0%, #F8F5EC 100%)"
                  : "var(--surface)",
                border: isReached
                  ? "1.5px solid var(--gold)"
                  : isNext
                    ? "1.5px solid var(--border)"
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
                  filter: !isNext && !isReached ? "grayscale(1)" : "none",
                  opacity: !isNext && !isReached ? 0.55 : 1,
                }}
              >
                {m.emoji}
              </div>

              <div
                style={{
                  fontFamily: "var(--font-lora)",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: isReached || isNext ? "var(--ink)" : "var(--ink-60)",
                }}
              >
                {m.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: "13px",
                  color: isNext ? "var(--gold)" : isReached ? "var(--ink-60)" : "var(--ink-30)",
                  fontWeight: 500,
                  marginTop: "2px",
                }}
              >
                {m.amountLabel}
              </div>

              {isReached ? (
                <div style={{ fontSize: "11px", color: "var(--sage)", fontWeight: 500, marginTop: "6px" }}>
                  ✓ Reached
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "11px",
                    color: isNext ? "var(--ink-60)" : "var(--ink-30)",
                    marginTop: "6px",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                >
                  {etaLabel}
                </div>
              )}

              {/* Progress bar — shown for next milestone only */}
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
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  fontSize: "11px",
                  color: isReached || isNext ? "var(--ink-60)" : "var(--ink-30)",
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

/* ── Inputs debug tab (temporary — remove component, TABS entry, and render line) ── */

function InputsTab() {
  const inputs = useOnboardingStore((s) => s.inputs);
  const plan   = usePlanStore((s) => s.plan);

  const inc = inputs.householdIncome ?? 120_000;
  const sav = inputs.totalSavings ?? 50_000;
  const hv  = inputs.homeValue ?? Math.round(inc * 3);

  const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, "")}%`;
  const a   = plan?.assumptions;

  const firstRow = useMemo(() => {
    if (!plan) return null;
    return simulatePlan(plan, { minEndAge: plan.endAge })[0] ?? null;
  }, [plan]);

  const grossIncome = plan
    ? plan.household.user.income.baseAnnual + (plan.household.partner?.income.baseAnnual ?? 0)
    : 1;
  const effRate = (n: number) =>
    grossIncome > 0 ? `${((n / grossIncome) * 100).toFixed(1)}%` : "—";

  // Effective values with defaults
  const rows: {
    group: string;
    label: string;
    value: string;
    assumed: boolean;
  }[] = [
    // Income & Spending
    { group: "Income & Spending",  label: "Income",              value: `$${inc.toLocaleString()}/yr`,                                          assumed: false },
    { group: "Income & Spending",  label: "Rent",                value: `$${(inputs.monthlyRent ?? Math.round(inc / 40)).toLocaleString()}/mo`,  assumed: inputs.monthlyRent === undefined },
    { group: "Income & Spending",  label: "Lifestyle spend",     value: `$${(inputs.lifestyleMonthly ?? Math.round(inc * 0.25 / 12)).toLocaleString()}/mo`, assumed: inputs.lifestyleMonthly === undefined },
    { group: "Income & Spending",  label: "Partner",             value: inputs.hasPartner ? "Yes" : "No",                                        assumed: inputs.hasPartner === undefined },
    ...(inputs.hasPartner ? [
      { group: "Income & Spending", label: "Partner age",        value: String(inputs.partnerAge ?? inputs.age ?? 30),                           assumed: inputs.partnerAge === undefined },
      { group: "Income & Spending", label: "Partner income",     value: `$${(inputs.partnerIncome ?? 80_000).toLocaleString()}/yr`,               assumed: inputs.partnerIncome === undefined },
    ] : []),

    // Savings
    { group: "Savings",  label: "Total savings",          value: `$${sav.toLocaleString()}`,                                                                                             assumed: false },
    { group: "Savings",  label: "Retirement accounts",    value: `$${(inputs.retirementSavings ?? Math.round(sav * 0.7)).toLocaleString()}`,     assumed: inputs.retirementSavings === undefined },
    { group: "Savings",  label: "Cash & savings",         value: `$${(inputs.cashSavings ?? Math.round(sav * 0.3)).toLocaleString()}`,           assumed: inputs.cashSavings === undefined },
    { group: "Savings",  label: "Taxable investments",    value: `$${(inputs.brokerageSavings ?? 0).toLocaleString()}`,                         assumed: inputs.brokerageSavings === undefined },

    // Housing
    { group: "Housing",  label: "Status",                 value: inputs.housing === "own" ? "Own" : "Rent",                                      assumed: false },
    ...(inputs.housing === "own" ? [
      { group: "Housing", label: "Home value",            value: `$${hv.toLocaleString()}`,                                                      assumed: inputs.homeValue === undefined },
      { group: "Housing", label: "Has mortgage",          value: (inputs.hasMortgage ?? true) ? "Yes" : "No",                                   assumed: inputs.hasMortgage === undefined },
      ...((inputs.hasMortgage ?? true) ? [
        { group: "Housing", label: "Mortgage balance",    value: `$${(inputs.mortgageBalance ?? Math.round(hv * 0.75)).toLocaleString()}`,       assumed: inputs.mortgageBalance === undefined },
      ] : []),
    ] : []),

    // Retirement & 401(k)
    { group: "Retirement & 401(k)", label: "Your age",           value: String(inputs.age ?? 30),                                                assumed: false },
    { group: "Retirement & 401(k)", label: "Retirement target",  value: `Age ${inputs.retirementAge ?? 62}`,                                    assumed: false },
    { group: "Retirement & 401(k)", label: "Has 401(k)",         value: (inputs.has401k ?? true) ? "Yes" : "No",                                assumed: inputs.has401k === undefined },
    ...((inputs.has401k ?? true) ? [
      { group: "Retirement & 401(k)", label: "Contribution",     value: `${inputs.contributionPct ?? 6}%`,                                      assumed: inputs.contributionPct === undefined },
      { group: "Retirement & 401(k)", label: "Employer match",   value: (inputs.hasEmployerMatch ?? true) ? "Yes" : "No",                       assumed: inputs.hasEmployerMatch === undefined },
      ...((inputs.hasEmployerMatch ?? true) ? [
        { group: "Retirement & 401(k)", label: "Match rate",     value: `${inputs.employerMatchPct ?? 50}%`,                                    assumed: inputs.employerMatchPct === undefined },
        { group: "Retirement & 401(k)", label: "Match cap",      value: `${inputs.employerMatchUpToPct ?? 6}% of salary`,                       assumed: inputs.employerMatchUpToPct === undefined },
      ] : []),
    ] : []),

    // Debt & Expenses
    { group: "Debt & Expenses", label: "Has debt",               value: (inputs.hasDebt ?? false) ? "Yes" : "No",                               assumed: inputs.hasDebt === undefined },
    ...(inputs.hasDebt ? [
      { group: "Debt & Expenses", label: "Debt balance",         value: `$${(inputs.debtBalance ?? 0).toLocaleString()}`,                       assumed: false },
      { group: "Debt & Expenses", label: "Debt APR",             value: "6.5%",                                                                 assumed: true },
      { group: "Debt & Expenses", label: "Payoff term",          value: "5 years",                                                              assumed: true },
    ] : []),
    { group: "Debt & Expenses", label: "Has children",           value: (inputs.hasChildren ?? false) ? "Yes" : "No",                           assumed: inputs.hasChildren === undefined },
    ...(inputs.hasChildren ? [
      { group: "Debt & Expenses", label: "Children cost",        value: `$${(inputs.childrenMonthlyCost ?? 1_500).toLocaleString()}/mo`,         assumed: inputs.childrenMonthlyCost === undefined },
      { group: "Debt & Expenses", label: "Child age",            value: "0 (newborn)",                                                          assumed: true },
    ] : []),

    // Income Details (never exposed)
    { group: "Income Details",  label: "Bonus income",           value: "None",                                                                  assumed: true },
    { group: "Income Details",  label: "Pre-tax deductions",     value: "$0/mo",                                                                 assumed: true },
    { group: "Income Details",  label: "Income growth rate",     value: pct(plan?.household.user.income.incomeGrowthRate ?? 0.03),               assumed: true },
    ...(inputs.hasPartner ? [
      { group: "Income Details", label: "Partner contribution",  value: pct((plan?.household.partner?.income.retirement.employeePreTaxContributionPct ?? 6) / 100), assumed: true },
      { group: "Income Details", label: "Partner match",         value: "50% up to 6%",                                                         assumed: true },
    ] : []),

    // Model Assumptions (never exposed)
    { group: "Model Assumptions", label: "Investment return",    value: pct(a?.returnRate   ?? 0.07),   assumed: true },
    { group: "Model Assumptions", label: "Inflation rate",       value: pct(a?.inflationRate ?? 0.025),  assumed: true },
    { group: "Model Assumptions", label: "Cash / HYSA rate",     value: pct(a?.cashRate     ?? 0.04),   assumed: true },
    { group: "Model Assumptions", label: "Home appreciation",    value: pct(plan?.balanceSheet.home.appreciationPct ?? 0), assumed: true },
    { group: "Model Assumptions", label: "Federal effective rate", value: firstRow ? effRate(firstRow.federalIncomeTax) : "—", assumed: true },
    { group: "Model Assumptions", label: "State effective rate",  value: firstRow ? effRate(firstRow.stateIncomeTax)   : "—", assumed: true },
    { group: "Model Assumptions", label: "Payroll effective rate",value: firstRow ? effRate(firstRow.payrollTax)        : "—", assumed: true },
    { group: "Model Assumptions", label: "Total effective rate",  value: firstRow ? effRate(firstRow.taxesPaid)         : "—", assumed: true },
  ];

  const groups = Array.from(new Set(rows.map((r) => r.group)));

  return (
    <div style={{ padding: "20px 28px 28px" }}>
      <div
        style={{
          fontSize: "11px",
          color: "var(--ink-30)",
          fontFamily: "var(--font-geist-sans)",
          marginBottom: "16px",
        }}
      >
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>■</span> you provided &nbsp;
        <span style={{ color: "var(--rose)", fontWeight: 500 }}>■</span> assumed default
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {groups.map((group) => (
          <div
            key={group}
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 500,
                color: "var(--ink-60)",
              }}
            >
              {group}
            </div>
            {rows.filter((r) => r.group === group).map((row, i, arr) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--ink-60)",
                    fontFamily: "var(--font-geist-sans)",
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "var(--font-geist-mono)",
                    fontWeight: 500,
                    color: row.assumed ? "var(--rose)" : "var(--ink)",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Retirement age inline editor ───────────────────────────── */

function RetirementAgeEditor({
  currentAge,
  retirementAge,
  onCommit,
}: {
  currentAge: number;
  retirementAge: number;
  onCommit: (age: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(retirementAge));
  const [error, setError] = useState(false);
  const cancelRef = useRef(false);

  function startEdit() {
    setDraft(String(retirementAge));
    setError(false);
    cancelRef.current = false;
    setEditing(true);
  }

  function commit() {
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed > currentAge) {
      onCommit(parsed);
      setEditing(false);
      setError(false);
    } else {
      setError(true);
    }
  }

  function cancel() {
    cancelRef.current = true;
    setEditing(false);
    setError(false);
    setDraft(String(retirementAge));
  }

  if (!editing) {
    return (
      <span
        title="Adjust your retirement age"
        onClick={startEdit}
        style={{
          cursor: "pointer",
          textDecoration: "underline dotted",
          textDecorationColor: "rgba(0,0,0,0.3)",
          textUnderlineOffset: "2px",
        }}
      >
        {retirementAge}
      </span>
    );
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(false); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onBlur={commit}
        style={{
          width: `${Math.max(2, draft.length)}ch`,
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          letterSpacing: "inherit",
          textTransform: "none",
          border: "none",
          borderBottom: `1px solid ${error ? "var(--rose)" : "var(--ink)"}`,
          outline: "none",
          background: "transparent",
          color: error ? "var(--rose)" : "inherit",
          padding: 0,
          MozAppearance: "textfield",
        } as React.CSSProperties}
      />
      {error && (
        <span
          style={{
            position: "absolute",
            bottom: "-16px",
            left: 0,
            fontSize: "9px",
            color: "var(--rose)",
            whiteSpace: "nowrap",
            textTransform: "none",
            fontFamily: "var(--font-geist-mono)",
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          Must be &gt; age {currentAge}
        </span>
      )}
    </span>
  );
}

/* ── Main page ───────────────────────────────────────────────── */

const TABS = [
  { id: "dashboard" as const,   label: "Dashboard"         },
  { id: "allocation" as const,  label: "Allocation Detail" },
  { id: "milestones" as const,  label: "Milestones"        },
  { id: "inputs" as const,      label: "Inputs"            },
];

const SIM_MAX_AGE = 85;

export default function PlanPage() {
  const router = useRouter();
  const { plan, activeTab, setActiveTab, lifeEvents, setPlan } = usePlanStore();
  const { inputs, setField } = useOnboardingStore();

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

  const milestones = useMemo(
    () => computeMilestones(plan, rows, lifeEvents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, rows, lifeEvents],
  );

  const baseRetireNW = baselineRows.find((r) => r.age === plan.endAge)?.endNetWorth ?? 0;
  const scenarioDelta = projectedAtRetirement - baseRetireNW;

  // Estimate savings rate from first year's simulation data
  const firstSimRow = baselineRows[0];
  const annualSavings = firstSimRow?.annualSavings ?? 0;
  const annualIncome = plan.household.user.income.baseAnnual;
  const savingsRate = annualIncome > 0
    ? Math.max(0, Math.round((annualSavings / annualIncome) * 100))
    : 0;

  function handleRetirementAgeChange(newAge: number) {
    setField("retirementAge", newAge);
    const mergedInputs = { ...inputs, retirementAge: newAge } as OnboardingInputs;
    setPlan(buildPlanFromOnboarding(mergedInputs));
  }

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
            label={<>At retirement · Age <RetirementAgeEditor currentAge={plan.startAge} retirementAge={plan.endAge} onCommit={handleRetirementAgeChange} /></>}
            value={fmt(projectedAtRetirement)}
            delta={
              scenarioRows.length > 0 && Math.abs(scenarioDelta) >= 1000
                ? `${scenarioDelta >= 0 ? "▲" : "▼"} ${fmt(Math.abs(scenarioDelta))} vs without events`
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
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 28px 0",
            flexShrink: 0,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", gap: 0 }}>
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
          <div style={{ paddingBottom: "8px" }}>
            <ThemeToggle />
          </div>
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
          {activeTab === "milestones" && (
            <MilestonesTab
              milestones={milestones}
              currentNetWorth={currentNetWorth}
              startAge={plan.startAge}
            />
          )}
          {activeTab === "inputs" && <InputsTab />}
        </div>
      </main>

      {/* Right roadmap */}
      <RoadmapPanel />
    </div>
  );
}
