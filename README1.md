# Foresight — Life-Forward Financial Planning

A financial planning application built around life decisions, not accounts. Users model life events (marriage, children, home purchase, career changes) and see their real-time impact on a 30-year projection. The core experience is a persistent financial roadmap that updates as events are toggled — telling users not just what they'll have, but what to do with their money, and why, at every phase of life.

---

## Product Vision

Most financial apps are built around accounts. Foresight is built around decisions. The target user is 28–42, dual-income household, $100K–$300K HHI, actively making life decisions that have major financial consequences they can't easily model. The product wins by making people feel capable and informed, not by being the most technically complete tool.

**Core design principle:** The product should know more than the user needs to, and surface only what changes how they act. Users never see marginal rates. They see "Roth saves you $340K."

**Core product loop:** Toggle a life event → see a one-sentence consequence → see the lever that fixes any problem.

---

## Tech Stack

```
Next.js 14 (App Router)
TypeScript
Tailwind CSS
Recharts (projection chart)
Zustand (global plan state)
Lora + Geist + Geist Mono (fonts)
```

No UI component library dependency — build components from scratch to maintain design control. Shadcn/ui is acceptable for primitives (Dialog, Switch, Slider) but style everything through the design system.

---

## Repository Structure

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, font loading
│   │   ├── page.tsx                # Redirect → /onboarding or /plan
│   │   ├── onboarding/
│   │   │   ├── page.tsx            # Onboarding shell
│   │   │   ├── stage1/page.tsx     # The Sketch (5 questions)
│   │   │   ├── stage2/page.tsx     # Refinement (partner, debt, 401k, bonus)
│   │   │   └── retirement/page.tsx # Retirement lifestyle module
│   │   └── plan/
│   │       └── page.tsx            # Main dashboard (three-column layout)
│   │
│   ├── engine/                     # Simulation engine (existing, minimal changes)
│   │   ├── index.ts
│   │   ├── simulatePlan.ts
│   │   ├── types/
│   │   │   ├── planState.ts
│   │   │   └── yearInputs.ts
│   │   └── utils/
│   │       ├── tax.ts
│   │       └── debt.ts
│   │
│   ├── scenario/
│   │   ├── lifeEvents/             # Existing life events system
│   │   │   ├── types.ts
│   │   │   ├── factory.ts
│   │   │   ├── summary.ts
│   │   │   ├── toTargetedOverrides.ts
│   │   │   └── editors/            # Per-event editor components
│   │   │       ├── HomePurchaseEditor.tsx
│   │   │       ├── IncomeImpactEditor.tsx
│   │   │       ├── ExpenseEditor.tsx
│   │   │       └── EquityVestEditor.tsx   # NEW
│   │   └── compute/
│   │       ├── buildScenario.ts    # Wraps rulespec + applyHomePurchase
│   │       ├── compareRothVsPretax.ts  # NEW: run simulatePlan twice, return delta
│   │       ├── milestoneEtas.ts    # NEW: derive milestone ages from YearRow[]
│   │       ├── roadmapPhases.ts    # NEW: derive roadmap phases from YearRow[]
│   │       └── retirementNeeds.ts  # NEW: lifestyle inputs → monthly spend → FI number
│   │
│   ├── store/
│   │   ├── planStore.ts            # Zustand: PlanState + lifeEvents + UI state
│   │   └── onboardingStore.ts      # Zustand: onboarding progress + staged inputs
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── LifeEventsSidebar.tsx   # Left panel
│   │   │   ├── RoadmapPanel.tsx        # Right panel (always visible)
│   │   │   └── MainContent.tsx         # Center content shell + tabs
│   │   ├── lifeEvents/
│   │   │   ├── EventCard.tsx           # Toggleable card with color, icon, toggle response
│   │   │   ├── EventCardToggleResponse.tsx  # The "Your plan absorbs this" sentence
│   │   │   ├── EventEditor.tsx         # Modal/sheet for editing an event
│   │   │   └── AddEventFlow.tsx        # Creation flow
│   │   ├── chart/
│   │   │   ├── ProjectionChart.tsx     # Main Recharts line chart
│   │   │   ├── EventMarker.tsx         # Colored dots on chart line
│   │   │   ├── MilestoneMarker.tsx     # Horizontal tick marks at wealth levels
│   │   │   └── SocialSecurityOverlay.tsx  # Dotted SS income line
│   │   ├── roadmap/
│   │   │   ├── RoadmapPhase.tsx        # One temporal phase
│   │   │   ├── AllocationRow.tsx       # One line item with reason
│   │   │   └── PhaseEventBadge.tsx     # Event badge at phase transition
│   │   ├── milestones/
│   │   │   ├── MilestoneGrid.tsx
│   │   │   ├── MilestoneCard.tsx       # Badge + progress + why + share
│   │   │   └── MilestoneShareCard.tsx  # Shareable achievement card
│   │   ├── insights/
│   │   │   ├── RothCallout.tsx         # Roth vs traditional insight card
│   │   │   ├── BonusDeploymentCard.tsx # How bonus is modeled
│   │   │   └── DriftAlert.tsx          # When roadmap makes a tradeoff
│   │   └── onboarding/
│   │       ├── SliderInput.tsx
│   │       ├── RangeSlider.tsx
│   │       ├── TapSelect.tsx
│   │       └── RetirementLifestyleModule.tsx
│   │
│   ├── lib/
│   │   ├── format.ts               # formatCurrency, formatAge, formatDelta
│   │   ├── toggleResponse.ts       # NEW: compute toggle response sentences
│   │   └── constants.ts            # MILESTONES, EVENT_COLORS, DEFAULT_ASSUMPTIONS
│   │
│   └── styles/
│       ├── globals.css
│       └── design-tokens.css       # CSS custom properties
│
├── README.md
└── package.json
```

---

## Design System

### Fonts
```css
/* Headings, emotional moments, large numbers */
font-family: 'Lora', serif;

