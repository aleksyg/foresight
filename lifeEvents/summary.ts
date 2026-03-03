import type {
  LifeEvent,
  IncomeSetRangeMutation,
  IncomeGrowthRangeMutation,
  IncomeMilestoneMutation,
  OneTimeBonusMutation,
  IncomeCapMutation,
  IncomeGrowthStepMutation,
  ExpenseOneTimeMutation,
  ExpenseRecurringMutation,
  HomePurchaseMutation,
  IncomeAppliesTo,
} from "./types";
import type { Mutation } from "./types";

export function formatAgeRange(
  startAge: number,
  endAge: number | null,
): string {
  if (endAge === null) {
    return `from ${startAge} through retirement`;
  }
  if (endAge === startAge) {
    return `at age ${startAge}`;
  }
  return `from ${startAge}–${endAge}`;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Compact age for card summaries: "Age N" | "Ages S–E" | "Age S+" */
export function formatAgeRangeCompact(
  startAge: number,
  endAge: number | null,
): string {
  if (endAge === null) return `Age ${startAge}+`;
  if (endAge === startAge) return `Age ${startAge}`;
  return `Ages ${startAge}–${endAge}`;
}

/** Person label for card line 1: "(You)" | "(Partner)" | "(Household)" */
export function personLabel(appliesTo?: IncomeAppliesTo): string {
  if (appliesTo === "partner") return "(Partner)";
  if (appliesTo === "both") return "(Household)";
  return "(You)";
}

export type ImpactSummaryKind = "expense" | "income" | "neutral";
export type ImpactSummaryBlock = { label: string; value: string; kind: ImpactSummaryKind };

export type BuildImpactSummariesOptions = { omitAgeInValue?: boolean };

/** Earliest age from all mutations; null if none. */
export function getDisplayAge(event: { mutations?: Mutation[] }): number | null {
  const mutations = event.mutations ?? [];
  let min: number | null = null;
  for (const m of mutations) {
    if (m.kind === "income_milestone" || m.kind === "income_one_time_bonus" || m.kind === "income_growth_step" || m.kind === "expense_one_time" || m.kind === "home_purchase") {
      const age = "age" in m ? m.age : (m as ExpenseOneTimeMutation).age;
      if (min == null || age < min) min = age;
    } else if ("startAge" in m) {
      const a = m.startAge;
      if (min == null || a < min) min = a;
      if (m.endAge != null && m.endAge < (min ?? Infinity)) min = m.endAge;
    }
  }
  return min;
}

function isBreakOwnedMutation(m: { mutationId?: string }): boolean {
  return m.mutationId?.startsWith("break:") === true;
}

export function buildImpactSummaries(
  event: Omit<LifeEvent, "summary"> & { summary?: string[] },
  options?: BuildImpactSummariesOptions,
): ImpactSummaryBlock[] {
  const mutations = event.mutations ?? [];
  const omitAge = options?.omitAgeInValue ?? false;
  if (mutations.length === 0)
    return [{ label: "Update", value: "No impacts defined yet", kind: "neutral" as const }];

  const blocks: ImpactSummaryBlock[] = [];
  const who = (a?: IncomeAppliesTo) => personLabel(a);

  const BREAK_DURING_ID = "break:during";
  const BREAK_AFTER_ID = "break:after";
  const BREAK_AFTER_GROWTH_ID = "break:afterGrowth";
  const breakDuring = mutations.find(
    (m): m is IncomeSetRangeMutation =>
      m.kind === "income_set_range" &&
      (m as { mutationId?: string }).mutationId === BREAK_DURING_ID,
  );
  const breakAfter = mutations.find(
    (m): m is IncomeSetRangeMutation =>
      m.kind === "income_set_range" &&
      (m as { mutationId?: string }).mutationId === BREAK_AFTER_ID,
  );
  const breakGrowth = mutations.find(
    (m): m is IncomeGrowthRangeMutation =>
      m.kind === "income_growth_range" &&
      (m as { mutationId?: string }).mutationId === BREAK_AFTER_GROWTH_ID,
  );

  if (breakDuring) {
    const range = formatAgeRangeCompact(breakDuring.startAge, breakDuring.endAge);
    const parts: string[] = [];
    if (breakDuring.baseAnnual !== null) parts.push(`Base: ${formatMoney(breakDuring.baseAnnual)}`);
    if (breakDuring.bonusAnnual !== null) parts.push(`Bonus: ${formatMoney(breakDuring.bonusAnnual)}`);
    const value = parts.length > 0
      ? (omitAge ? parts.join(" · ") : `${parts.join(" · ")} · ${range}`)
      : (omitAge ? "—" : range);
    blocks.push({
      label: `Income change ${who(breakDuring.appliesTo)}`,
      value,
      kind: "income",
    });
  }
  if (breakAfter ?? breakGrowth) {
    const anchor = breakAfter?.startAge ?? breakGrowth!.startAge;
    const parts: string[] = [];
    if (breakAfter) {
      if (breakAfter.baseAnnual !== null) parts.push(`Base: ${formatMoney(breakAfter.baseAnnual)}`);
      if (breakAfter.bonusAnnual !== null) parts.push(`Bonus: ${formatMoney(breakAfter.bonusAnnual)}`);
    }
    const range = formatAgeRangeCompact(anchor, null);
    if (breakGrowth) {
      const base = breakGrowth.baseGrowthPct;
      const bonus = breakGrowth.bonusGrowthPct;
      if (base != null && bonus != null && base === bonus) {
        parts.push(omitAge ? `${base}%` : `${base}% · ${range}`);
      } else {
        const g: string[] = [];
        if (base != null) g.push(`base ${base}%`);
        if (bonus != null) g.push(`bonus ${bonus}%`);
        if (g.length) parts.push(omitAge ? g.join(" · ") : `${g.join(" · ")} · ${range}`);
      }
    }
    blocks.push({
      label: `Income change ${who((breakAfter ?? breakGrowth)!.appliesTo)}`,
      value: parts.length > 0 ? parts.join(" · ") : (omitAge ? "—" : range),
      kind: "income",
    });
  }

  for (const m of mutations) {
    if (isBreakOwnedMutation(m as { mutationId?: string })) continue;
    if (m.kind === "income_set_range") {
      const range = formatAgeRangeCompact(m.startAge, m.endAge);
      const parts: string[] = [];
      if (m.baseAnnual !== null) parts.push(`Base: ${formatMoney(m.baseAnnual)}`);
      if (m.bonusAnnual !== null) parts.push(`Bonus: ${formatMoney(m.bonusAnnual)}`);
      blocks.push({
        label: `Income change ${who(m.appliesTo)}`,
        value: parts.length > 0 ? (omitAge ? parts.join(" · ") : `${parts.join(" · ")} · ${range}`) : (omitAge ? "—" : range),
        kind: "income",
      });
    } else if (m.kind === "income_growth_range") {
      const range = formatAgeRangeCompact(m.startAge, m.endAge);
      const parts: string[] = [];
      if (m.baseGrowthPct != null) parts.push(`base ${m.baseGrowthPct}%`);
      if (m.bonusGrowthPct != null) parts.push(`bonus ${m.bonusGrowthPct}%`);
      blocks.push({
        label: `Growth adjustment ${who(m.appliesTo)}`,
        value: parts.length > 0 ? (omitAge ? parts.join(" · ") : `${parts.join(" · ")} · ${range}`) : (omitAge ? "—" : range),
        kind: "income",
      });
    } else if (m.kind === "income_milestone") {
      const mil = m as IncomeMilestoneMutation;
      const parts: string[] = [];
      if (mil.baseAnnual !== null) parts.push(`Base: ${formatMoney(mil.baseAnnual)}`);
      if (mil.bonusAnnual !== null) parts.push(`Bonus: ${formatMoney(mil.bonusAnnual)}`);
      const incomeValue = parts.length > 0
        ? (omitAge ? parts.join(" · ") : `${parts.join(" · ")} · Age ${mil.age}`)
        : (omitAge ? "—" : `Age ${mil.age}`);
      blocks.push({
        label: `Income change ${who(mil.appliesTo)}`,
        value: incomeValue,
        kind: "income",
      });
      if (mil.growthPct != null && Number.isFinite(mil.growthPct)) {
        blocks.push({
          label: `Growth adjustment ${who(mil.appliesTo)}`,
          value: omitAge ? `${mil.growthPct}%` : `${mil.growthPct}% · Age ${mil.age}+`,
          kind: "income",
        });
      }
    } else if (m.kind === "income_one_time_bonus") {
      const bon = m as OneTimeBonusMutation;
      blocks.push({
        label: `Income change ${who(bon.appliesTo)}`,
        value: omitAge ? formatMoney(bon.amount) : `${formatMoney(bon.amount)} · Age ${bon.age}`,
        kind: "income",
      });
    } else if (m.kind === "income_cap_range") {
      const cap = m as IncomeCapMutation;
      const range = formatAgeRangeCompact(cap.startAge, cap.endAge);
      const parts: string[] = [];
      if (cap.baseCapAnnual !== null) parts.push(`Base ≤ ${formatMoney(cap.baseCapAnnual)}`);
      if (cap.bonusCapAnnual !== null) parts.push(`Bonus ≤ ${formatMoney(cap.bonusCapAnnual)}`);
      blocks.push({
        label: `Income change ${who(cap.appliesTo)}`,
        value: parts.length > 0 ? (omitAge ? parts.join(" · ") : `${parts.join(" · ")} · ${range}`) : (omitAge ? "—" : range),
        kind: "income",
      });
    } else if (m.kind === "income_growth_step") {
      const step = m as IncomeGrowthStepMutation;
      blocks.push({
        label: `Growth adjustment ${who(step.appliesTo)}`,
        value: omitAge ? `${step.growthPct}%` : `${step.growthPct}% · Age ${step.age}+`,
        kind: "income",
      });
    } else if (m.kind === "expense_one_time") {
      const ex = m as ExpenseOneTimeMutation;
      const amt = formatMoney(Math.abs(ex.amountAnnual));
      blocks.push({
        label: "One-time expense",
        value: omitAge ? amt : `${amt} · Age ${ex.age}`,
        kind: "expense",
      });
    } else if (m.kind === "expense_recurring") {
      const ex = m as ExpenseRecurringMutation;
      const amt = formatMoney(Math.abs(ex.amountAnnual));
      const range = formatAgeRangeCompact(ex.startAge, ex.endAge);
      blocks.push({
        label: "Recurring expense",
        value: omitAge ? `${amt} / year` : `${amt} / year · ${range}`,
        kind: "expense",
      });
    } else if (m.kind === "home_purchase") {
      const h = m as HomePurchaseMutation;
      const price = formatMoney(h.purchasePrice);
      const down = formatMoney(h.downAmount);
      blocks.push({
        label: "Home purchase",
        value: omitAge ? `${price}, ${down} down` : `${price}, ${down} down · Age ${h.age}`,
        kind: "neutral",
      });
    } else {
      blocks.push({ label: "Update", value: "—", kind: "neutral" });
    }
  }

  return blocks.length > 0 ? blocks : [{ label: "Update", value: "No impacts defined yet", kind: "neutral" as const }];
}

export function formatAppliesTo(appliesTo?: IncomeAppliesTo): string {
  if (appliesTo === "partner") return "Partner";
  if (appliesTo === "both") return "Household";
  return "Me";
}

function whoPrefix(appliesTo?: IncomeAppliesTo): string {
  return formatAppliesTo(appliesTo) + ": ";
}

function isBreakOwned(m: { mutationId?: string }): boolean {
  return m.mutationId?.startsWith("break:") === true;
}

function formatIncomeSetRange(m: IncomeSetRangeMutation): string {
  const range = formatAgeRange(m.startAge, m.endAge);
  const parts: string[] = [];
  if (m.baseAnnual !== null) {
    parts.push(`base ${formatMoney(m.baseAnnual)}`);
  }
  if (m.bonusAnnual !== null) {
    parts.push(`bonus ${formatMoney(m.bonusAnnual)}`);
  }
  const clause = parts.length > 0 ? parts.join(", ") : "unchanged";
  return `Income set ${range}: ${clause}`;
}

function formatIncomeGrowthRange(m: IncomeGrowthRangeMutation): string {
  const range = formatAgeRange(m.startAge, m.endAge);
  const parts: string[] = [];
  if (m.baseGrowthPct !== null) {
    parts.push(`base ${m.baseGrowthPct}%`);
  }
  if (m.bonusGrowthPct !== null) {
    parts.push(`bonus ${m.bonusGrowthPct}%`);
  }
  const clause = parts.length > 0 ? parts.join(", ") : "unchanged";
  return `Income growth ${range}: ${clause}`;
}

const BREAK_DURING_ID = "break:during";
const BREAK_AFTER_ID = "break:after";
const BREAK_AFTER_GROWTH_ID = "break:afterGrowth";

export function buildLifeEventSummary(
  event: Omit<LifeEvent, "summary"> & { summary?: string[] },
): string[] {
  const mutations = event.mutations ?? [];
  if (mutations.length === 0) {
    return ["No impacts defined yet"];
  }

  const breakDuring = mutations.find(
    (m): m is IncomeSetRangeMutation =>
      m.kind === "income_set_range" &&
      (m as { mutationId?: string }).mutationId === BREAK_DURING_ID,
  );
  const breakAfter = mutations.find(
    (m): m is IncomeSetRangeMutation =>
      m.kind === "income_set_range" &&
      (m as { mutationId?: string }).mutationId === BREAK_AFTER_ID,
  );
  const breakGrowth = mutations.find(
    (m): m is IncomeGrowthRangeMutation =>
      m.kind === "income_growth_range" &&
      (m as { mutationId?: string }).mutationId === BREAK_AFTER_GROWTH_ID,
  );

  const lines: string[] = [];

  if (breakDuring ?? breakAfter ?? breakGrowth) {
    if (breakDuring) {
      const who = whoPrefix(breakDuring.appliesTo);
      const range = formatAgeRange(breakDuring.startAge, breakDuring.endAge);
      const parts: string[] = [];
      if (breakDuring.baseAnnual !== null) {
        parts.push(`base ${formatMoney(breakDuring.baseAnnual)}`);
      }
      if (breakDuring.bonusAnnual !== null) {
        parts.push(`bonus ${formatMoney(breakDuring.bonusAnnual)}`);
      }
      const clause = parts.length > 0 ? parts.join(", ") : "unchanged";
      lines.push(`${who}Break income ${range}: ${clause}`);
    }
    if (breakAfter ?? breakGrowth) {
      const who = whoPrefix(
        (breakAfter ?? breakGrowth)?.appliesTo,
      );
      const anchorAge = breakAfter
        ? breakAfter.startAge
        : breakGrowth!.startAge;
      const afterParts: string[] = [];
      if (breakAfter) {
        const baseBonus: string[] = [];
        if (breakAfter.baseAnnual !== null) {
          baseBonus.push(`base ${formatMoney(breakAfter.baseAnnual)}`);
        }
        if (breakAfter.bonusAnnual !== null) {
          baseBonus.push(`bonus ${formatMoney(breakAfter.bonusAnnual)}`);
        }
        if (baseBonus.length > 0) {
          afterParts.push(`${baseBonus.join(", ")}`);
        }
      }
      let afterLine = `${who}After break at age ${anchorAge}`;
      if (afterParts.length > 0) {
        afterLine += `: ${afterParts.join(", ")}`;
      }
      if (breakGrowth) {
        const basePct = breakGrowth.baseGrowthPct;
        const bonusPct = breakGrowth.bonusGrowthPct;
        const hasBase = basePct !== null && Number.isFinite(basePct);
        const hasBonus = bonusPct !== null && Number.isFinite(bonusPct);
        if (hasBase && hasBonus && basePct === bonusPct) {
          afterLine += `; grows ${basePct}%/yr`;
        } else if (hasBase || hasBonus) {
          const growthParts: string[] = [];
          if (hasBase) growthParts.push(`base ${basePct}%/yr`);
          if (hasBonus) growthParts.push(`bonus ${bonusPct}%/yr`);
          afterLine += `; grows ${growthParts.join(", ")}`;
        }
      }
      lines.push(afterLine);
    }
  }

  for (const m of mutations) {
    if (isBreakOwned(m as { mutationId?: string })) continue;
    if (m.kind === "income_set_range") {
      lines.push(whoPrefix(m.appliesTo) + formatIncomeSetRange(m));
    } else if (m.kind === "income_growth_range") {
      lines.push(whoPrefix(m.appliesTo) + formatIncomeGrowthRange(m));
    } else if (m.kind === "income_milestone") {
      const mil = m as IncomeMilestoneMutation;
      const who = whoPrefix(mil.appliesTo);
      const parts: string[] = [];
      if (mil.baseAnnual !== null) parts.push(`base ${formatMoney(mil.baseAnnual)}`);
      if (mil.bonusAnnual !== null) parts.push(`bonus ${formatMoney(mil.bonusAnnual)}`);
      const clause = parts.length > 0 ? parts.join(", ") : "set";
      lines.push(`${who}Income milestone at age ${mil.age}: ${clause}`);
      if (mil.growthPct != null && Number.isFinite(mil.growthPct)) {
        lines.push(`${who}Income growth from age ${mil.age}: ${mil.growthPct}%`);
      }
    } else if (m.kind === "income_one_time_bonus") {
      const bon = m as OneTimeBonusMutation;
      lines.push(`${whoPrefix(bon.appliesTo)}One-time bonus at age ${bon.age}: ${formatMoney(bon.amount)}`);
    } else if (m.kind === "income_cap_range") {
      const cap = m as IncomeCapMutation;
      const who = whoPrefix(cap.appliesTo);
      const range =
        cap.endAge === null
          ? `from ${cap.startAge} through retirement`
          : `from ${cap.startAge}–${cap.endAge}`;
      const parts: string[] = [];
      if (cap.baseCapAnnual !== null) parts.push(`base ≤ ${formatMoney(cap.baseCapAnnual)}`);
      if (cap.bonusCapAnnual !== null) parts.push(`bonus ≤ ${formatMoney(cap.bonusCapAnnual)}`);
      const clause = parts.length > 0 ? parts.join(", ") : "cap";
      lines.push(`${who}Income cap ${range}: ${clause}`);
    } else if (m.kind === "income_growth_step") {
      const step = m as IncomeGrowthStepMutation;
      lines.push(`${whoPrefix(step.appliesTo)}Income growth from age ${step.age}: ${step.growthPct}%`);
    } else if (m.kind === "expense_one_time") {
      const ex = m as ExpenseOneTimeMutation;
      const signed = ex.amountAnnual >= 0 ? `+${formatMoney(ex.amountAnnual)}` : `−${formatMoney(Math.abs(ex.amountAnnual))}`;
      lines.push(`One-time expense ${signed}/yr at age ${ex.age}`);
    } else if (m.kind === "expense_recurring") {
      const ex = m as ExpenseRecurringMutation;
      const signed = ex.amountAnnual >= 0 ? `+${formatMoney(ex.amountAnnual)}` : `−${formatMoney(Math.abs(ex.amountAnnual))}`;
      const range = ex.endAge == null ? `from age ${ex.startAge} onward` : `ages ${ex.startAge}–${ex.endAge}`;
      lines.push(`Recurring expense ${signed}/yr ${range}`);
    } else if (m.kind === "home_purchase") {
      const h = m as HomePurchaseMutation;
      lines.push(
        `Home purchase at age ${h.age}: ${formatMoney(h.purchasePrice)}, ${formatMoney(h.downAmount)} down, ${h.mortgageRatePct}% rate, ${h.loanTermYears} yr`,
      );
    }
  }

  return lines.length > 0 ? lines : ["No impacts defined yet"];
}

export function withRebuiltSummary(evt: LifeEvent): LifeEvent {
  const { summary: _s, ...rest } = evt;
  return {
    ...evt,
    summary: buildLifeEventSummary(rest),
  };
}
