export type OneTimeEventInput = {
  /**
   * Signed dollars applied to savings that year.
   * - Negative = spending (reduces assets)
   * - Positive = windfall (increases assets)
   */
  amount: number;
  label: string;
  fromBucket?: "cash" | "brokerage";
};

export type PersonYearInputs = {
  /** Explicit base annual income for this yearIndex. If provided, ignores compounding. */
  baseAnnual?: number;

  /**
   * Explicit annual bonus income for this yearIndex.
   * If provided, overrides baseline bonus behavior for this year.
   */
  bonusAnnual?: number;

  /** Override retirement contribution configuration for this yearIndex. */
  retirement?: {
    hasPlan?: boolean;
    employeePreTaxContributionPct?: number; // 0..100
    employeeRothContributionPct?: number; // 0..100
    hasEmployerMatch?: boolean;
    employerMatchPct?: number; // 0..100
    employerMatchUpToPct?: number; // 0..100
  };

  /** Override pre-tax payroll deductions (monthly) for this yearIndex. */
  preTaxDeductionsMonthly?: number;

  /**
   * Observed monthly take-home from regular paychecks (base pay only, excludes bonus/equity).
   * Cashflow anchor: when set, cashInFromBase = value * 12. Tax liability still computed from gross.
   */
  observedBaseNetPayMonthly?: number;
};

export type YearInputs = {
  yearIndex: number;

  user?: PersonYearInputs;
  partner?: PersonYearInputs;

  lifestyleMonthly?: number;
  housingMonthly?: number;

  /**
   * Debts that begin at this yearIndex. These are generic balance-sheet
   * liabilities (e.g. mortgages, auto loans, personal loans) that are added
   * to the active debt list from this year onward.
   */
  addDebts?: {
    id: string;
    label: string;
    type: string;
    balance: number;
    aprPct: number;
    payoffYearMonth: string;
    monthlyPayment: number;
    monthlyPaymentIsOverride?: boolean;
  }[];

  /**
   * Total real-estate / non-financial property value for this year. When
   * provided, this value is used for net-worth calculations for this year
   * (and, conceptually, can be updated over time by later years).
   */
  homeValue?: number;

  /**
   * Annual property tax amount for this year. Used to compute the itemized
   * deduction (subject to the $10k SALT cap). Set from home purchase data.
   */
  propertyTaxAnnual?: number;

  /** Overrides for assumptions applied in this yearIndex. */
  rates?: {
    returnRate?: number; // 0..1
    inflationRate?: number; // 0..1
    cashRate?: number; // 0..1
    stateTaxRate?: number; // 0..1
  };

  oneTimeEvents?: OneTimeEventInput[];
};

