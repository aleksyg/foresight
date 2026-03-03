import type { Debt, Expenses, Housing, PlanState, YearInputs } from './types/planState';
import {
  computeEmployeePayrollTaxes,
  computeFederalIncomeTax,
  getStandardDeduction,
} from './utils/tax';

export type YearRow = {
  age: number;
  yearIndex: number;

  grossIncome: number;
  /** User gross annual (base + bonus) for this year. */
  userGrossIncome: number;
  /** User base salary only. */
  userBaseIncome: number;
  /** User bonus only. */
  userBonusIncome: number;
  /** Partner gross annual when hasPartner; 0 otherwise. */
  partnerGrossIncome: number;
  /** Partner base only. */
  partnerBaseIncome: number;
  /** Partner bonus only. */
  partnerBonusIncome: number;
  taxableIncome: number;
  taxableIncomeAfterDeduction: number;
  standardDeductionUsed: number;
  federalIncomeTax: number;
  stateIncomeTax: number;
  payrollTax: number;
  payrollTaxSocialSecurity: number;
  payrollTaxMedicare: number;
  payrollTaxAdditionalMedicare: number;
  taxesPaid: number;
  afterTaxIncome: number;

  housingMonthly: number;
  debtMonthly: number;
  lifestyleMonthly: number;

  totalMonthlyOutflow: number;
  annualSavings: number;

  employeeRetirementAnnual: number;
  employeeRetirementPreTaxAnnual: number;
  employeeRetirementRothAnnual: number;
  employerMatchAnnual: number;
  retirementTotalAnnual: number;

  endCashValue: number;
  endBrokerageValue: number;
  endRetirementTaxDeferredValue: number;
  endRetirementRothValue: number;
  endAssetValue: number;
  /** Home value used for this year’s net-worth calc (scenario can override via YearInputs.homeValue). */
  homeValue: number;
  endNetWorth: number;

  totalDebtBalance: number;
  /** Remaining balance of mortgage-type debts only (subset of totalDebtBalance). */
  remainingMortgageBalance: number;
  totalDebtPrincipalPaid: number;
  totalDebtInterestPaid: number;
  /** Interest paid on mortgage-type debts only this year (subset of totalDebtInterestPaid). */
  mortgageInterestPaid: number;
};

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

type DebtLike = Pick<Debt, 'id' | 'type' | 'balance' | 'aprPct' | 'monthlyPayment'>;

/**
 * Amortize debts for 12 months; returns updated balances, total principal paid, and total interest
 * paid this year.
 *
 * Interest always accrues. Each month:
 *   balanceAfterInterest = balance + interest
 *   paymentApplied = min(monthlyPayment, balanceAfterInterest)
 *   interestPaid = min(paymentApplied, interest)
 *   principalPaid = max(0, paymentApplied - interest)
 *   newBalance = balanceAfterInterest - paymentApplied
 *
 * When payment < interest (negative amortization), unpaid interest is added to balance; balance
 * can grow. Each debt amortized independently.
 */
function amortizeDebtsForYear(
  debts: readonly DebtLike[],
  balances: Record<string, number>,
): {
  updatedBalances: Record<string, number>;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  mortgageInterestPaid: number;
} {
  const nextBalances = { ...balances };
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let mortgageInterestPaid = 0;

  for (let month = 0; month < 12; month++) {
    for (const debt of debts) {
      const balance = nextBalances[debt.id] ?? debt.balance;
      if (balance <= 0) continue;

      const monthlyRate = debt.aprPct / 100 / 12;
      const interest = round2(balance * monthlyRate);
      const balanceAfterInterest = round2(balance + interest);
      const paymentApplied = round2(
        Math.min(debt.monthlyPayment, balanceAfterInterest),
      );
      const interestPaid = round2(Math.min(paymentApplied, interest));
      const principalPaid = round2(Math.max(0, paymentApplied - interest));
      const newBalance = round2(balanceAfterInterest - paymentApplied);

      nextBalances[debt.id] = newBalance;
      totalPrincipalPaid += principalPaid;
      totalInterestPaid += interestPaid;
      if (debt.type.startsWith('mortgage')) mortgageInterestPaid += interestPaid;
    }
  }

  return {
    updatedBalances: nextBalances,
    totalPrincipalPaid: round2(totalPrincipalPaid),
    totalInterestPaid: round2(totalInterestPaid),
    mortgageInterestPaid: round2(mortgageInterestPaid),
  };
}

