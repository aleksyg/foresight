import type { LifeEvent } from "@/scenario/lifeEvents/types";

/**
 * Default life events shown on the plan page. Ages are relative to a typical
 * user starting at age 30 — they will be shifted at plan build time if needed.
 * Each event ships with real Mutation[] the engine can simulate.
 */
export function buildDefaultLifeEvents(startAge = 30): LifeEvent[] {
  const offset = startAge - 30;

  return [
    {
      id: "marriage",
      title: "Marriage",
      enabled: true,
      summary: ["Partner joins household", "Shared cost savings ~$650/mo"],
      iconKey: "partner",
      mutations: [
        {
          kind: "expense_recurring",
          startAge: 31 + offset,
          endAge: null,
          amountAnnual: -7800, // -$650/mo — shared cost savings (food, utilities, etc.)
        },
      ],
    },
    {
      id: "first_child",
      title: "First child",
      enabled: true,
      summary: ["Childcare, food, clothing through age 18", "$2,500/mo added spend"],
      iconKey: "child",
      mutations: [
        {
          kind: "expense_recurring",
          startAge: 33 + offset,
          endAge: 51 + offset, // 18 years
          amountAnnual: 30_000, // $2,500/mo
        },
      ],
    },
    {
      id: "home",
      title: "Buy a home",
      enabled: true,
      summary: ["Replace rent with ownership", "$450K purchase at age 35"],
      iconKey: "home",
      mutations: [
        {
          kind: "home_purchase",
          age: 35 + offset,
          purchasePrice: 450_000,
          downPct: 20,
          downAmount: 90_000,
          mortgageRatePct: 6.5,
          loanTermYears: 30,
          taxesInsuranceMonthly: 750,
          appreciationPct: 3,
          replaceExistingHousing: true,
          closingCostsPct: 2.5,
        },
      ],
    },
    {
      id: "career",
      title: "Career leap",
      enabled: true,
      summary: ["Jump to senior role at age 40", "Base salary to $185K"],
      iconKey: "raise",
      mutations: [
        {
          kind: "income_set_range",
          startAge: 40 + offset,
          endAge: null,
          baseAnnual: 185_000,
          bonusAnnual: null,
          appliesTo: "user",
        },
      ],
    },
    {
      id: "sabbatical",
      title: "Sabbatical",
      enabled: false,
      summary: ["One year off at age 45", "No income + $1,500/mo extra spend"],
      iconKey: "custom",
      mutations: [
        {
          kind: "income_set_range",
          startAge: 45 + offset,
          endAge: 45 + offset,
          baseAnnual: 0,
          bonusAnnual: 0,
          appliesTo: "user",
        },
        {
          kind: "expense_recurring",
          startAge: 45 + offset,
          endAge: 45 + offset,
          amountAnnual: 18_000, // $1,500/mo travel & living
        },
      ],
    },
    {
      id: "college",
      title: "Kids college",
      enabled: false,
      summary: ["Four years of tuition + living", "$800/mo for 4 years"],
      iconKey: "graduation",
      mutations: [
        {
          kind: "expense_recurring",
          startAge: 47 + offset,
          endAge: 50 + offset,
          amountAnnual: 9_600, // $800/mo
        },
      ],
    },
  ];
}
