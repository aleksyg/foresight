"use client";

import { useMemo } from "react";
import type { OnboardingInputs } from "@/store/onboardingStore";
import { buildPlanFromOnboarding } from "@/lib/buildPlanFromOnboarding";
import { simulatePlan } from "@/engine";
import { ProjectionChart } from "@/components/chart/ProjectionChart";

const SIM_MAX_AGE = 85;

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function fmtComma(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface OnboardingPreviewProps {
  inputs: Partial<OnboardingInputs>;
  step: number;
}

export function OnboardingPreview({ inputs, step }: OnboardingPreviewProps) {
  const age = inputs.age ?? 30;
  const householdIncome = inputs.householdIncome ?? 120_000;
  const totalSavings = inputs.totalSavings ?? 50_000;
  const housing = inputs.housing ?? "rent";
  const retirementAge = inputs.retirementAge ?? 62;

  const monthlyRent = inputs.monthlyRent;
  const lifestyleMonthly = inputs.lifestyleMonthly;
  const hasPartner = inputs.hasPartner;
  const partnerAge = inputs.partnerAge;
  const partnerIncome = inputs.partnerIncome;
  const employerMatchPct = inputs.employerMatchPct;
  const employerMatchUpToPct = inputs.employerMatchUpToPct;
  const monthlyMortgage = inputs.monthlyMortgage;

  const rows = useMemo(() => {
    const plan = buildPlanFromOnboarding({
      firstName: "there",
      age,
      householdIncome,
      totalSavings,
      housing,
      retirementAge,
      monthlyRent,
      lifestyleMonthly,
      hasPartner,
      partnerAge,
      partnerIncome,
      employerMatchPct,
      employerMatchUpToPct,
      monthlyMortgage,
    });
    return simulatePlan(plan, { minEndAge: SIM_MAX_AGE });
  }, [age, householdIncome, totalSavings, housing, retirementAge,
      monthlyRent, lifestyleMonthly, hasPartner, partnerAge, partnerIncome,
      employerMatchPct, employerMatchUpToPct, monthlyMortgage]);

  const retirementRow = rows.find((r) => r.age === retirementAge) ?? rows[rows.length - 1];
  const projectedNW = retirementRow?.endNetWorth ?? 0;
  const monthlyTakeHome = rows[0] ? Math.round(rows[0].afterTaxIncome / 12) : 0;
  const housingMonthly = rows[0]?.housingMonthly ?? 0;
  const yearsToRetire = retirementAge - age;

  let eyebrow: string;
  let primary: string;
  let detail: string;

  if (step === 1) {
    eyebrow = "years to retirement";
    primary = String(yearsToRetire);
    detail = `${fmt(projectedNW)} projected at age ${retirementAge} · est.`;
  } else if (step === 2) {
    eyebrow = "monthly take-home";
    primary = fmtComma(monthlyTakeHome);
    detail = `After taxes · ${fmt(projectedNW)} projected at retirement`;
  } else if (step === 3) {
    eyebrow = `projected at age ${retirementAge}`;
    primary = fmt(projectedNW);
    detail = `${fmt(totalSavings)} working for you now · growing at 7%/yr`;
  } else if (step === 4) {
    const housingLabel =
      housing === "own"
        ? `Owning · ${fmtComma(housingMonthly)}/mo`
        : `Renting · ${fmtComma(housingMonthly)}/mo`;
    eyebrow = `projected at age ${retirementAge}`;
    primary = fmt(projectedNW);
    detail = `${housingLabel} · ${yearsToRetire} years to grow`;
  } else {
    eyebrow = `projected at age ${retirementAge}`;
    primary = fmt(projectedNW);
    detail = `${yearsToRetire} years of compounding · you're on track`;
  }

  return (
    <div
      style={{
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
        pointerEvents: step >= 1 ? "auto" : "none",
      }}
    >
      {/* Stat card */}
      <div
        style={{
          background: "var(--gold-bg)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--ink-30)",
            marginBottom: "4px",
            fontFamily: "var(--font-geist-sans)",
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: "var(--font-lora), Georgia, serif",
            fontSize: "34px",
            fontWeight: 500,
            color: "var(--gold)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: "6px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {primary}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--ink-60)",
            fontFamily: "var(--font-geist-sans)",
            lineHeight: 1.4,
          }}
        >
          {detail}
        </div>
      </div>

      {/* Mini projection chart */}
      <div
        style={{
          height: "180px",
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "12px 8px 8px",
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%" }}>
          <ProjectionChart baselineRows={rows} compact />
        </div>
      </div>
    </div>
  );
}
