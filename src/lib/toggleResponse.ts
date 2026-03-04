import type { YearRow } from "@/engine/simulatePlan";
import type { PlanState } from "@/engine/types/planState";

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}K`;
  return `$${Math.round(abs)}`;
}

function fmtYears(n: number): string {
  const r = Math.round(n);
  return `${r} year${r !== 1 ? "s" : ""}`;
}

/** First age in rows where net worth crosses targetNW. */
function ageAtTarget(rows: YearRow[], targetNW: number): number | null {
  return rows.find((r) => r.endNetWorth >= targetNW)?.age ?? null;
}

/** 25× annual lifestyle + housing (4% rule). */
function estimateFiNumber(plan: PlanState): number {
  const lifestyle =
    plan.expenses.mode === "total"
      ? plan.expenses.lifestyleMonthly
      : plan.expenses.items.reduce((s, i) => s + i.monthlyAmount, 0);
  const housing =
    plan.household.housing.status === "rent"
      ? plan.household.housing.monthlyRent
      : plan.household.housing.monthlyPaymentPITI;
  return (lifestyle + housing) * 12 * 25;
}

/**
 * One-sentence consequence line — 5 scenarios from the product spec:
 *   positive  — adds meaningfully, possibly moves timeline earlier
 *   absorbed  — small impact, plan stays on track
 *   stretched — pushes FI timeline out, includes a fix lever
 *   negative  — reduces wealth but still on track
 *   disabled  — event turned off
 */
export function buildToggleResponse(
  eventTitle: string,
  nowEnabled: boolean,
  plan: PlanState,
  baselineRows: YearRow[],
  scenarioRows: YearRow[],
): string {
  if (!nowEnabled) return `${eventTitle} removed from your plan.`;
  if (baselineRows.length === 0 || scenarioRows.length === 0) return "";

  const retireAge = plan.endAge;

  const baseEnd =
    baselineRows.find((r) => r.age === retireAge)?.endNetWorth ??
    baselineRows[baselineRows.length - 1]!.endNetWorth;
  const scenEnd =
    scenarioRows.find((r) => r.age === retireAge)?.endNetWorth ??
    scenarioRows[scenarioRows.length - 1]!.endNetWorth;
  const delta = scenEnd - baseEnd;

  const fiNum = estimateFiNumber(plan);
  const baseFiAge = ageAtTarget(baselineRows, fiNum);
  const scenFiAge = ageAtTarget(scenarioRows, fiNum);

  // Positive — meaningfully improves trajectory
  if (delta >= 5_000) {
    if (baseFiAge != null && scenFiAge != null && scenFiAge < baseFiAge - 0.5) {
      return `This adds ${fmt(delta)} to retirement. You could reach your goal ${fmtYears(baseFiAge - scenFiAge)} earlier.`;
    }
    return `This adds ${fmt(delta)} to your retirement. Retirement at age ${retireAge} stays on track.`;
  }

  // Absorbed — negligible impact
  if (delta > -5_000) {
    return `Your plan absorbs this. Retirement at age ${retireAge} stays on track.`;
  }

  // Stretched — FI timeline pushed out significantly
  if (baseFiAge != null && scenFiAge != null && scenFiAge > baseFiAge + 1) {
    const yearsOut = Math.round(scenFiAge - baseFiAge);
    const yearsToRetire = Math.max(1, retireAge - plan.startAge);
    // Round fix lever to nearest $50 for cleaner copy
    const monthlyFix = Math.round(Math.abs(delta) / (yearsToRetire * 12) / 50) * 50;
    return `This pushes your retirement ${fmtYears(yearsOut)}. Increasing contributions ${fmt(monthlyFix)}/mo brings it back.`;
  }

  // Negative — reduces wealth but still on track
  const stillOnTrack = fiNum > 0 && scenEnd >= fiNum;
  if (stillOnTrack) {
    return `This reduces retirement wealth by ${fmt(Math.abs(delta))}. Still above your target.`;
  }
  return `This reduces retirement wealth by ${fmt(Math.abs(delta))}.`;
}
