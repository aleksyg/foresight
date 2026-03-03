import type { YearRow } from "@/engine/simulatePlan";

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}K`;
  return `$${Math.round(abs)}`;
}

/**
 * One-sentence consequence line shown in the sidebar after a toggle.
 * Returns a short human-readable sentence describing net worth impact at retirement.
 */
export function buildToggleResponse(
  eventTitle: string,
  nowEnabled: boolean,
  baselineRows: YearRow[],
  scenarioRows: YearRow[],
): string {
  if (baselineRows.length === 0 || scenarioRows.length === 0) return "";

  const baseEnd = baselineRows[baselineRows.length - 1]!.endNetWorth;
  const scenEnd = scenarioRows[scenarioRows.length - 1]!.endNetWorth;
  const delta = scenEnd - baseEnd;

  const direction = delta >= 0 ? "adds" : "costs";
  const absDelta = fmt(Math.abs(delta));

  if (!nowEnabled) {
    return `${eventTitle} removed from your plan.`;
  }

  if (Math.abs(delta) < 1000) {
    return `${eventTitle} added — minimal net-worth impact by retirement.`;
  }

  return `${eventTitle} ${direction} ${absDelta} in net worth by retirement.`;
}
