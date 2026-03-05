import type { PlanState } from "@/engine/types/planState";
import type { OnboardingInputs } from "@/store/onboardingStore";

function computeMonthlyPayment(balance: number, aprPct: number, months: number): number {
  const r = aprPct / 100 / 12;
  if (r === 0) return Math.round(balance / months);
  return Math.round((r * balance) / (1 - Math.pow(1 + r, -months)));
}

function addYears(ym: PlanState["asOfYearMonth"], years: number): PlanState["asOfYearMonth"] {
  return `${parseInt(ym.slice(0, 4)) + years}-${ym.slice(5)}` as PlanState["asOfYearMonth"];
}

/**
 * Converts Stage 1 sketch inputs into a PlanState the engine can simulate.
 * Uses sensible defaults for everything not yet entered.
 */
export function buildPlanFromOnboarding(inputs: OnboardingInputs): PlanState {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0") as
    | "01" | "02" | "03" | "04" | "05" | "06"
    | "07" | "08" | "09" | "10" | "11" | "12";
  const asOfYearMonth = `${now.getFullYear()}-${month}` as PlanState["asOfYearMonth"];

  // Lifestyle & rent
  const lifestyleMonthly =
    inputs.lifestyleMonthly ?? Math.round((inputs.householdIncome * 0.25) / 12);
  const monthlyRent =
    inputs.monthlyRent ?? Math.round(inputs.householdIncome / 40);

  // Mortgage payment: derive from balance if provided, else income heuristic
  const monthlyMortgage = inputs.monthlyMortgage
    ?? (inputs.mortgageBalance
        ? computeMonthlyPayment(inputs.mortgageBalance, 6.5, 360)
        : Math.round(inputs.householdIncome / 40));

  // 401k
  const has401k = inputs.has401k ?? true;
  const contributionPct = inputs.contributionPct ?? 6;
  const hasEmployerMatch = inputs.hasEmployerMatch ?? true;
  const employerMatchPct = inputs.employerMatchPct ?? 50;
  const employerMatchUpToPct = inputs.employerMatchUpToPct ?? 6;

  // Partner
  const hasPartner = inputs.hasPartner ?? false;

  // Savings split
  const anyBucketSet =
    inputs.retirementSavings !== undefined ||
    inputs.brokerageSavings !== undefined ||
    inputs.cashSavings !== undefined;
  const retirementBal = inputs.retirementSavings
    ?? (anyBucketSet ? 0 : Math.round(inputs.totalSavings * 0.7));
  const brokerageBal = inputs.brokerageSavings ?? 0;
  const cashBal = inputs.cashSavings
    ?? (anyBucketSet
        ? Math.max(0, inputs.totalSavings - retirementBal - brokerageBal)
        : Math.round(inputs.totalSavings * 0.3));

  return {
    asOfYearMonth,
    startAge: inputs.age,
    endAge: inputs.retirementAge,

    household: {
      user: {
        age: inputs.age,
        income: {
          baseAnnual: inputs.householdIncome,
          hasBonus: false,
          preTaxDeductionsMonthly: 0,
          retirement: {
            hasPlan: has401k,
            employeePreTaxContributionPct: has401k ? contributionPct : 0,
            hasEmployerMatch: has401k ? hasEmployerMatch : false,
            employerMatchPct: has401k && hasEmployerMatch ? employerMatchPct : 0,
            employerMatchUpToPct: has401k && hasEmployerMatch ? employerMatchUpToPct : 0,
          },
          incomeGrowthRate: 0.03,
        },
      },
      hasPartner,
      partner: hasPartner
        ? {
            age: inputs.partnerAge ?? inputs.age,
            income: {
              baseAnnual: inputs.partnerIncome ?? 80_000,
              hasBonus: false,
              preTaxDeductionsMonthly: 0,
              retirement: {
                hasPlan: true,
                employeePreTaxContributionPct: 6,
                hasEmployerMatch: true,
                employerMatchPct: 50,
                employerMatchUpToPct: 6,
              },
              incomeGrowthRate: 0.03,
            },
          }
        : undefined,
      tax: {
        filingStatus: hasPartner ? "marriedJoint" : "single",
      },
      hasChildren: inputs.hasChildren ?? false,
      children:
        inputs.hasChildren && (inputs.childrenMonthlyCost ?? 0) > 0
          ? [{ id: "child1", age: 0, monthlyExpense: inputs.childrenMonthlyCost }]
          : undefined,
      housing:
        inputs.housing === "own"
          ? { status: "own", monthlyPaymentPITI: monthlyMortgage }
          : { status: "rent", monthlyRent },
    },

    expenses: {
      mode: "total",
      lifestyleMonthly,
    },

    debt:
      inputs.hasDebt && (inputs.debtBalance ?? 0) > 0
        ? [
            {
              id: "debt",
              label: "Other Debt",
              type: "other" as const,
              balance: inputs.debtBalance!,
              aprPct: 6.5,
              payoffYearMonth: addYears(asOfYearMonth, 5),
              monthlyPayment: computeMonthlyPayment(inputs.debtBalance!, 6.5, 60),
              monthlyPaymentIsOverride: false,
            },
          ]
        : [],

    balanceSheet: {
      assets: [
        {
          id: "cash",
          label: "Cash & Savings",
          type: "cash",
          owner: "user",
          balance: cashBal,
        },
        {
          id: "retirement",
          label: "401(k) / IRA",
          type: "retirementTaxDeferred",
          owner: "user",
          balance: retirementBal,
        },
        ...(brokerageBal > 0
          ? [
              {
                id: "brokerage",
                label: "Taxable Investments",
                type: "brokerage" as const,
                owner: "user" as const,
                balance: brokerageBal,
              },
            ]
          : []),
      ],
      home: {
        owner: "user",
        currentValue: inputs.homeValue ?? 0,
      },
    },

    assumptions: {
      inflationRate: 0.025,
      returnRate: 0.07,
      cashRate: 0.04,
      flatTaxRate: 0.28,
      stateTaxRate: 0.05,
    },
  };
}
