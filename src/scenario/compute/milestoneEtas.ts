import type { PlanState } from "@/engine/types/planState";
import type { YearRow } from "@/engine";
import type { LifeEvent } from "@/scenario/lifeEvents/types";

export interface MilestoneResult {
  id: string;
  emoji: string;
  name: string;
  amount: number;
  amountLabel: string;
  state: "reached" | "next" | "locked";
  /** First simulation year where endNetWorth ≥ amount. Undefined if already reached or beyond sim. */
  etaAge?: number;
  /** 0–100 progress toward this milestone. 100 when reached. */
  progress: number;
  why: string;
}

function fmtMilestone(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function computeMilestones(
  plan: PlanState,
  rows: YearRow[],
  lifeEvents: LifeEvent[],
): MilestoneResult[] {
  const currentNW = rows[0]?.endNetWorth ?? 0;
  const housingMonthly = rows[0]?.housingMonthly ?? 0;
  const startAge = plan.startAge;

  // Resolve lifestyle monthly from union type
  const lifestyleMonthly =
    plan.expenses.mode === "total"
      ? plan.expenses.lifestyleMonthly
      : plan.expenses.items.reduce((s, i) => s + i.monthlyAmount, 0);

  // Emergency fund: 6 months of lifestyle + housing
  const emergencyTarget =
    Math.round(((lifestyleMonthly + housingMonthly) * 6) / 1_000) * 1_000 || 18_000;

  // Down payment: from home purchase mutation, only shown if home event is enabled
  const homeEvent = lifeEvents.find((e) => e.id === "home");
  const showDownPayment = Boolean(homeEvent?.enabled);
  const homeMutation = homeEvent?.mutations.find((m) => m.kind === "home_purchase");
  const downPayment =
    homeMutation && homeMutation.kind === "home_purchase" ? homeMutation.downAmount : 90_000;

  // FI number: 25× annual spend (4% rule)
  const monthlySpend = lifestyleMonthly + housingMonthly;
  const fiTarget = Math.max(500_000, Math.round((monthlySpend * 12 * 25) / 10_000) * 10_000);

  // First row where endNetWorth ≥ target
  const etaAge = (target: number): number | undefined =>
    rows.find((r) => r.endNetWorth >= target)?.age;

  const build = (
    id: string,
    emoji: string,
    name: string,
    target: number,
    why: string,
  ): MilestoneResult => {
    const reached = currentNW >= target;
    const progress = reached
      ? 100
      : Math.min(99, Math.round((Math.max(0, currentNW) / target) * 100));
    return {
      id,
      emoji,
      name,
      amount: target,
      amountLabel: fmtMilestone(target),
      state: reached ? "reached" : "locked",
      etaAge: reached ? undefined : etaAge(target),
      progress,
      why,
    };
  };

  // Build all milestones, then filter and sort
  const all: (MilestoneResult & { show: boolean })[] = [
    { ...build("emergency", "🌱", "Emergency Fund", emergencyTarget,
        "Six months covered means no emergency becomes a financial crisis."), show: true },
    { ...build("downpayment", "🏡", "Down Payment Ready", downPayment,
        "Ready to buy without draining your emergency fund or touching retirement."), show: showDownPayment },
    { ...build("100k", "🏆", "First $100K", 100_000,
        "The hardest milestone. After this, compounding starts pulling its weight."), show: true },
    { ...build("250k", "💎", "Quarter Million", 250_000,
        "You've built a foundation most people never reach. Compounding does real work now."), show: true },
    { ...build("500k", "⚡", "Half a Million", 500_000,
        "Your portfolio now earns more annually than most people save in a year."), show: true },
    { ...build("1m", "🌟", "Seven Figures", 1_000_000,
        "Your money works harder than you do. The second million comes faster."), show: true },
    { ...build("fi", "🏔️", "Financial Independence", fiTarget,
        "Work becomes optional. Every day forward is a choice, not a requirement."), show: true },
  ];

  // Keep only visible, sort ascending by target amount
  const visible = all
    .filter((m) => m.show)
    .sort((a, b) => a.amount - b.amount)
    .map(({ show: _show, ...m }) => m);

  // Mark the first unmet milestone as "next"
  const nextIdx = visible.findIndex((m) => m.state !== "reached");
  if (nextIdx !== -1) visible[nextIdx] = { ...visible[nextIdx], state: "next" };

  // Suppress startAge reference in returned object — caller has it from plan
  void startAge;

  return visible;
}