function getHousingMonthly(housing: Housing): number {
  return housing.status === 'rent' ? housing.monthlyRent : housing.monthlyPaymentPITI;
}

function getLifestyleMonthly(expenses: Expenses): number {
  if (expenses.mode === 'total') return expenses.lifestyleMonthly;
  return expenses.items.reduce((sum, item) => sum + item.monthlyAmount, 0);
}

function getDebtMonthlyFromList(debts: readonly DebtLike[]): number {
  return debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
}

type CompAtAge = {
  baseAnnual: number;
  bonusAnnual: number;
  grossAnnual: number;
};

function mergePersonCompAtYearIndex(args: {
  yearIndex: number;
  income: {
    baseAnnual: number;
    hasBonus: boolean;
    bonusAnnual?: number;
    incomeGrowthRate: number;
  };
  segments?: IncomeBaseAnnualSegment[];
  /** When true, allow IncomeBaseAnnualSegments to override base and zero bonus (legacy behavior). */
  allowSegments: boolean;
  /** Explicit per-year overrides; either field may be omitted to preserve baseline behavior. */
  yearInputs?: { baseAnnual?: number; bonusAnnual?: number };
}): CompAtAge {
  const baseline = getPersonCompAtYearIndex(
    args.yearIndex,
    args.income,
    args.allowSegments ? args.segments : undefined,
  );
  const baseAnnual = args.yearInputs?.baseAnnual ?? baseline.baseAnnual;
  const bonusAnnual = args.yearInputs?.bonusAnnual ?? baseline.bonusAnnual;
  return { baseAnnual, bonusAnnual, grossAnnual: baseAnnual + bonusAnnual };
}

function getActiveBaseAnnualSegment(
  segments: IncomeBaseAnnualSegment[] | undefined,
  yearIndex: number,
): IncomeBaseAnnualSegment | null {
  if (!segments || segments.length === 0) return null;
  // Last segment that matches wins (allows overrides to be appended).
  let best: IncomeBaseAnnualSegment | null = null;
  for (const s of segments) {
    const startOk = yearIndex >= s.startYearIndex;
    const endOk = s.endYearIndexInclusive == null || yearIndex <= s.endYearIndexInclusive;
    if (startOk && endOk) best = s;
  }
  return best;
}

function getPersonCompAtYearIndex(
  yearIndex: number,
  income: {
    baseAnnual: number;
    hasBonus: boolean;
    bonusAnnual?: number;
    incomeGrowthRate: number;
  },
  segments?: IncomeBaseAnnualSegment[],
): CompAtAge {
  const seg = getActiveBaseAnnualSegment(segments, yearIndex);
  if (seg) {
    const yearsSinceStart = Math.max(0, yearIndex - seg.startYearIndex);
    const growth = Math.pow(1 + income.incomeGrowthRate, yearsSinceStart);
    const baseAnnual = seg.baseAnnual * growth;
    // v1: when income is overridden by a segment (e.g. time off), assume bonus is 0.
    return { baseAnnual, bonusAnnual: 0, grossAnnual: baseAnnual };
  }

  const growth = Math.pow(1 + income.incomeGrowthRate, Math.max(0, yearIndex));
  const baseAnnual = income.baseAnnual * growth;
  const bonusAnnual = income.hasBonus ? (income.bonusAnnual ?? 0) * growth : 0;
  return { baseAnnual, bonusAnnual, grossAnnual: baseAnnual + bonusAnnual };
}

/** Options for scenario runs (e.g. partner quits from a given year index). */
export type IncomeBaseAnnualSegment = {
  startYearIndex: number;
  /** Inclusive. If omitted, applies through end of projection. */
  endYearIndexInclusive?: number;
  /** Base annual income at the segment start (before growth within the segment). */
  baseAnnual: number;
};