/* Body, labels, UI text */
font-family: 'Geist', sans-serif;

/* All monetary values, ages, percentages */
font-family: 'Geist Mono', monospace;
```

Load via Next.js `next/font/google`:
```ts
import { Lora, Geist, Geist_Mono } from 'next/font/google'
```

### Color Tokens
```css
:root {
  /* Surfaces */
  --paper:    #FAFAF8;   /* page background */
  --surface:  #F4F3EF;   /* card backgrounds, sidebar */
  --border:   #E5E3DC;   /* all borders */

  /* Ink */
  --ink:      #1A1916;   /* primary text */
  --ink-60:   #6B6860;   /* secondary text, labels */
  --ink-30:   #B5B2AA;   /* placeholders, disabled */

  /* Gold — primary brand, milestone achieved, priority-1 allocation */
  --gold:     #B8922A;
  --gold-bg:  #FBF5E6;

  /* Event type colors */
  --sage:     #3D6B50;   --sage-bg:  #EBF4EE;   /* career, income positive */
  --slate:    #3D5470;   --slate-bg: #EBF0F5;   /* home, housing */
  --rose:     #8B3D3D;   --rose-bg:  #F5EBEB;   /* children, dependents */
  --plum:     #5C3D70;   --plum-bg:  #F0EBF5;   /* education, college */
  --amber:    #8B5A2B;   --amber-bg: #F5EEEB;   /* sabbatical, leave */
  --teal:     #2B6B6B;   --teal-bg:  #EBF4F4;   /* equity, RSU */
}
```

### Typography Scale
```
display:     Lora 28px/500   letter-spacing: -0.02em   (page titles, "Hello, Alex.")
title:       Lora 18px/500   letter-spacing: -0.02em   (section headers)
label-caps:  Geist 10px/500  letter-spacing: 0.08em  text-transform: uppercase
body:        Geist 13px/300
body-small:  Geist 11px/300
mono:        Geist Mono 12px/400  (all numbers)
```

### Spacing
8px base unit. Use multiples: 4, 8, 12, 16, 20, 24, 32, 48.

### Component Patterns
- Cards: `rounded-xl border border-[--border] bg-white p-4` or `p-5`
- Sidebar cards: same but with colored active state
- Pills/badges: `rounded-full px-3 py-1 text-xs font-medium`
- Toggle: custom implementation, not browser checkbox

---

## Layout — Main Dashboard (`/plan`)

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (280px)  │      MAIN (flex-1)       │  ROADMAP (320px) │
│                   │                           │                  │
│  Logo             │  Hello, Alex.             │  Financial       │
│  ──────────────   │  3 events · Age 30        │  Roadmap         │
│  Life Events      │                           │  ──────────────  │
│                   │  [metric] [metric] [metric]│  Ages 30–30      │
│  💍 Marriage  ●   │                           │  · 401k match    │
│  👶 First child   │  Tabs: Dashboard |        │  · Emergency     │
│  🏠 Buy a home ●  │        Allocation |       │  · Down pmt      │
│  🚀 Career leap ● │        Milestones         │                  │
│  🌍 Sabbatical    │                           │  Ages 31–32      │
│  🎓 College       │  [Projection Chart]       │  💍 Marriage     │
│                   │                           │  · 401k match    │
│  + Add event      │  [Active events panel]    │  · Roth IRA      │
│                   │  [Roth callout]           │  · Down pmt      │
│                   │  [Bonus deployment]       │                  │
│                   │                           │  Ages 33–36      │
│                   │                           │  🚀 Career leap  │
│                   │                           │  · 401k match    │
│                   │                           │  · Roth IRA      │
│                   │                           │  · Brokerage     │
└─────────────────────────────────────────────────────────────┘
```

