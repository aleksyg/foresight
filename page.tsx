"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { simulatePlan } from "@/engine";
import type { YearRow } from "@/engine";
import type { PlanState, YearInputs } from "@/engine";
import type { TargetedOverride } from "@/ai/types";
import { loadBaselineFromStorage } from "@/app/planStateStorage";
import { loadLifeEvents, saveLifeEvents } from "@/app/lifeEventsStorage";
import {
  applyHomePurchaseToYearInputs,
  hasAnyEnabledHomePurchase,
} from "@/scenario/homePurchaseYearInputs";
import { buildScenarioYearInputsFromOverrides, getBaselineYearInputs } from "@/rulespec";
import { buildOverridesFromLifeEvent } from "@/scenario/lifeEvents/toTargetedOverrides";
import type { LifeEvent } from "@/scenario/lifeEvents/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { ProjectionBars } from "@/components/app/ProjectionBars";
import { NetWorthChartCard } from "@/components/app/NetWorthChartCard";
import { LifeEventsPanel } from "@/scenario/LifeEventsPanel";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function extendYearInputsToAge(
  inputs: YearInputs[],
  plan: PlanState,
  maxAge: number,
): YearInputs[] {
  if (inputs.length === 0) return [];
  if (maxAge <= plan.endAge) return inputs;
  const planYears = plan.endAge - plan.startAge + 1;
  const extraYears = maxAge - plan.endAge;
  const last = inputs[inputs.length - 1]!;
  const extended: YearInputs[] = [...inputs];
  for (let i = 0; i < extraYears; i++) {
    const yearIndex = planYears + i;
    extended.push({
      ...last,
      yearIndex,
      user: last.user ? { ...last.user } : undefined,
      partner: last.partner ? { ...last.partner } : undefined,
      oneTimeEvents: undefined,
    });
  }
  return extended;
}

