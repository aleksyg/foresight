import type { PlanState } from "@/engine/types/planState";
import type { OnboardingInputs } from "@/store/onboardingStore";

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

  const lifestyleMonthly =
    inputs.lifestyleMonthly ?? Math.round((inputs.householdIncome * 0.25) / 12);

  const monthlyRent =
    inputs.monthlyRent ?? Math.round(inputs.householdIncome / 40);

  const monthlyMortgage =
    inputs.monthlyMortgage ?? Math.round(inputs.householdIncome / 40);

  const employerMatchPct = inputs.employerMatchPct ?? 50;
  const employerMatchUpToPct = inputs.employerMatchUpToPct ?? 6;
  const hasPartner = inputs.hasPartner ?? false;

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
            hasPlan: true,
            employeePreTaxContributionPct: 6,
            hasEmployerMatch: true,
            employerMatchPct,
            employerMatchUpToPct,
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
      hasChildren: false,
      housing:
        inputs.housing === "own"
          ? { status: "own", monthlyPaymentPITI: monthlyMortgage }
          : { status: "rent", monthlyRent },
    },

    expenses: {
      mode: "total",
      lifestyleMonthly,
    },

    debt: [],

    balanceSheet: {
      assets: [
        {
          id: "cash",
          label: "Cash & Savings",
          type: "cash",
          owner: "user",
          balance: Math.round(inputs.totalSavings * 0.3),
        },
        {
          id: "retirement",
          label: "401(k) / IRA",
          type: "retirementTaxDeferred",
          owner: "user",
          balance: Math.round(inputs.totalSavings * 0.7),
        },
      ],
      home: {
        owner: "user",
        currentValue: 0,
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
