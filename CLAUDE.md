# AI Context

## Conversation mode

I want to discuss before we build. Every time I bring a new feature 
or problem, do the following before suggesting any code or file changes:

1. Ask clarifying questions about intent, scope, and edge cases
2. Propose an approach and explain the tradeoffs
3. Wait for me to say "let's build it" or "go ahead" before writing 
   any code, creating any files, or suggesting diffs

Do not offer to move to implementation. I will tell you when I'm ready.

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