All three columns are `height: 100vh`, independently scrollable. No page scroll.

---

## Engine Integration

### The simulation is pure — run it on every state change

```ts
// In planStore.ts or a useMemo in the plan page
const baselineRows = useMemo(
  () => simulatePlan(plan, { minEndAge: 85 }),
  [plan]
)

const scenarioRows = useMemo(() => {
  const overrides = enabledEvents.flatMap(e =>
    buildOverridesFromLifeEvent(e, { minAge: plan.startAge, maxAge: plan.endAge })
  )
  if (overrides.length === 0) return baselineRows

  let yearInputs = buildScenarioYearInputsFromOverrides(plan, overrides)
  yearInputs = extendYearInputsToAge(yearInputs, plan, 85)
  yearInputs = applyHomePurchaseToYearInputs(plan, yearInputs, enabledEvents)

  return simulatePlan(plan, { yearInputs, minEndAge: 85 })
}, [plan, enabledEvents, baselineRows])
```

### New computations needed (thin wrappers, not engine changes)

**`milestoneEtas.ts`**
```ts
export function getMilestoneEta(rows: YearRow[], targetNetWorth: number): number | null {
  return rows.find(r => r.endNetWorth >= targetNetWorth)?.age ?? null
}
```

**`compareRothVsPretax.ts`**
```ts
// Clone plan, swap employeePreTaxContributionPct → employeeRothContributionPct
// Run simulatePlan twice, compare final endRetirementRothValue + endRetirementTaxDeferredValue
// Account for tax on withdrawal from pre-tax (use flatTaxRate assumption)
// Return: { rothWins: boolean, delta: number, explanation: string }
```

**`roadmapPhases.ts`**
```ts
// Derive phase boundaries from enabled life event ages
// For each phase: slice scenarioRows for that age range
// Compute average monthlyContrib, annualIncome for the phase
// Run allocation waterfall against that monthly savings capacity
// Return: RoadmapPhase[]
```

**`retirementNeeds.ts`**
```ts
// Input: lifestyle choices (housing, travel, work, location)
// Output: { monthlySpend: number, portfolioTarget: number, ssOffset: number, gapMonthly: number }
// portfolioTarget = (monthlySpend - ssOffset) * 12 / 0.04  (4% rule)
```

**`toggleResponse.ts`**
```ts
// Input: baselineRows, scenarioRows (before + after toggle), event toggled
// Output: one sentence string
// Logic:
//   - Get retireRow from both
//   - Delta in endNetWorth at retirement
//   - Did retirement age change? (rows.find(r => r.endNetWorth >= fiNumber))
//   - Is the plan still on track? (retireRow.endNetWorth >= fiNumber)
// Templates:
//   absorbed:  "Your plan absorbs this. Retirement at {age} stays on track."
//   stretched: "This pushes your retirement {N} years. Increasing contributions ${X}/mo brings it back."
//   offset:    "Offset by your career leap — net impact is +${X}K at retirement."
//   negative:  "This reduces retirement wealth by ${X}K. Still above your target."
//   positive:  "This adds ${X}K to your retirement. Timeline moves {N} years earlier."
```

### Known engine bugs to fix before production
1. `expense_recurring` in `toTargetedOverrides.ts` pre-expands into O(n) overrides — replace with ranged override
2. 6-month cash buffer hardcoded — move to `plan.assumptions`
3. `income_growth_range` ignores `endAge` — needs bounded growth support

---

## Onboarding Flow

### Stage 1 — `/onboarding/stage1` — "The Sketch"

Frame: *"Give us 90 seconds. We'll show you where you stand."*