export default function PlanYourLifePage() {
  // Defer storage read to client after mount so server and first client render match (avoids hydration error).
  const [plan, setPlan] = useState<ReturnType<typeof loadBaselineFromStorage>>(null);
  useEffect(() => {
    setPlan(loadBaselineFromStorage());
  }, []);

  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>(() => loadLifeEvents());
  const [draftOverrides, _setDraftOverrides] = useState<TargetedOverride[] | null>(null);
  const hasPartner = Boolean(plan?.household?.hasPartner && plan?.household?.partner);
  const hasPartnerTargetedEvents = useMemo(() => {
    return lifeEvents.some((evt) =>
      (evt.mutations ?? []).some((m) => {
        const appliesTo = (m as { appliesTo?: string }).appliesTo;
        return appliesTo === "partner" || appliesTo === "both";
      }),
    );
  }, [lifeEvents]);

  useEffect(() => {
    saveLifeEvents(lifeEvents);
  }, [lifeEvents]);



  function upsertLifeEvent(evt: LifeEvent) {
    setLifeEvents((prev) =>
      prev.some((e) => e.id === evt.id)
        ? prev.map((e) => (e.id === evt.id ? evt : e))
        : [evt, ...prev],
    );
  }

  function deleteLifeEvent(id: string) {
    setLifeEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function toggleLifeEventEnabled(id: string, enabled: boolean) {
    setLifeEvents((prev) => prev.map((e) => (e.id === id ? { ...e, enabled } : e)));
  }

  // Plan Your Life runs simulation through age 85 regardless of user's input end age.
  const PLAN_CHART_END_AGE = 85;
  // Baseline: immutable; never mutated by scenario.
  const rows: YearRow[] = plan ? simulatePlan(plan, { minEndAge: PLAN_CHART_END_AGE }) : [];
  // Full scenario including draft for table/chart display. Extend through 85 so income
  // overrides that apply through plan end age continue to apply in the chart range.
  const scenarioYearInputs = useMemo(() => {
    if (!plan) return [];
    const opts = { minAge: plan.startAge, maxAge: plan.endAge };
    const enabledOverrides = lifeEvents
      .filter((e) => e.enabled)
      .flatMap((e) => buildOverridesFromLifeEvent(e, opts));
    const combined = [...enabledOverrides, ...(draftOverrides ?? [])];

    let base = combined.length > 0 ? buildScenarioYearInputsFromOverrides(plan, combined) : [];
    if (base.length === 0 && hasAnyEnabledHomePurchase(lifeEvents)) {
      base = getBaselineYearInputs(plan);
    }
    if (base.length === 0) return [];
    const extended = extendYearInputsToAge(base, plan, PLAN_CHART_END_AGE);
    return applyHomePurchaseToYearInputs(plan, extended, lifeEvents);
  }, [plan, draftOverrides, lifeEvents]);
  const scenarioRows: YearRow[] =
    plan && scenarioYearInputs.length > 0
      ? simulatePlan(plan, { yearInputs: scenarioYearInputs, minEndAge: PLAN_CHART_END_AGE })
      : rows;
  const currentRows = scenarioRows;
  const hasScenario = lifeEvents.some((e) => e.enabled) || (draftOverrides?.length ?? 0) > 0;

  const ages = useMemo(
    () => (currentRows.length > 0 ? currentRows.map((r) => r.age) : []),
    [currentRows],
  );
  const [selectedAge, setSelectedAge] = useState<number>(30);
  const [compareToBaseline, setCompareToBaseline] = useState(true);
  const hasSetInitialAgeRef = useRef(false);
  useEffect(() => {
    if (!plan || ages.length === 0 || hasSetInitialAgeRef.current) return;
    hasSetInitialAgeRef.current = true;
    const userEndAge = plan.endAge;
    const clamped = Math.max(ages[0]!, Math.min(userEndAge, ages[ages.length - 1]!));
    setSelectedAge(ages.includes(clamped) ? clamped : ages[0] ?? 30);
  }, [plan, ages]);
  useEffect(() => {
    if (ages.length > 0 && !ages.includes(selectedAge)) {
      setSelectedAge(ages[0] ?? selectedAge);
    }
  }, [ages, selectedAge]);

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Plan Your Life</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter baseline inputs first.</p>
        <Button asChild className="mt-6 rounded-2xl px-7">
          <Link href="/baseline">Get started</Link>
        </Button>
      </div>
    );
  }

  const lastBase = rows[rows.length - 1];
  const lastScen = scenarioRows.length > 0 ? scenarioRows[scenarioRows.length - 1] : null;
  const delta = lastBase && lastScen ? lastScen.endNetWorth - lastBase.endNetWorth : null;

  return (
    <div className="relative -mx-6 -mt-10 h-[calc(100vh-120px)] w-[calc(100%+48px)] overflow-hidden bg-[#F8FAFC] pt-10 sm:-mx-8 sm:w-[calc(100%+64px)]">
      <div className="relative h-full w-full pl-0 pr-8 md:pr-12">
        <div className="flex h-full min-h-0 w-full flex-col items-stretch gap-12 lg:flex-row lg:items-stretch">
          <aside className="order-first w-full shrink-0 -mt-10 pt-10 pl-6 border-r border-[#E5E7EB] bg-[#F0F2F5] pr-8 lg:order-0 lg:w-[400px] lg:min-w-[400px] flex flex-col min-h-0 lg:h-full overflow-hidden">
            <LifeEventsPanel
              events={lifeEvents}
              onUpsert={upsertLifeEvent}
              onDelete={deleteLifeEvent}
              onToggleEnabled={toggleLifeEventEnabled}
            >
              {!hasPartner && hasPartnerTargetedEvents ? (
                <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Partner-targeted life events are ignored because this plan has no partner. Add a partner in Baseline to enable them.
                </div>
              ) : null}
            </LifeEventsPanel>
          </aside>

          <main className="order-last min-w-0 flex-1 pl-10 lg:order-0 lg:min-w-0 flex flex-col min-h-0 h-full overflow-hidden">
            <div className="rounded-[28px] flex flex-col min-h-0 flex-1 overflow-x-visible overflow-y-hidden pl-6">
              <div className="sticky top-0 z-10 shrink-0 pr-8 pt-0 pb-4 flex flex-wrap items-center justify-between gap-4 bg-[#F8FAFC]">
                <div className="flex flex-wrap items-center gap-4 min-w-0">
                  <h1 className="text-4xl font-semibold tracking-tight text-[#2C3E50] shrink-0">Plan Your Life</h1>
                  {ages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">AT AGE</span>
                      <div className="relative inline-flex items-center rounded-full bg-[#F0F2F5] border border-[#E5E7EB] pl-4 pr-8 py-2 min-w-18">
                        <span className="pointer-events-none text-base font-semibold tabular-nums text-[#2C3E50]" aria-hidden>
                          {selectedAge}
                        </span>
                        <select
                          value={selectedAge}
                          onChange={(e) => setSelectedAge(Number(e.target.value))}
                          className="absolute inset-0 w-full cursor-pointer appearance-none rounded-full border-0 bg-transparent opacity-0 focus:outline-none"
                          aria-label="Select age"
                        >
                          {ages.map((age) => (
                            <option key={age} value={age}>
                              {age}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#6B7280]" aria-hidden />
                      </div>
                    </div>
                  )}
                </div>
                {hasScenario && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompareToBaseline(false)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${!compareToBaseline ? "bg-[#2563EB] text-white" : "bg-transparent text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F8FAFC]"}`}
                    >
                      Scenario Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareToBaseline(true)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${compareToBaseline ? "bg-[#2563EB] text-white" : "bg-transparent text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F8FAFC]"}`}
                    >
                      Compare to Baseline
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-8 pt-4 pb-8 space-y-6">
              <NetWorthChartCard
                rows={currentRows}
                baselineRows={rows}
                lifeEvents={lifeEvents}
                selectedAge={selectedAge}
                onSelectedAgeChange={setSelectedAge}
                compareToBaseline={compareToBaseline}
                onCompareToBaselineChange={setCompareToBaseline}
                title="Net worth"
                description={hasScenario ? "Scenario projection" : "Baseline projection"}
              />

          <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="text-[#2C3E50] font-semibold">Income by year</CardTitle>
              <CardDescription className="text-[#6B7280]">
                Income (base, bonus) and spending (lifestyle, housing), baseline vs scenario. Spending shown as annual (×12).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F0F2F5]">
                      <th className="px-2 py-2 text-left font-medium text-[#2C3E50]">Age</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">User base (BL)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">User base (SC)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">User bonus (BL)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">User bonus (SC)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Partner base (BL)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Partner base (SC)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Partner bonus (BL)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Partner bonus (SC)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Lifestyle (BL)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Lifestyle (SC)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Housing (BL)</th>
                      <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Housing (SC)</th>
                      {hasScenario && (
                        <>
                          <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Home value (SC)</th>
                          <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Mortgage bal (SC)</th>
                          <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Home equity (SC)</th>
                          <th className="px-2 py-2 text-right font-medium text-[#2C3E50]">Base cash (SC)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const scen = scenarioRows[i];
                      const ubBl = row.userBaseIncome ?? 0;
                      const ubSc = scen?.userBaseIncome ?? 0;
                      const uBoBl = row.userBonusIncome ?? 0;
                      const uBoSc = scen?.userBonusIncome ?? 0;
                      const pbBl = row.partnerBaseIncome ?? 0;
                      const pbSc = scen?.partnerBaseIncome ?? 0;
                      const pBoBl = row.partnerBonusIncome ?? 0;
                      const pBoSc = scen?.partnerBonusIncome ?? 0;
                      const lifeBl = (row.lifestyleMonthly ?? 0) * 12;
                      const lifeSc = (scen?.lifestyleMonthly ?? 0) * 12;
                      const housBl = (row.housingMonthly ?? 0) * 12;
                      const housSc = (scen?.housingMonthly ?? 0) * 12;
                      const homeValueSc = scen?.homeValue ?? 0;
                      const mortBalSc = scen?.remainingMortgageBalance ?? 0;
                      const homeEqSc = homeValueSc - mortBalSc;
                      const hasPartner = plan.household.hasPartner;
                      return (
                        <tr key={row.yearIndex} className="border-b border-[#E5E7EB] last:border-0">
                          <td className="px-2 py-1.5">{row.age}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(ubBl)}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${hasScenario && Math.abs(ubSc - ubBl) > 0.5 ? "font-medium" : ""}`}>
                            {formatCurrency(ubSc)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(uBoBl)}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${hasScenario && Math.abs(uBoSc - uBoBl) > 0.5 ? "font-medium" : ""}`}>
                            {formatCurrency(uBoSc)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{hasPartner ? formatCurrency(pbBl) : ""}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${hasPartner && hasScenario && Math.abs(pbSc - pbBl) > 0.5 ? "font-medium" : ""}`}>
                            {hasPartner ? formatCurrency(pbSc) : ""}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{hasPartner ? formatCurrency(pBoBl) : ""}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${hasPartner && hasScenario && Math.abs(pBoSc - pBoBl) > 0.5 ? "font-medium" : ""}`}>
                            {hasPartner ? formatCurrency(pBoSc) : ""}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(lifeBl)}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${hasScenario && Math.abs(lifeSc - lifeBl) > 0.5 ? "font-medium" : ""}`}>
                            {formatCurrency(lifeSc)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(housBl)}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${hasScenario && Math.abs(housSc - housBl) > 0.5 ? "font-medium" : ""}`}>
                            {formatCurrency(housSc)}
                          </td>
                          {hasScenario && (
                            <>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {homeValueSc > 0 ? formatCurrency(homeValueSc) : ""}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {mortBalSc > 0 ? formatCurrency(mortBalSc) : ""}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {homeValueSc > 0 || mortBalSc > 0 ? formatCurrency(homeEqSc) : ""}
                              </td>
                              <td className="px-2 py-1.5 text-right text-xs text-muted-foreground">
                                {scenarioYearInputs[i]?.user?.observedBaseNetPayMonthly != null
                                  ? `Observed ${formatCurrency(scenarioYearInputs[i]!.user!.observedBaseNetPayMonthly!)}/mo`
                                  : "Modeled"}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="text-[#2C3E50] font-semibold">Chart preview</CardTitle>
              <CardDescription className="text-[#6B7280]">
                Net worth projection ({hasScenario ? "scenario" : "baseline"})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectionBars
              rows={currentRows}
              yearInputs={hasScenario ? scenarioYearInputs : undefined}
            />
              {delta != null ? (
                <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-2 text-sm text-[#6B7280]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Final-age net worth delta</span>
                    <span className={delta < 0 ? "font-semibold text-destructive" : "font-semibold"}>
                      {formatCurrency(delta)}
                    </span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
              </div>
            </div>
        </main>
        </div>
      </div>
    </div>
  );
}
