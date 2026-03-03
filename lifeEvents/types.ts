export type IncomeAppliesTo = "user" | "partner" | "both";

export type IncomeSetRangeMutation = {
  mutationId?: string;
  kind: "income_set_range";
  startAge: number;
  endAge: number | null; // null means through retirement
  baseAnnual: number | null; // null means unchanged
  bonusAnnual: number | null; // null means unchanged
  appliesTo?: IncomeAppliesTo; // default "user" if missing
};

export type IncomeGrowthRangeMutation = {
  mutationId?: string;
  kind: "income_growth_range";
  startAge: number;
  endAge: number | null;
  baseGrowthPct: number | null;
  bonusGrowthPct: number | null;
  appliesTo?: IncomeAppliesTo;
};

export type IncomeMilestoneMutation = {
  mutationId?: string;
  kind: "income_milestone";
  appliesTo?: IncomeAppliesTo;
  age: number;
  baseAnnual: number | null;
  bonusAnnual: number | null;
  growthPct: number | null;
};

export type OneTimeBonusMutation = {
  mutationId?: string;
  kind: "income_one_time_bonus";
  appliesTo?: IncomeAppliesTo;
  age: number;
  amount: number;
};

export type IncomeCapMutation = {
  mutationId?: string;
  kind: "income_cap_range";
  appliesTo?: IncomeAppliesTo;
  startAge: number;
  endAge: number | null;
  baseCapAnnual: number | null;
  bonusCapAnnual: number | null;
};

export type IncomeGrowthStepMutation = {
  mutationId?: string;
  kind: "income_growth_step";
  appliesTo?: IncomeAppliesTo;
  age: number;
  growthPct: number;
};

export type ExpenseOneTimeMutation = {
  mutationId?: string;
  kind: "expense_one_time";
  age: number;
  amountAnnual: number; // can be negative
};

export type ExpenseRecurringMutation = {
  mutationId?: string;
  kind: "expense_recurring";
  startAge: number;
  endAge: number | null; // null = onward
  amountAnnual: number; // can be negative
};

export type HomePurchaseMutation = {
  mutationId?: string;
  kind: "home_purchase";
  /** Age when the purchase occurs. */
  age: number;
  /** Purchase price of the property. */
  purchasePrice: number;
  /** Down payment as a percent of purchase price (0–100). */
  downPct: number;
  /** Down payment dollar amount; kept in sync with price and pct. */
  downAmount: number;
  /** Mortgage APR percentage, e.g. 6.5 for 6.5%. */
  mortgageRatePct: number;
  /** Loan term in years. */
  loanTermYears: number;
  /**
   * Monthly taxes + insurance (non-debt housing cost). Defaults to ~2% of
   * purchase price annually / 12, but user can override.
   */
  taxesInsuranceMonthly: number;
  /** Annual appreciation percentage, e.g. 1.5 for 1.5%. */
  appreciationPct: number;
  /**
   * If true, replaces existing housing from purchase age onward (baseline
   * housing is turned off and only this property's T&I are used). If false,
   * this home's T&I are layered on top of existing housing.
   */
  replaceExistingHousing: boolean;
  /**
   * Closing costs as a percentage of purchase price (e.g. 2.5 for 2.5%).
   * Applied as an upfront cash deduction at the purchase year. Defaults to 2.5%.
   */
  closingCostsPct?: number;
};

export type Mutation =
  | IncomeSetRangeMutation
  | IncomeGrowthRangeMutation
  | IncomeMilestoneMutation
  | OneTimeBonusMutation
  | IncomeCapMutation
  | IncomeGrowthStepMutation
  | ExpenseOneTimeMutation
  | ExpenseRecurringMutation
  | HomePurchaseMutation;

export type LifeEventTemplateKey = "grad_school";

/** Icon key for life event card and chart marker. One of LIFE_EVENT_ICON_KEYS. */
export type LifeEventIconKey =
  | "home"
  | "raise"
  | "child"
  | "partner"
  | "graduation"
  | "investment"
  | "expense"
  | "savings"
  | "retirement"
  | "one-time"
  | "income"
  | "custom";

export type LifeEvent = {
  id: string;
  title: string;
  enabled: boolean;
  summary: string[];
  mutations: Mutation[];
  templateKey?: LifeEventTemplateKey;
  /** Optional icon for card and chart. Defaults to "custom" if unset. */
  iconKey?: LifeEventIconKey;
};