Fields (in order, each on its own visual step):
1. First name — text input
2. Age — slider 22–65, large display number
3. Household income — range slider with labeled brackets ($50K / $100K / $150K / $200K / $250K+)
4. Total savings (rough) — slider or input, "rough is fine"
5. Own or rent — two large tap targets
6. Target retirement age — slider 50–70

On completion: immediately render the projection chart with these inputs. User sees their first insight before being asked for anything else.

### Stage 2 — Inline refinement (prompted from the plan page)

Surfaces as contextual prompts in the roadmap/insights, not a separate page:
- "Do you have a partner?" → partner income input
- "Any debt?" → total debt + rough monthly payment
- "Does your employer match your 401k?" → contribution % + match % + up to %
- "Annual bonus?" → amount + typical quarter
- "How is your savings split?" → slider: X% cash, Y% invested

Each prompt appears when it would materially improve an insight. Example: Roth callout appears, but if 401k match economics aren't entered, a flag shows: "Based on typical 4% match — enter yours for accuracy."

### Stage 3 — Depth (earned over time)

Accessed via "Improve your estimates" in settings or contextual prompts:
- Individual account balances (cash / brokerage / pre-tax 401k / Roth IRA / HSA / 529)
- Individual debts (label, balance, APR, payoff month) — uses `computeSuggestedDebtMonthlyPayment` from engine
- Partner's full income + retirement details
- Equity awards → creates a life event card

### Retirement Lifestyle Module — `/onboarding/retirement`

Frame: *"Tell us what you want retirement to feel like. We'll figure out the number."*

Steps:
1. Housing — "Own outright" / "Rent" / "Downsize"
2. Travel — slider 0–10 trips/year
3. Still work? — "Yes, part-time" / "Maybe" / "No"
4. Where — "Same city" / "Lower cost area" / "Abroad"

Output card:
```
Based on your inputs:

$7,200 / month in today's dollars
$11,400 / month in retirement dollars (age 62)

You need: $2.85M in your portfolio
Social Security covers: $2,400/mo from age 67
Your portfolio needs to cover: $4,800/mo

You're on track to reach this at age 61. ✓
```

---

## Life Events System

### Event card anatomy
```tsx
<EventCard
  event={event}           // LifeEvent from engine types
  onToggle={toggleFn}
  onEdit={editFn}
  onDelete={deleteFn}
  toggleResponse={string} // computed by toggleResponse.ts, shown 4s after toggle
/>
```

### Event types and their colors
| Event | Icon | Color | Key mutations |
|-------|------|-------|---------------|
| Marriage | 💍 | gold | expense_recurring (joint costs) |
| First child | 👶 | rose | expense_recurring (childcare) |
| Second child | 👶 | rose | expense_recurring (childcare) |
| Buy a home | 🏠 | slate | home_purchase |
| Career leap | 🚀 | sage | income_milestone or income_set_range |
| Sabbatical | 🌍 | amber | income_set_range (zero income period) |
| Kids college | 🎓 | plum | expense_recurring + expense_one_time |
| RSU vest | 📈 | teal | income_one_time_bonus (at vest dates) |
| One-time expense | 💸 | neutral | expense_one_time |

### Toggle response sentence generation
See `toggleResponse.ts` above. Key scenarios to handle:
- Plan absorbed (on track): "Your plan absorbs this. Retirement at 62 stays on track."
- Timeline stretched: "This pushes your retirement 2 years. Increasing contributions $200/mo brings it back."
- Offset by other event: "Offset by your career leap — net impact is +$180K at retirement."
- Positive event: "This adds $340K to your retirement. You could retire a year earlier."
- Multiple events interacting: mention the interaction explicitly

---

## Financial Roadmap — Computation Logic

```ts
type RoadmapPhase = {
  fromAge: number
  toAge: number
  isCurrent: boolean
  phaseEvents: LifeEvent[]        // events that trigger AT fromAge
  income: number                  // annual income at start of phase
  monthlySavingsCapacity: number  // average monthly savings in this phase from engine
  allocations: AllocationItem[]
}

type AllocationItem = {
  label: string
  detail: string    // the "why" sentence — required, never omit
  amount: number    // monthly
  priority: 1 | 2 | 3 | 4
  bucket: 'emergency' | 'tax-shelter' | 'growth' | 'flexibility'
}
```

### Allocation waterfall (per phase)
Run in priority order against `monthlySavingsCapacity`:

1. **Emergency fund** (priority 1, gold) — if < 6mo expenses: compute monthly to close gap in 18mo
   - Detail: "Building to {N} months of expenses — {M} months covered today"