export type SimulatePlanOptions = {
  /** From this year index onward, partner income and retirement contrib are treated as 0. */
  partnerZeroIncomeFromYearIndex?: number;

  /**
   * From this year index onward, override housing monthly as rent.
   * Useful for time-based scenarios without mutating the baseline PlanState.
   */
  housingMonthlyRentFromYearIndex?: number;
  housingMonthlyRentOverride?: number;

  /** Piecewise base-annual overrides for user income (supports time off + return). */
  userBaseAnnualSegments?: IncomeBaseAnnualSegment[];
  /** Piecewise base-annual overrides for partner income (supports time off + return). */
  partnerBaseAnnualSegments?: IncomeBaseAnnualSegment[];

  /**
   * Explicit per-year inputs (materialized outside the engine).
   * If provided, these take precedence over other scenario options.
   */
  yearInputs?: YearInputs[];

  /**
   * Minimum end age for the simulation. Simulation runs through at least this age
   * (e.g. 85) regardless of plan.endAge. When yearInputs is shorter than the
   * extended range, missing years use baseline behavior.
   */
  minEndAge?: number;
};

export function simulatePlan(plan: PlanState, options?: SimulatePlanOptions): YearRow[] {
  const rows: YearRow[] = [];
  const partnerZeroFromYearIndex = options?.partnerZeroIncomeFromYearIndex;
  const hasYearInputs = Boolean(options?.yearInputs && options.yearInputs.length > 0);

  const lifestyleMonthly = getLifestyleMonthly(plan.expenses);
  const baselineHousingMonthly = getHousingMonthly(plan.household.housing);

  const housingOverrideFromYearIndex = options?.housingMonthlyRentFromYearIndex;
  const housingOverrideMonthly = options?.housingMonthlyRentOverride;

  const baselineHomeValue = plan.balanceSheet.home.currentValue;

  // Per-debt balances (amortized year-over-year)
  let debtBalances: Record<string, number> = {};
  let activeDebts: DebtLike[] = plan.debt.map((d) => ({
    id: d.id,
    type: d.type,
    balance: d.balance,
    aprPct: d.aprPct,
    monthlyPayment: d.monthlyPayment,
  }));
  for (const d of activeDebts) {
    debtBalances[d.id] = d.balance;
  }

  // Track separate balances for future tax-aware withdrawal logic.
  let cashValue = 0;
  let brokerageValue = 0;
  let retirementTaxDeferredValue = 0;
  let retirementRothValue = 0;
  for (const a of plan.balanceSheet.assets) {
    if (a.type === 'cash') cashValue += a.balance;
    else if (a.type === 'retirementTaxDeferred') retirementTaxDeferredValue += a.balance;
    else if (a.type === 'retirementRoth') retirementRothValue += a.balance;
    else brokerageValue += a.balance; // v1: everything else treated as taxable investments
  }

  const effectiveEndAge = options?.minEndAge != null
    ? Math.max(plan.endAge, options.minEndAge)
    : plan.endAge;
  const years = effectiveEndAge - plan.startAge + 1;
  const incomeOpts =
    partnerZeroFromYearIndex !== undefined
      ? { partnerZeroFromYearIndex, yearIndex: 0 }
      : undefined;

  let currentHomeValue = baselineHomeValue;

  for (let i = 0; i < years; i++) {
    const age = plan.startAge + i;
    if (incomeOpts) incomeOpts.yearIndex = i;

    const yi = hasYearInputs && i < (options!.yearInputs!.length) ? options!.yearInputs![i] : undefined;
    const yiSafe = yi && yi.yearIndex === i ? yi : undefined;

    // Apply any new debts starting at this year index.
    if (yiSafe?.addDebts && yiSafe.addDebts.length) {
      for (const d of yiSafe.addDebts) {
        const next: DebtLike = {
          id: d.id,
          type: d.type as Debt['type'],
          balance: d.balance,
          aprPct: d.aprPct,
          monthlyPayment: d.monthlyPayment,
        };
        activeDebts = [...activeDebts, next];
        debtBalances[d.id] = d.balance;
      }
    }

    const housingMonthly = yiSafe?.housingMonthly ?? (
      !hasYearInputs &&
      housingOverrideFromYearIndex !== undefined &&
      housingOverrideMonthly !== undefined &&
      i >= housingOverrideFromYearIndex
        ? housingOverrideMonthly
        : baselineHousingMonthly
    );
    const childExpenseMonthly = plan.household.hasChildren
      ? (plan.household.children ?? []).reduce((sum, child) => {
          return child.age + i < 18 ? sum + (child.monthlyExpense ?? 0) : sum;
        }, 0)
      : 0;
    const lifestyleMonthlyThis = (yiSafe?.lifestyleMonthly ?? lifestyleMonthly) + childExpenseMonthly;
    const debtMonthly = getDebtMonthlyFromList(activeDebts);
    const totalMonthlyOutflow = lifestyleMonthlyThis + housingMonthly + debtMonthly;
    const annualOutflow = totalMonthlyOutflow * 12;

    // Amortize debts for 12 months (monthly inner loop).
    // Runs before cashflow; both use same scheduled payments. When we stop payments mid-year,
    // amortization and annualOutflow should align (reduce outflow for months after payoff).
    const { updatedBalances, totalPrincipalPaid, totalInterestPaid, mortgageInterestPaid } =
      amortizeDebtsForYear(activeDebts, debtBalances);
    debtBalances = updatedBalances;

    const totalDebtBalance = round2(
      activeDebts.reduce((sum, d) => sum + (debtBalances[d.id] ?? 0), 0),
    );
    const remainingMortgageBalance = round2(
      activeDebts.reduce((sum, d) => {
        const bal = debtBalances[d.id] ?? 0;
        return d.type.startsWith('mortgage') ? sum + bal : sum;
      }, 0),
    );

    const zeroPartner =
      !hasYearInputs &&
      incomeOpts?.partnerZeroFromYearIndex !== undefined &&
      incomeOpts?.yearIndex !== undefined &&
      incomeOpts.yearIndex >= incomeOpts.partnerZeroFromYearIndex;

    const userComp = mergePersonCompAtYearIndex({
      yearIndex: i,
      income: plan.household.user.income,
      segments: options?.userBaseAnnualSegments,
      allowSegments: !hasYearInputs,
      yearInputs: yiSafe?.user,
    });

    const partnerComp =
      plan.household.hasPartner && plan.household.partner && !zeroPartner
        ? (() => {
            return mergePersonCompAtYearIndex({
              yearIndex: i,
              income: plan.household.partner!.income,
              segments: options?.partnerBaseAnnualSegments,
              allowSegments: !hasYearInputs,
              yearInputs: yiSafe?.partner,
            });
          })()
        : null;

    const grossIncome = userComp.grossAnnual + (partnerComp?.grossAnnual ?? 0);

    const userIncomeRetirement = {
      ...plan.household.user.income.retirement,
      ...(yiSafe?.user?.retirement ?? {}),
    };
    const userRet = (() => {
      if (!userIncomeRetirement?.hasPlan) {
        return { employeePreTax: 0, employeeRoth: 0, employeeTotal: 0, employer: 0, total: 0 };
      }
      const employeePreTaxPct = (userIncomeRetirement.employeePreTaxContributionPct ?? 0) / 100;
      const employeeRothPct = (userIncomeRetirement.employeeRothContributionPct ?? 0) / 100;
      const employeeTotalPct = employeePreTaxPct + employeeRothPct;
      const employeePreTax = userComp.baseAnnual * employeePreTaxPct;
      const employeeRoth = userComp.baseAnnual * employeeRothPct;
      const employeeTotal = employeePreTax + employeeRoth;
      let employer = 0;
      if (userIncomeRetirement.hasEmployerMatch) {
        const matchRate = (userIncomeRetirement.employerMatchPct ?? 0) / 100;
        const upTo = (userIncomeRetirement.employerMatchUpToPct ?? 0) / 100;
        const matchedPct = Math.min(employeeTotalPct, upTo);
        employer = userComp.baseAnnual * matchedPct * matchRate;
      }
      return { employeePreTax, employeeRoth, employeeTotal, employer, total: employeeTotal + employer };
    })();
    const partnerRet =
      plan.household.hasPartner && plan.household.partner && !zeroPartner
        ? (() => {
            const partnerIncomeRetirement = {
              ...plan.household.partner!.income.retirement,
              ...(yiSafe?.partner?.retirement ?? {}),
            };
            if (!partnerIncomeRetirement?.hasPlan) {
              return { employeePreTax: 0, employeeRoth: 0, employeeTotal: 0, employer: 0, total: 0 };
            }
            const employeePreTaxPct = (partnerIncomeRetirement.employeePreTaxContributionPct ?? 0) / 100;
            const employeeRothPct = (partnerIncomeRetirement.employeeRothContributionPct ?? 0) / 100;
            const employeeTotalPct = employeePreTaxPct + employeeRothPct;
            const employeePreTax = (partnerComp?.baseAnnual ?? 0) * employeePreTaxPct;
            const employeeRoth = (partnerComp?.baseAnnual ?? 0) * employeeRothPct;
            const employeeTotal = employeePreTax + employeeRoth;
            let employer = 0;
            if (partnerIncomeRetirement.hasEmployerMatch) {
              const matchRate = (partnerIncomeRetirement.employerMatchPct ?? 0) / 100;
              const upTo = (partnerIncomeRetirement.employerMatchUpToPct ?? 0) / 100;
              const matchedPct = Math.min(employeeTotalPct, upTo);
              employer = (partnerComp?.baseAnnual ?? 0) * matchedPct * matchRate;
            }
            return { employeePreTax, employeeRoth, employeeTotal, employer, total: employeeTotal + employer };
          })()
        : { employeePreTax: 0, employeeRoth: 0, employeeTotal: 0, employer: 0, total: 0 };

    const retirement = {
      employeePreTax: userRet.employeePreTax + partnerRet.employeePreTax,
      employeeRoth: userRet.employeeRoth + partnerRet.employeeRoth,
      employeeTotal: userRet.employeeTotal + partnerRet.employeeTotal,
      employer: userRet.employer + partnerRet.employer,
      total: userRet.total + partnerRet.total,
    };

    // Taxes (v1): federal income tax (brackets + standard deduction) + employee-side payroll taxes.
    const filingStatus = plan.household.tax.filingStatus;

    const userPreTaxDeductionsAnnual = round2(((yiSafe?.user?.preTaxDeductionsMonthly ?? plan.household.user.income.preTaxDeductionsMonthly ?? 0) * 12));
    const partnerPreTaxDeductionsAnnual = round2(
      partnerComp
        ? ((yiSafe?.partner?.preTaxDeductionsMonthly ?? plan.household.partner!.income.preTaxDeductionsMonthly ?? 0) * 12)
        : 0,
    );
    const householdPreTaxDeductionsAnnual = round2(
      userPreTaxDeductionsAnnual + partnerPreTaxDeductionsAnnual,
    );

    const taxableIncome = Math.max(
      0,
      grossIncome - retirement.employeePreTax - householdPreTaxDeductionsAnnual,
    );
    const standardDeductionUsed = getStandardDeduction(filingStatus);
    const taxableIncomeAfterDeduction = Math.max(
      0,
      taxableIncome - standardDeductionUsed,
    );

    const federalIncomeTax = computeFederalIncomeTax(
      taxableIncomeAfterDeduction,
      filingStatus,
    );

    // Placeholder state tax (v1): apply a flat rate to taxable income after standard deduction.
    const stateTaxRate = yiSafe?.rates?.stateTaxRate ?? (plan.assumptions.stateTaxRate ?? 0);
    const stateIncomeTax = round2(taxableIncomeAfterDeduction * stateTaxRate);

    // FICA wages are reduced by pre-tax payroll deductions (but NOT by 401k pre-tax contributions).
    const userFicaWages = Math.max(0, userComp.grossAnnual - userPreTaxDeductionsAnnual);
    const partnerFicaWages = Math.max(
      0,
      (partnerComp?.grossAnnual ?? 0) - partnerPreTaxDeductionsAnnual,
    );
    const payroll = computeEmployeePayrollTaxes(
      { user: userFicaWages, partner: partnerFicaWages },
      filingStatus,
    );

    const payrollTax = payroll.total;
    const taxesPaid = round2(federalIncomeTax + stateIncomeTax + payrollTax);

    // After-tax income is after pre-tax retirement, pre-tax payroll deductions, and taxes.
    const afterTaxIncome = round2(
      grossIncome - retirement.employeePreTax - householdPreTaxDeductionsAnnual - taxesPaid,
    );

    // Cashflow: base vs bonus split. Taxes unchanged (always from gross).
    const totalBonus = userComp.bonusAnnual + (partnerComp?.bonusAnnual ?? 0);
    let netBonusCash = 0;
    let modeledBaseTakeHome = 0;

    if (totalBonus > 0) {
      const grossBaseOnly = userComp.baseAnnual + (partnerComp?.baseAnnual ?? 0);
      const taxableBaseOnly = Math.max(
        0,
        grossBaseOnly - retirement.employeePreTax - householdPreTaxDeductionsAnnual,
      );
      const taxableAfterDedBaseOnly = Math.max(0, taxableBaseOnly - standardDeductionUsed);
      const federalBaseOnly = computeFederalIncomeTax(taxableAfterDedBaseOnly, filingStatus);
      const stateBaseOnly = round2(taxableAfterDedBaseOnly * stateTaxRate);
      const userFicaBaseOnly = Math.max(0, userComp.baseAnnual - userPreTaxDeductionsAnnual);
      const partnerFicaBaseOnly = Math.max(
        0,
        (partnerComp?.baseAnnual ?? 0) - partnerPreTaxDeductionsAnnual,
      );
      const payrollBaseOnly = computeEmployeePayrollTaxes(
        { user: userFicaBaseOnly, partner: partnerFicaBaseOnly },
        filingStatus,
      );
      const taxesBaseOnly = round2(federalBaseOnly + stateBaseOnly + payrollBaseOnly.total);
      const incrementalTaxOnBonus = round2(taxesPaid - taxesBaseOnly);
      netBonusCash = round2(Math.max(0, totalBonus - incrementalTaxOnBonus));
      modeledBaseTakeHome = round2(
        afterTaxIncome - retirement.employeeRoth - totalBonus + incrementalTaxOnBonus,
      );
    } else {
      modeledBaseTakeHome = round2(afterTaxIncome - retirement.employeeRoth);
    }

    const totalBase = userComp.baseAnnual + (partnerComp?.baseAnnual ?? 0);
    const userShare = totalBase > 0 ? userComp.baseAnnual / totalBase : 1;
    const partnerShare = totalBase > 0 ? (partnerComp?.baseAnnual ?? 0) / totalBase : 0;

    const userObserved = yiSafe?.user?.observedBaseNetPayMonthly;
    const partnerObserved = yiSafe?.partner?.observedBaseNetPayMonthly;

    const userBaseCash =
      userObserved != null
        ? round2(userObserved * 12)
        : round2(modeledBaseTakeHome * userShare);
    const partnerBaseCash =
      partnerObserved != null
        ? round2(partnerObserved * 12)
        : round2(modeledBaseTakeHome * partnerShare);

    const cashInFromBase = round2(userBaseCash + partnerBaseCash);
    const cashAvailableForOutflows = round2(cashInFromBase + netBonusCash);
    const annualSavings = round2(cashAvailableForOutflows - annualOutflow);
    const oneTimeNet = round2((yiSafe?.oneTimeEvents ?? []).reduce((s, e) => s + (e.amount ?? 0), 0));
    const annualSavingsIncludingEvents = round2(annualSavings + oneTimeNet);

    // Apply returns
    const cashRate = yiSafe?.rates?.cashRate ?? plan.assumptions.cashRate;
    const returnRate = yiSafe?.rates?.returnRate ?? plan.assumptions.returnRate;
    cashValue *= 1 + cashRate;
    brokerageValue *= 1 + returnRate;
    retirementTaxDeferredValue *= 1 + returnRate;
    retirementRothValue *= 1 + returnRate;

    // Route contributions to buckets.
    retirementTaxDeferredValue += retirement.employeePreTax + retirement.employer;
    retirementRothValue += retirement.employeeRoth;

    // Non-retirement savings allocation (v1 rule):
    // - Maintain a 6-month cash buffer (based on totalMonthlyOutflow).
    // - Positive savings fill cash up to the target; overflow goes to brokerage.
    // - Negative savings reduce cash (we don't force brokerage sales in v1).
    const cashTarget = round2(6 * totalMonthlyOutflow);
    if (annualSavings >= 0) {
      const cashNeeded = round2(Math.max(0, cashTarget - cashValue));
      const toCash = round2(Math.min(annualSavings, cashNeeded));
      const toBrokerage = round2(annualSavings - toCash);

      cashValue = round2(cashValue + toCash);
      brokerageValue = round2(brokerageValue + toBrokerage);
    } else {
      cashValue = round2(cashValue + annualSavings);
    }

    // Apply explicit one-time events directly to requested buckets (default cash).
    if (yiSafe?.oneTimeEvents && yiSafe.oneTimeEvents.length) {
      for (const e of yiSafe.oneTimeEvents) {
        const bucket = e.fromBucket ?? 'cash';
        if (bucket === 'brokerage') brokerageValue = round2(brokerageValue + e.amount);
        else cashValue = round2(cashValue + e.amount);
      }
      // Spillover: if cash went negative, zero cash and reduce brokerage by the shortfall.
      if (cashValue < 0) {
        const shortfall = -cashValue;
        cashValue = 0;
        brokerageValue = round2(Math.max(0, brokerageValue - shortfall));
      }
    }

    // Clamp tiny negative noise to 0 for stability.
    if (Math.abs(cashValue) < 0.005) cashValue = 0;
    if (Math.abs(brokerageValue) < 0.005) brokerageValue = 0;
    if (Math.abs(retirementTaxDeferredValue) < 0.005) retirementTaxDeferredValue = 0;
    if (Math.abs(retirementRothValue) < 0.005) retirementRothValue = 0;

    const endAssetValue =
      cashValue + brokerageValue + retirementTaxDeferredValue + retirementRothValue;

    if (yiSafe?.homeValue != null) {
      currentHomeValue = yiSafe.homeValue;
    } else if (baselineHomeValue > 0 && plan.balanceSheet.home.appreciationPct) {
      const rate = plan.balanceSheet.home.appreciationPct / 100;
      currentHomeValue = round2(baselineHomeValue * Math.pow(1 + rate, i + 1));
    }

    const endNetWorth = endAssetValue + currentHomeValue - totalDebtBalance;

    rows.push({
      age,
      yearIndex: i,

      grossIncome,
      userGrossIncome: userComp.grossAnnual,
      userBaseIncome: userComp.baseAnnual,
      userBonusIncome: userComp.bonusAnnual,
      partnerGrossIncome: partnerComp?.grossAnnual ?? 0,
      partnerBaseIncome: partnerComp?.baseAnnual ?? 0,
      partnerBonusIncome: partnerComp?.bonusAnnual ?? 0,
      taxableIncome,
      taxableIncomeAfterDeduction,
      standardDeductionUsed,
      federalIncomeTax,
      stateIncomeTax,
      payrollTax,
      payrollTaxSocialSecurity: payroll.socialSecurity,
      payrollTaxMedicare: payroll.medicare,
      payrollTaxAdditionalMedicare: payroll.additionalMedicare,
      taxesPaid,
      afterTaxIncome,

      housingMonthly,
      debtMonthly,
      lifestyleMonthly: lifestyleMonthlyThis,

      totalMonthlyOutflow,
      annualSavings: annualSavingsIncludingEvents,

      employeeRetirementAnnual: retirement.employeeTotal,
      employeeRetirementPreTaxAnnual: retirement.employeePreTax,
      employeeRetirementRothAnnual: retirement.employeeRoth,
      employerMatchAnnual: retirement.employer,
      retirementTotalAnnual: retirement.total,

      endCashValue: cashValue,
      endBrokerageValue: brokerageValue,
      endRetirementTaxDeferredValue: retirementTaxDeferredValue,
      endRetirementRothValue: retirementRothValue,
      endAssetValue,
      homeValue: currentHomeValue,
      endNetWorth,

      totalDebtBalance,
      remainingMortgageBalance,
      totalDebtPrincipalPaid: totalPrincipalPaid,
      totalDebtInterestPaid: totalInterestPaid,
      mortgageInterestPaid,
    });
  }

  return rows;
}
