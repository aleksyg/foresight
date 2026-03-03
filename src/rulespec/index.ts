import type { PlanState } from "@/engine/types/planState";
import type { YearInputs } from "@/engine/types/yearInputs";
import type { TargetedOverride } from "./types";

/**
 * Convert a flat list of TargetedOverride[] into a YearInputs[] array the engine
 * can consume directly. Handles income "set" (with forward compounding), "add"
 * (layered on baseline), and spend "set"/"add".
 *
 * Growth-rate overrides (income.*.growthPct) are intentionally skipped — the
 * compounding from "set" overrides is sufficient for the current event types.
 */
export function buildScenarioYearInputsFromOverrides(
  plan: PlanState,
  overrides: TargetedOverride[],
): YearInputs[] {
  const { startAge, endAge } = plan;
  const growthUser    = plan.household.user.income.incomeGrowthRate;
  const growthPartner = plan.household.partner?.income.incomeGrowthRate ?? growthUser;

  const numYears = endAge - startAge + 1;

  // Per-year accumulators
  type IncAcc = { set?: number; addDelta: number };
  type SpendAcc = { set?: number; addDelta: number };

  const userBase:    IncAcc[]   = Array.from({ length: numYears }, () => ({ addDelta: 0 }));
  const userBonus:   IncAcc[]   = Array.from({ length: numYears }, () => ({ addDelta: 0 }));
  const partBase:    IncAcc[]   = Array.from({ length: numYears }, () => ({ addDelta: 0 }));
  const partBonus:   IncAcc[]   = Array.from({ length: numYears }, () => ({ addDelta: 0 }));
  const lifestyle:   SpendAcc[] = Array.from({ length: numYears }, () => ({ addDelta: 0 }));
  const housing:     SpendAcc[] = Array.from({ length: numYears }, () => ({ addDelta: 0 }));

  for (const ov of overrides) {
    const fromYi = Math.max(0, ov.fromAge - startAge);
    const toYi   = Math.min(numYears - 1, ov.toAge != null ? ov.toAge - startAge : numYears - 1);
    if (fromYi >= numYears || fromYi > toYi) continue;

    for (let yi = fromYi; yi <= toYi; yi++) {
      const yearsOut = yi - fromYi; // years since override start (for compounding "set")

      switch (ov.target) {
        case "income.user.base": {
          const acc = userBase[yi]!;
          if (ov.kind === "set") {
            acc.set = ov.value * Math.pow(1 + growthUser, yearsOut);
          } else if (ov.kind === "add") {
            acc.addDelta += ov.value;
          } else if (ov.kind === "cap") {
            acc.set = Math.min(acc.set ?? Infinity, ov.value);
          }
          break;
        }
        case "income.user.bonus": {
          const acc = userBonus[yi]!;
          if (ov.kind === "set")       acc.set = ov.value;
          else if (ov.kind === "add")  acc.addDelta += ov.value;
          break;
        }
        case "income.partner.base": {
          const acc = partBase[yi]!;
          if (ov.kind === "set") {
            acc.set = ov.value * Math.pow(1 + growthPartner, yearsOut);
          } else if (ov.kind === "add") {
            acc.addDelta += ov.value;
          }
          break;
        }
        case "income.partner.bonus": {
          const acc = partBonus[yi]!;
          if (ov.kind === "set")       acc.set = ov.value;
          else if (ov.kind === "add")  acc.addDelta += ov.value;
          break;
        }
        case "spend.lifestyle": {
          const acc = lifestyle[yi]!;
          if (ov.kind === "set")       acc.set = ov.value;
          else if (ov.kind === "add")  acc.addDelta += ov.value;
          break;
        }
        case "spend.housing": {
          const acc = housing[yi]!;
          if (ov.kind === "set")       acc.set = ov.value;
          else if (ov.kind === "add")  acc.addDelta += ov.value;
          break;
        }
        default:
          break; // skip growthPct targets
      }
    }
  }

  // Baseline values for computing "add" results
  const blUserBase    = plan.household.user.income.baseAnnual;
  const blUserBonus   = plan.household.user.income.bonusAnnual ?? 0;
  const blPartBase    = plan.household.partner?.income.baseAnnual ?? 0;
  const blPartBonus   = plan.household.partner?.income.bonusAnnual ?? 0;
  const blLifestyle   =
    plan.expenses.mode === "total"
      ? plan.expenses.lifestyleMonthly
      : plan.expenses.items.reduce((s, i) => s + i.monthlyAmount, 0);
  const blHousing     =
    plan.household.housing.status === "rent"
      ? plan.household.housing.monthlyRent
      : plan.household.housing.monthlyPaymentPITI;

  const yearInputs: YearInputs[] = [];

  for (let yi = 0; yi < numYears; yi++) {
    const yi_: YearInputs = { yearIndex: yi };

    // Income overrides
    const ubAcc = userBase[yi]!;
    const uBonAcc = userBonus[yi]!;
    const hasUserOverride = ubAcc.set !== undefined || ubAcc.addDelta !== 0
      || uBonAcc.set !== undefined || uBonAcc.addDelta !== 0;

    if (hasUserOverride) {
      yi_.user = {};
      if (ubAcc.set !== undefined || ubAcc.addDelta !== 0) {
        const bl = blUserBase * Math.pow(1 + growthUser, yi);
        yi_.user.baseAnnual = ubAcc.set ?? (bl + ubAcc.addDelta);
      }
      if (uBonAcc.set !== undefined || uBonAcc.addDelta !== 0) {
        yi_.user.bonusAnnual = uBonAcc.set ?? (blUserBonus + uBonAcc.addDelta);
      }
    }

    const pbAcc = partBase[yi]!;
    const pBonAcc = partBonus[yi]!;
    const hasPartnerOverride = pbAcc.set !== undefined || pbAcc.addDelta !== 0
      || pBonAcc.set !== undefined || pBonAcc.addDelta !== 0;

    if (hasPartnerOverride) {
      yi_.partner = {};
      if (pbAcc.set !== undefined || pbAcc.addDelta !== 0) {
        const bl = blPartBase * Math.pow(1 + growthPartner, yi);
        yi_.partner.baseAnnual = pbAcc.set ?? (bl + pbAcc.addDelta);
      }
      if (pBonAcc.set !== undefined || pBonAcc.addDelta !== 0) {
        yi_.partner.bonusAnnual = pBonAcc.set ?? (blPartBonus + pBonAcc.addDelta);
      }
    }

    // Spend overrides
    const lsAcc = lifestyle[yi]!;
    if (lsAcc.set !== undefined || lsAcc.addDelta !== 0) {
      yi_.lifestyleMonthly = lsAcc.set ?? (blLifestyle + lsAcc.addDelta);
    }

    const hAcc = housing[yi]!;
    if (hAcc.set !== undefined || hAcc.addDelta !== 0) {
      yi_.housingMonthly = hAcc.set ?? (blHousing + hAcc.addDelta);
    }

    yearInputs.push(yi_);
  }

  return yearInputs;
}

/**
 * Extend a YearInputs[] beyond plan.endAge up to maxAge, repeating the last
 * year's overrides (without oneTimeEvents). Needed to simulate through age 85.
 */
export function extendYearInputsToAge(
  inputs: YearInputs[],
  plan: PlanState,
  maxAge: number,
): YearInputs[] {
  if (inputs.length === 0 || maxAge <= plan.endAge) return inputs;
  const planYears = plan.endAge - plan.startAge + 1;
  const extraYears = maxAge - plan.endAge;
  const last = inputs[inputs.length - 1]!;
  const extended = [...inputs];
  for (let i = 0; i < extraYears; i++) {
    extended.push({
      ...last,
      yearIndex: planYears + i,
      oneTimeEvents: undefined,
    });
  }
  return extended;
}