2. **401(k) to match** (priority 2, slate) — `income * matchUpToPct / 12`
   - Detail: "Capturing your full {X}% employer match — a guaranteed 100% return"
3. **HSA maximum** (priority 3, sage) — $4,300/12 if applicable
   - Detail: "Triple tax-advantaged — deductible now, tax-free growth, tax-free withdrawal for medical"
4. **Down payment savings** (priority 2, slate) — if home purchase event active and in future
   - Detail: "Targeting ${X}K by age {Y} — on pace with {N} months buffer"
   - Replaces Roth in phases before home purchase
5. **Roth IRA** (priority 3, sage) — $7,000/12 if income under phase-out
   - Detail: "Moderate bracket now — tax-free growth pays off significantly at retirement"
6. **401(k) beyond match** (priority 3, sage) — up to IRS limit
   - Detail: "Max deferral — reduces taxable income by ${X}/year"
7. **Taxable brokerage** (priority 4, plum) — remaining capacity
   - Detail: "Flexibility and liquidity — accessible without penalty before 59½"

---

## Milestones

```ts
const MILESTONES = [
  {
    id: 'emergency',
    emoji: '🌱',
    name: 'Emergency Fund',
    amount: (plan) => plan.household.expenses * 6,  // dynamic
    why: 'Six months covered means no emergency becomes a financial crisis.',
    shareText: 'My emergency fund is fully funded 🌱'
  },
  {
    id: '100k',
    emoji: '🏆',
    name: 'First $100K',
    amount: 100_000,
    why: 'The hardest milestone. After this, compounding starts pulling its weight.',
    shareText: 'Just hit my first $100K 🏆 The hardest one. Compounding takes over from here.'
  },
  {
    id: 'downpayment',
    emoji: '🏡',
    name: 'Down Payment Ready',
    amount: (plan) => plan.lifeEvents.find(e => e.label === 'Buy a home')?.oneTimeCost ?? 90_000,
    why: 'Ready to buy without draining your emergency fund or touching retirement.',
    showOnlyIf: (plan) => plan.lifeEvents.some(e => e.label === 'Buy a home' && e.enabled)
  },
  {
    id: '250k',
    emoji: '💎',
    name: 'Quarter Million',
    amount: 250_000,
    why: "You've built a foundation most people never reach. Compounding is doing real work."
  },
  {
    id: '500k',
    emoji: '⚡',
    name: 'Half a Million',
    amount: 500_000,
    why: 'Your portfolio now earns more annually than most people save in a decade.'
  },
  {
    id: '1m',
    emoji: '🌟',
    name: 'Seven Figures',
    amount: 1_000_000,
    why: 'Your money works harder than you do. The second million comes faster.'
  },
  {
    id: 'fi',
    emoji: '🏔',
    name: 'Financial Independence',
    amount: (plan) => plan.retirementNeeds.monthlySpend * 12 / 0.04,  // 4% rule
    why: 'Work becomes optional. Every day forward is a choice, not a requirement.',
    shareText: 'Reached my FI number 🏔 Work is now optional.'
  },
]
```

Milestone card states:
- **Locked** (not yet reached): grayscale emoji, progress bar, ETA
- **In progress** (next milestone): full color, animated progress bar, ETA prominent
- **Reached**: gold shimmer border, `badgePop` animation on first render, checkmark, age reached
- **Share**: small share icon on reached cards, generates clean shareable image card

---

## Copy Guidelines

### Toggle response templates
Write these for each event type. Keep under 15 words. Advisor tone.

```ts
// Positive events (income increase)
"This adds ${delta}K to retirement. You could reach your goal a year earlier."
"Career leap accelerates your timeline — retirement at {age} is now realistic."

// Neutral/absorbed
"Your plan absorbs this comfortably. Retirement at {age} stays on track."
"A $22K dip at {age} — recovered by {age+3}. On track."

// Challenging but manageable  
"This reduces retirement wealth by ${delta}K. Still above your target."
"This stretches your timeline {N} years. ${X}/mo extra closes the gap."

// Combinations
"Home purchase and career leap together: net +${delta}K. The leap more than covers it."
"Three events active — your plan holds. Retirement at {age}, ${amount}M projected."
```

### Never say
- "baseline" (say "without your events" or "without this plan")
- "marginal rate" or any tax jargon
- "amortization" or "APR" in user-facing copy
- "scenario" (say "with your plan" or "your life events")
- Anything that implies the user needs to understand the math

