# AI Context

## What this is
Life-event-based financial planning app. Engine is pure TypeScript,
already written — don't rewrite it. UI is Next.js 14 App Router + Tailwind.

## Critical conventions
- All monetary values: Geist Mono font, never Inter
- User never sees tax jargon — only consequence numbers
- "baseline" → say "without your events" in all copy
- simulatePlan() is pure — run it in useMemo, never in useEffect
- Roadmap phases derived from YearRow[] output, not hardcoded

## What's already decided (don't re-suggest)
- Recharts for the projection chart
- Zustand for state
- No UI component library except shadcn primitives
- Lora + Geist + Geist Mono font stack
- Three-column layout: sidebar 280px | main flex-1 | roadmap 320px

## Known engine bugs (don't fix yet, just be aware)
- expense_recurring pre-expands into O(n) overrides in toTargetedOverrides.ts
- 6-month cash buffer hardcoded in simulatePlan.ts
- income_growth_range ignores endAge