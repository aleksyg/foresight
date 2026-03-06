"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { OnboardingInputs } from "@/store/onboardingStore";
import { usePlanStore } from "@/store/planStore";
import { buildPlanFromOnboarding } from "@/lib/buildPlanFromOnboarding";
import { SliderInput } from "@/components/onboarding/SliderInput";
import { IncomeRangeSlider } from "@/components/onboarding/IncomeRangeSlider";
import { TapSelect } from "@/components/onboarding/TapSelect";
import { OnboardingPreview } from "@/components/onboarding/OnboardingPreview";
import { InlineEditable } from "@/components/onboarding/InlineEditable";
import { InlineSelect } from "@/components/onboarding/InlineSelect";
import { AgeRangeSlider } from "@/components/onboarding/AgeRangeSlider";
import { ThemeToggle } from "@/components/ThemeToggle";

const TOTAL_STEPS = 7;

function formatSavings(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

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

export default function Stage1Page() {
  const router = useRouter();
  const { step, inputs, setStep, setField } = useOnboardingStore();
  const setPlan = usePlanStore((s) => s.setPlan);
  const [nameInput, setNameInput] = useState(inputs.firstName ?? "");

  const currentStep = step;

  const advance = () => {
    if (currentStep === 3) {
      // Fold unallocated savings into cash before advancing
      const total = inputs.totalSavings ?? 50_000;
      const ret = inputs.retirementSavings ?? 0;
      const bro = inputs.brokerageSavings ?? 0;
      const cash = inputs.cashSavings ?? 0;
      const allocated = ret + bro + cash;
      const remainder = total - allocated;
      if (remainder > 0 && allocated > 0) {
        setField("cashSavings", cash + remainder);
      }
    }

    if (currentStep < TOTAL_STEPS - 1) {
      setStep(currentStep + 1);
    } else {
      const completeInputs: OnboardingInputs = {
        firstName: inputs.firstName ?? "there",
        age: inputs.age ?? 30,
        householdIncome: inputs.householdIncome ?? 120_000,
        totalSavings: inputs.totalSavings ?? 50_000,
        housing: inputs.housing ?? "rent",
        retirementAge: inputs.retirementAge ?? 62,
        monthlyRent: inputs.monthlyRent,
        lifestyleMonthly: inputs.lifestyleMonthly,
        hasPartner: inputs.hasPartner,
        partnerAge: inputs.partnerAge,
        partnerIncome: inputs.partnerIncome,
        employerMatchPct: inputs.employerMatchPct,
        employerMatchUpToPct: inputs.employerMatchUpToPct,
        monthlyMortgage: inputs.monthlyMortgage,
        cashSavings: inputs.cashSavings,
        retirementSavings: inputs.retirementSavings,
        brokerageSavings: inputs.brokerageSavings,
        homeValue: inputs.homeValue,
        hasMortgage: inputs.hasMortgage,
        mortgageBalance: inputs.mortgageBalance,
        has401k: inputs.has401k,
        contributionPct: inputs.contributionPct,
        hasEmployerMatch: inputs.hasEmployerMatch,
        hasDebt: inputs.hasDebt,
        debtBalance: inputs.debtBalance,
        hasChildren: inputs.hasChildren,
        childrenMonthlyCost: inputs.childrenMonthlyCost,
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
      <div className="h-0.5" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`,
            background: "var(--gold)",
          }}
        />
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-end px-8 pt-6" style={{ gap: "12px" }}>
        <ThemeToggle />
        <span className="type-label-caps" style={{ color: "var(--ink-30)" }}>
          {currentStep + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 relative">
        {/* Back button — floats left of the form */}
        {currentStep > 0 && (
          <button
            type="button"
            onClick={back}
            aria-label="Go back"
            className="absolute left-6 group"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            <span
              className="flex items-center justify-center rounded-full transition-colors duration-150"
              style={{
                width: "40px",
                height: "40px",
                color: "var(--gold)",
                background: "transparent",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "var(--gold-bg)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="13 4 7 10 13 16" />
              </svg>
            </span>
          </button>
        )}

        <div
          className="w-full flex items-center gap-12"
          style={{
            maxWidth: currentStep >= 1 ? "900px" : "480px",
            transition: "max-width 0.5s ease",
          }}
        >
          {/* Left: form */}
          <div className="flex-1 min-w-0 space-y-10">
            {currentStep === 0 && (
              <StepName
                value={nameInput}
                onChange={setNameInput}
                onSubmit={handleNameSubmit}
              />
            )}
            {currentStep === 1 && (
              <StepAgeRange
                age={inputs.age ?? 30}
                retirementAge={inputs.retirementAge ?? 62}
                onAgeChange={(v) => setField("age", v)}
                onRetirementAgeChange={(v) => setField("retirementAge", v)}
              />
            )}
            {currentStep === 2 && (
              <StepIncome
                value={inputs.householdIncome ?? 120_000}
                onChange={(v) => setField("householdIncome", v)}
                inputs={inputs}
                setField={setField}
              />
            )}
            {currentStep === 3 && (
              <StepSavings
                value={inputs.totalSavings ?? 50_000}
                onChange={(v) => setField("totalSavings", v)}
                inputs={inputs}
                setField={setField}
              />
            )}
            {currentStep === 4 && (
              <StepHousing
                value={inputs.housing ?? "rent"}
                onChange={(v) => setField("housing", v)}
                inputs={inputs}
                setField={setField}
              />
            )}
            {currentStep === 5 && (
              <StepRetirement401k
                inputs={inputs}
                setField={setField}
              />
            )}
            {currentStep === 6 && (
              <StepExpenses
                inputs={inputs}
                setField={setField}
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

          {/* Right: live preview */}
          {currentStep >= 1 && (
            <div
              className="hidden lg:block"
              style={{ width: "360px", flexShrink: 0 }}
            >
              <OnboardingPreview inputs={inputs} step={currentStep} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step components ────────────────────────────────────────── */

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
            background: "var(--paper)",
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

function StepAgeRange({
  age,
  retirementAge,
  onAgeChange,
  onRetirementAgeChange,
}: {
  age: number;
  retirementAge: number;
  onAgeChange: (v: number) => void;
  onRetirementAgeChange: (v: number) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          How old are you?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          Drag both handles to set your age and retirement target.
        </p>
      </div>
      <AgeRangeSlider
        minAge={age}
        maxAge={retirementAge}
        onMinChange={onAgeChange}
        onMaxChange={onRetirementAgeChange}
      />
    </div>
  );
}

function StepIncome({
  value,
  onChange,
  inputs,
  setField,
}: {
  value: number;
  onChange: (v: number) => void;
  inputs: Partial<OnboardingInputs>;
  setField: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
}) {
  const defaultRent = Math.round(value / 40);
  const defaultLifestyle = Math.round((value * 0.25) / 12);
  const rent = inputs.monthlyRent ?? defaultRent;
  const lifestyle = inputs.lifestyleMonthly ?? defaultLifestyle;
  const hasPartner = inputs.hasPartner ?? false;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          Your income?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          Just yours for now — rough is fine.
        </p>
      </div>
      <IncomeRangeSlider value={value} onChange={onChange} />

      <AssumptionBlock>
        <p>
          {"We'll assume "}
          <InlineEditable
            value={rent}
            onChange={(v) => setField("monthlyRent", v)}
            format={(n) => `$${n.toLocaleString()}/mo`}
            min={0}
            max={20_000}
          />
          {" for rent and "}
          <InlineEditable
            value={lifestyle}
            onChange={(v) => setField("lifestyleMonthly", v)}
            format={(n) => `$${n.toLocaleString()}/mo`}
            min={0}
            max={50_000}
          />
          {" on other living expenses."}
        </p>
        <p style={{ marginTop: "6px" }}>
          {"We'll assume this is "}
          <InlineSelect
            value={hasPartner ? "partner" : "solo"}
            onChange={(v) => {
              const newHasPartner = v === "partner";
              setField("hasPartner", newHasPartner);
              if (!newHasPartner) {
                setField("partnerAge", undefined);
                setField("partnerIncome", undefined);
              }
            }}
            options={[
              { value: "solo", label: "just your income — no partner" },
              { value: "partner", label: "you have a partner" },
            ]}
          />
          {hasPartner && (
            <>
              {" (Age "}
              <InlineEditable
                value={inputs.partnerAge ?? (inputs.age ?? 30)}
                onChange={(v) => setField("partnerAge", v)}
                format={(n) => String(n)}
                min={18}
                max={80}
              />
              {")"}
            </>
          )}
          {"."}
        </p>

        {hasPartner && (
          <div
            style={{
              marginTop: "14px",
              background: "var(--surface)",
              borderRadius: "10px",
              padding: "12px 14px",
            }}
          >
            <div
              className="type-label-caps"
              style={{ color: "var(--ink-60)", marginBottom: "10px" }}
            >
              Partner&apos;s income
            </div>
            <IncomeRangeSlider
              value={inputs.partnerIncome ?? 80_000}
              onChange={(v) => setField("partnerIncome", v)}
            />
          </div>
        )}
      </AssumptionBlock>
    </div>
  );
}

function StepSavings({
  value,
  onChange,
  inputs,
  setField,
}: {
  value: number;
  onChange: (v: number) => void;
  inputs: Partial<OnboardingInputs>;
  setField: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
}) {
  const retirement = inputs.retirementSavings ?? Math.round(value * 0.7);
  const brokerage = inputs.brokerageSavings ?? 0;
  const cash = inputs.cashSavings ?? Math.max(0, value - retirement - brokerage);

  const allocated = retirement + brokerage + cash;
  const remainder = value - allocated;

  const anyBucketSet =
    inputs.retirementSavings !== undefined ||
    inputs.brokerageSavings !== undefined ||
    inputs.cashSavings !== undefined;

  const retirementActive = anyBucketSet ? retirement > 0 : true;
  const brokerageActive = brokerage > 0;
  const cashActive = cash > 0;

  const toggleChip = (key: "cashSavings" | "retirementSavings" | "brokerageSavings", currentVal: number) => {
    if (currentVal > 0) {
      setField(key, 0);
    } else {
      // Pre-populate with remainder or a portion
      const suggested = Math.max(0, value - (key === "cashSavings" ? 0 : cash) - (key === "retirementSavings" ? 0 : retirement) - (key === "brokerageSavings" ? 0 : brokerage));
      setField(key, suggested > 0 ? suggested : Math.round(value * 0.1));
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    borderRadius: "999px",
    padding: "6px 14px",
    fontSize: "13px",
    fontFamily: "var(--font-geist-sans)",
    background: active ? "var(--gold-bg)" : "transparent",
    color: active ? "var(--gold)" : "var(--ink-60)",
    cursor: "pointer",
    transition: "all 0.15s",
  });

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
        onChange={(v) => {
          onChange(v);
          // Reset buckets when total changes so they recompute from defaults
          if (anyBucketSet) {
            setField("retirementSavings", undefined);
            setField("cashSavings", undefined);
            setField("brokerageSavings", undefined);
          }
        }}
        formatValue={formatSavings}
        editable
      />

      {/* Bucket split */}
      <div
        style={{
          paddingTop: "20px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <p
          className="type-label-caps"
          style={{ color: "var(--ink-60)", marginBottom: "12px" }}
        >
          Where is your money?
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          <button
            type="button"
            style={chipStyle(retirementActive)}
            onClick={() => toggleChip("retirementSavings", retirement)}
          >
            📈 Retirement accounts
          </button>
          <button
            type="button"
            style={chipStyle(cashActive)}
            onClick={() => toggleChip("cashSavings", cash)}
          >
            💵 Cash &amp; savings
          </button>
          <button
            type="button"
            style={chipStyle(brokerageActive)}
            onClick={() => toggleChip("brokerageSavings", brokerage)}
          >
            📊 Taxable investments
          </button>
        </div>

        {/* Bucket amount inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {retirementActive && (
            <BucketRow
              label="Retirement accounts"
              value={retirement}
              onChange={(v) => setField("retirementSavings", v)}
            />
          )}
          {cashActive && (
            <BucketRow
              label="Cash & savings"
              value={cash}
              onChange={(v) => setField("cashSavings", v)}
            />
          )}
          {brokerageActive && (
            <BucketRow
              label="Taxable investments"
              value={brokerage}
              onChange={(v) => setField("brokerageSavings", v)}
            />
          )}
        </div>

        {/* Remainder */}
        {anyBucketSet && remainder !== 0 && (
          <p
            style={{
              marginTop: "10px",
              fontSize: "12px",
              fontFamily: "var(--font-geist-sans)",
              color: remainder > 0 ? "var(--ink-30)" : "var(--rose, #e05c5c)",
            }}
          >
            {remainder > 0
              ? `${formatSavings(remainder)} unallocated`
              : `${formatSavings(Math.abs(remainder))} over total`}
          </p>
        )}
      </div>
    </div>
  );
}

function BucketRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);

  const commit = (s: string) => {
    const parsed = parseMoney(s);
    if (parsed !== null && parsed >= 0) onChange(parsed);
    setText(null);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 10px",
        background: "var(--surface)",
        borderRadius: "8px",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontFamily: "var(--font-geist-sans)",
          color: "var(--ink-60)",
        }}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={text ?? formatSavings(value)}
        onFocus={() => setText(formatSavings(value))}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        style={{
          fontFamily: "var(--font-geist-mono)",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--gold)",
          background: "transparent",
          border: "none",
          borderBottom: text !== null ? "1px solid var(--gold)" : "1px solid transparent",
          outline: "none",
          textAlign: "right",
          width: "80px",
          transition: "border-color 0.15s",
        }}
      />
    </div>
  );
}

function StepHousing({
  value,
  onChange,
  inputs,
  setField,
}: {
  value: "rent" | "own";
  onChange: (v: "rent" | "own") => void;
  inputs: Partial<OnboardingInputs>;
  setField: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
}) {
  const householdIncome = inputs.householdIncome ?? 120_000;
  const homeValue = inputs.homeValue ?? Math.round(householdIncome * 3);
  const hasMortgage = inputs.hasMortgage ?? true;
  const mortgageBalance = inputs.mortgageBalance ?? Math.round(homeValue * 0.75);

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

      {value === "own" && (
        <AssumptionBlock>
          <p>
            {"We'll assume your home is worth "}
            <InlineEditable
              value={homeValue}
              onChange={(v) => setField("homeValue", v)}
              format={(n) => `$${n.toLocaleString()}`}
              min={50_000}
              max={5_000_000}
            />
            {" and you "}
            <InlineSelect
              value={hasMortgage ? "mortgage" : "outright"}
              onChange={(v) => setField("hasMortgage", v === "mortgage")}
              options={[
                { value: "mortgage", label: "have a mortgage" },
                { value: "outright", label: "own outright" },
              ]}
            />
            {hasMortgage && (
              <>
                {" with "}
                <InlineEditable
                  value={mortgageBalance}
                  onChange={(v) => setField("mortgageBalance", v)}
                  format={(n) => `$${n.toLocaleString()}`}
                  min={0}
                  max={5_000_000}
                />
                {" remaining"}
              </>
            )}
            {"."}
          </p>
        </AssumptionBlock>
      )}
    </div>
  );
}

function StepRetirement401k({
  inputs,
  setField,
}: {
  inputs: Partial<OnboardingInputs>;
  setField: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
}) {
  const has401k = inputs.has401k ?? true;
  const contributionPct = inputs.contributionPct ?? 6;
  const hasMatch = inputs.hasEmployerMatch ?? true;
  const matchPct = inputs.employerMatchPct ?? 50;
  const matchUpTo = inputs.employerMatchUpToPct ?? 6;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          Do you have a 401(k)?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          Or a 403(b), or similar employer retirement plan.
        </p>
      </div>
      <TapSelect
        value={has401k ? "yes" : "no"}
        onChange={(v) => setField("has401k", v === "yes")}
        options={[
          { value: "yes", label: "I have one", emoji: "✅", sublabel: "401(k), 403(b), or similar" },
          { value: "no", label: "I don't", emoji: "—", sublabel: "No employer retirement plan" },
        ]}
      />

      {has401k && (
        <>
          <div className="space-y-3">
            <p className="type-label-caps" style={{ color: "var(--ink-60)" }}>
              What % are you contributing?
            </p>
            <SliderInput
              value={contributionPct}
              min={0}
              max={30}
              step={1}
              onChange={(v) => setField("contributionPct", v)}
              formatValue={(v) => `${v}%`}
            />
          </div>

          <AssumptionBlock>
            <p>
              {"We'll assume your employer "}
              <InlineSelect
                value={hasMatch ? "matches" : "nomatch"}
                onChange={(v) => setField("hasEmployerMatch", v === "matches")}
                options={[
                  { value: "nomatch", label: "doesn't match" },
                  { value: "matches", label: "matches" },
                ]}
              />
              {hasMatch && (
                <>
                  {" "}
                  <InlineEditable
                    value={matchPct}
                    onChange={(v) => setField("employerMatchPct", v)}
                    format={(n) => `${n}%`}
                    min={0}
                    max={100}
                  />
                  {" of contributions up to "}
                  <InlineEditable
                    value={matchUpTo}
                    onChange={(v) => setField("employerMatchUpToPct", v)}
                    format={(n) => `${n}%`}
                    min={0}
                    max={20}
                  />
                  {" of your salary"}
                </>
              )}
              {"."}
            </p>
          </AssumptionBlock>
        </>
      )}
    </div>
  );
}

function StepExpenses({
  inputs,
  setField,
}: {
  inputs: Partial<OnboardingInputs>;
  setField: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
}) {
  const hasDebt = inputs.hasDebt ?? false;
  const debtBalance = inputs.debtBalance ?? 0;
  const hasChildren = inputs.hasChildren ?? false;
  const childCost = inputs.childrenMonthlyCost ?? 1_500;

  const [debtText, setDebtText] = useState<string>(
    debtBalance > 0 ? formatSavings(debtBalance) : ""
  );

  const commitDebt = (s: string) => {
    const parsed = parseMoney(s);
    if (parsed !== null && parsed >= 0) setField("debtBalance", parsed);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="type-title" style={{ color: "var(--ink-60)" }}>
          Any debt outside your mortgage?
        </h2>
        <p className="type-body" style={{ color: "var(--ink-30)" }}>
          Student loans, car payments, credit cards — rough total is fine.
        </p>
      </div>
      <TapSelect
        value={hasDebt ? "yes" : "no"}
        onChange={(v) => setField("hasDebt", v === "yes")}
        options={[
          { value: "no", label: "No debt", emoji: "✓", sublabel: "Clear of non-mortgage debt" },
          { value: "yes", label: "Yes, some debt", emoji: "📋", sublabel: "Student loans, car, cards..." },
        ]}
      />

      {hasDebt && (
        <div className="space-y-2">
          <p className="type-label-caps" style={{ color: "var(--ink-60)" }}>
            Total balance
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="$0"
            value={debtText}
            onChange={(e) => setDebtText(e.target.value)}
            onBlur={(e) => commitDebt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            style={{
              fontFamily: "var(--font-lora), Georgia, serif",
              fontSize: "34px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--gold)",
              background: "transparent",
              border: "none",
              borderBottom: "1.5px solid var(--gold)",
              outline: "none",
              width: "100%",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
      )}

      <AssumptionBlock>
        <p>
          {"We'll assume "}
          <InlineSelect
            value={hasChildren ? "children" : "nochildren"}
            onChange={(v) => {
              const kids = v === "children";
              setField("hasChildren", kids);
              if (!kids) setField("childrenMonthlyCost", undefined);
            }}
            options={[
              { value: "nochildren", label: "no children" },
              { value: "children", label: "children" },
            ]}
          />
          {hasChildren && (
            <>
              {" costing "}
              <InlineEditable
                value={childCost}
                onChange={(v) => setField("childrenMonthlyCost", v)}
                format={(n) => `$${n.toLocaleString()}/mo`}
                min={0}
                max={10_000}
              />
            </>
          )}
          {"."}
        </p>
      </AssumptionBlock>
    </div>
  );
}

function AssumptionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
      <div
        style={{
          fontSize: "11px",
          color: "var(--ink-60)",
          fontFamily: "var(--font-geist-sans)",
          lineHeight: 1.7,
          fontWeight: 300,
        }}
      >
        {children}
      </div>
    </div>
  );
}