### Always say
- Specific numbers ("$340K" not "significant savings")
- Ages not years ("at age 37" not "in 7 years" — though "7 years from now" is fine alongside age)
- Positive frame first ("Your plan handles this" before "but here's what changes")

---

## Key Interactions

### Toggle → Response loop
1. User taps toggle on EventCard
2. Event state updates immediately (optimistic)
3. `simulatePlan` reruns (fast — pure function, <10ms for 55 years)
4. Chart animates to new projection
5. `toggleResponse.ts` computes response sentence
6. Sentence fades in below the card (300ms delay so chart animation leads)
7. Sentence auto-dismisses after 4 seconds
8. Roadmap phases recompute and update

### Milestone unlock animation
1. `previousRows` prop tracked in MilestoneCard
2. When `currentWealth` crosses threshold: trigger `badgePop` CSS animation
3. Gold shimmer border appears with fade-in
4. Subtle sound optional (Web Audio API, user opt-in)
5. Share prompt appears 800ms after unlock animation

### Onboarding → Plan transition
1. Stage 1 complete → immediately show plan page with sketch-quality data
2. Inline refinement prompts appear contextually as user explores
3. No "you must complete setup" gate — partial data is fine
4. Plan page shows accuracy indicators where data is estimated: "~" prefix on imprecise numbers

---

## State Management (Zustand)

```ts
// planStore.ts
interface PlanStore {
  // Core plan state
  plan: PlanState | null
  lifeEvents: LifeEvent[]
  
  // Computed (derived, not stored — use selectors)
  // baselineRows, scenarioRows, roadmapPhases, milestoneEtas
  
  // UI state
  activeTab: 'dashboard' | 'allocation' | 'milestones'
  selectedAge: number
  lastToggleResponse: { eventId: string; sentence: string; timestamp: number } | null
  
  // Actions
  setPlan: (plan: PlanState) => void
  upsertLifeEvent: (event: LifeEvent) => void
  toggleLifeEvent: (id: string) => void
  deleteLifeEvent: (id: string) => void
  setActiveTab: (tab: string) => void
  setToggleResponse: (eventId: string, sentence: string) => void
}
```

Use `useMemo` for all derived computations (rows, phases, milestones) — keep the store minimal.

---

## What We're NOT Building Yet

These are explicitly deferred. Plant seeds in the UI but don't build:

- **Withdrawal sequencing** — show a hook at age 55 in roadmap: "Withdrawal strategy — optimize as you approach retirement"
- **RMDs** — not mentioned in v1
- **State tax optimization** — flat rate assumption, adjustable in assumptions panel
- **Itemized deductions** — standard deduction only
- **Full equity modeling** (83b, AMT) — RSU vest as simple income event only
- **Bank sync / account aggregation** — manual entry only in v1
- **Social Security full formula** — heuristic only (~40% of final salary, capped at $3,600/mo)
- **529 optimization** — expense event only
- **Insurance modeling** — not in scope

---

## Getting Started

```bash
npx create-next-app@latest foresight --typescript --tailwind --app
cd foresight

# Install dependencies
npm install zustand recharts
npm install --save-dev @types/node

# Copy engine files
cp -r /path/to/engine src/engine
cp -r /path/to/lifeEvents src/scenario/lifeEvents

# Install fonts (next/font/google handles this automatically)
# Add to layout.tsx:
# import { Lora } from 'next/font/google'
# import { Geist, Geist_Mono } from 'next/font/google'
```

### Build order recommendation

1. **Design system first** — `globals.css`, design tokens, font setup, base card/button components
2. **Engine integration** — `planStore.ts`, verify `simulatePlan` runs in browser, add `milestoneEtas.ts`
3. **Plan page shell** — three-column layout, responsive breakpoints, tab structure
4. **Projection chart** — `ProjectionChart.tsx` with Recharts, baseline + scenario lines, event markers
5. **Roadmap panel** — `roadmapPhases.ts` computation, `RoadmapPanel.tsx` render
6. **Life event sidebar** — `EventCard.tsx` with toggle, `toggleResponse.ts` computation
7. **Milestones tab** — `MilestoneCard.tsx` with animation, milestone ETA computation
8. **Insights** — `RothCallout.tsx`, `BonusDeploymentCard.tsx`, `DriftAlert.tsx`
9. **Onboarding** — Stage 1, Stage 2 inline prompts, retirement lifestyle module
10. **Polish** — animations, micro-interactions, share cards, copy refinement
