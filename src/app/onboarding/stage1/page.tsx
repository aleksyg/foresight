"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { usePlanStore } from "@/store/planStore";
import { buildPlanFromOnboarding } from "@/lib/buildPlanFromOnboarding";
import { SliderInput } from "@/components/onboarding/SliderInput";
import { IncomeRangeSlider } from "@/components/onboarding/IncomeRangeSlider";
import { TapSelect } from "@/components/onboarding/TapSelect";
import type { OnboardingInputs } from "@/store/onboardingStore";

const TOTAL_STEPS = 6;

function formatAge(n: number) {
  return `${n}`;
}

function formatSavings(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

export default function Stage1Page() {
  const router = useRouter();
  const { step, inputs, setStep, setField } = useOnboardingStore();
  const setPlan = usePlanStore((s) => s.setPlan);
  const [nameInput, setNameInput] = useState(inputs.firstName ?? "");

  const currentStep = step;

  const advance = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setStep(currentStep + 1);
    } else {
      // Final step — build plan and go
      const completeInputs: OnboardingInputs = {
        firstName: inputs.firstName ?? "there",
        age: inputs.age ?? 30,
        householdIncome: inputs.householdIncome ?? 120_000,
        totalSavings: inputs.totalSavings ?? 50_000,
        housing: inputs.housing ?? "rent",
        retirementAge: inputs.retirementAge ?? 62,
      };
      const plan = buildPlanFromOnboarding(completeInputs);
      setPlan(plan);
      router.push("/plan");
    }
  };

  const back = () => {
    if (currentStep > 0) setStep(currentStep - 1);
  };

  const canAdvance = () => {
    if (currentStep === 0) return nameInput.trim().length > 0;
    return true;
  };

  const handleNameSubmit = () => {
    if (!nameInput.trim()) return;
    setField("firstName", nameInput.trim());
    advance();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--paper)" }}
    >
      {/* Progress bar */}
      <div
        className="h-0.5 transition-all duration-500"
        style={{
          background: "var(--border)",
        }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`,
            background: "var(--gold)",
          }}
        />
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-between px-8 pt-6">
        <button
          type="button"
          onClick={back}
          className="type-body-small transition-opacity"
          style={{
            color: "var(--ink-60)",
            opacity: currentStep === 0 ? 0 : 1,
            pointerEvents: currentStep === 0 ? "none" : "auto",
          }}
        >
          ← Back
        </button>
        <span className="type-label-caps" style={{ color: "var(--ink-30)" }}>
          {currentStep + 1} / {TOTAL_STEPS}
        </span>
        <div className="w-12" />
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-lg space-y-10">
          {currentStep === 0 && (
            <StepName
              value={nameInput}
              onChange={setNameInput}
              onSubmit={handleNameSubmit}
            />
          )}
          {currentStep === 1 && (
            <StepAge
              value={inputs.age ?? 30}
              onChange={(v) => setField("age", v)}
            />
          )}
          {currentStep === 2 && (
            <StepIncome
              value={inputs.householdIncome ?? 120_000}
              onChange={(v) => setField("householdIncome", v)}
            />
          )}
          {currentStep === 3 && (
            <StepSavings
              value={inputs.totalSavings ?? 50_000}
              onChange={(v) => setField("totalSavings", v)}
            />
          )}
          {currentStep === 4 && (
            <StepHousing
              value={inputs.housing ?? "rent"}
              onChange={(v) => setField("housing", v)}
            />
          )}
          {currentStep === 5 && (
            <StepRetirementAge
              value={inputs.retirementAge ?? 62}
              onChange={(v) => setField("retirementAge", v)}
            />
          )}

          {/* CTA */}
          {currentStep !== 0 && (
            <button
              type="button"
              onClick={advance}
              disabled={!canAdvance()}
              className="w-full rounded-2xl py-4 type-body transition-all"
              style={{
                background: canAdvance() ? "var(--gold)" : "var(--border)",
                color: canAdvance() ? "var(--paper)" : "var(--ink-30)",
                fontWeight: 500,
                cursor: canAdvance() ? "pointer" : "not-allowed",
              }}
            >
              {currentStep === TOTAL_STEPS - 1 ? "Show me my plan →" : "Continue →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Individual step components ────────────────────────────── */

function StepName({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="type-display" style={{ color: "var(--ink)" }}>
          Give us 90 seconds.
        </h1>
        <p className="type-body" style={{ color: "var(--ink-60)" }}>
          We&apos;ll show you where you stand.
        </p>
      </div>
      <div className="space-y-3">
        <label
          htmlFor="first-name"
          className="type-label-caps"
          style={{ color: "var(--ink-60)" }}
        >
          First name
        </label>
        <input
          id="first-name"
          type="text"
          autoFocus
          placeholder="Alex"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          className="w-full rounded-xl border px-4 py-3 type-body outline-none transition-all"
          style={{
            borderColor: "var(--border)",
            background: "white",
            color: "var(--ink)",
          }}
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim()}
        className="w-full rounded-2xl py-4 type-body transition-all"
        style={{
          background: value.trim() ? "var(--gold)" : "var(--border)",
          color: value.trim() ? "var(--paper)" : "var(--ink-30)",
          fontWeight: 500,
          cursor: value.trim() ? "pointer" : "not-allowed",
        }}
      >
        Let&apos;s go →
      </button>
    </div>
  );
}

function StepAge({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          How old are you?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          Sets the starting point for your projection.
        </p>
      </div>
      <SliderInput
        value={value}
        min={22}
        max={65}
        onChange={onChange}
        formatValue={formatAge}
      />
    </div>
  );
}

function StepIncome({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          Household income?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          Total annual — rough is fine.
        </p>
      </div>
      <IncomeRangeSlider value={value} onChange={onChange} />
    </div>
  );
}

function StepSavings({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          Total savings?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          Cash + investments + retirement accounts. Rough is fine.
        </p>
      </div>
      <SliderInput
        value={value}
        min={0}
        max={500_000}
        step={5_000}
        onChange={onChange}
        formatValue={formatSavings}
        editable
      />
    </div>
  );
}

function StepHousing({
  value,
  onChange,
}: {
  value: "rent" | "own";
  onChange: (v: "rent" | "own") => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          Do you rent or own?
        </h2>
      </div>
      <TapSelect
        value={value}
        onChange={onChange}
        options={[
          { value: "rent", label: "Rent", emoji: "🏢", sublabel: "No mortgage" },
          { value: "own", label: "Own", emoji: "🏠", sublabel: "Have a mortgage or own outright" },
        ]}
      />
    </div>
  );
}

function StepRetirementAge({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          When do you want to retire?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          This sets your financial independence target.
        </p>
      </div>
      <SliderInput
        value={value}
        min={50}
        max={70}
        onChange={onChange}
        formatValue={(v) => `Age ${v}`}
      />
    </div>
  );
}
