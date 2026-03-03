/**
 * A targeted override tells the scenario engine to set, add to, or cap
 * a specific income/spend field for a range of ages.
 */
export type TargetedOverrideTarget =
  | "income.user.base"
  | "income.user.bonus"
  | "income.partner.base"
  | "income.partner.bonus"
  | "income.user.base.growthPct"
  | "income.user.bonus.growthPct"
  | "income.partner.base.growthPct"
  | "income.partner.bonus.growthPct"
  | "spend.lifestyle"
  | "spend.housing";

export type TargetedOverride = {
  target: TargetedOverrideTarget;
  kind: "set" | "add" | "cap";
  fromAge: number;
  toAge?: number;
  value: number;
};
