import { create } from "zustand";

export type HousingStatus = "rent" | "own";

export interface OnboardingInputs {
  firstName: string;
  age: number;
  householdIncome: number;
  totalSavings: number;
  housing: HousingStatus;
  retirementAge: number;
}

interface OnboardingStore {
  step: number;
  inputs: Partial<OnboardingInputs>;
  setStep: (step: number) => void;
  setField: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
  isComplete: () => boolean;
}

const DEFAULTS: OnboardingInputs = {
  firstName: "",
  age: 30,
  householdIncome: 120000,
  totalSavings: 50000,
  housing: "rent",
  retirementAge: 62,
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  step: 0,
  inputs: { ...DEFAULTS },

  setStep: (step) => set({ step }),

  setField: (key, value) =>
    set((s) => ({ inputs: { ...s.inputs, [key]: value } })),

  isComplete: () => {
    const { inputs } = get();
    return Boolean(
      inputs.firstName?.trim() &&
      inputs.age &&
      inputs.householdIncome !== undefined &&
      inputs.totalSavings !== undefined &&
      inputs.housing &&
      inputs.retirementAge
    );
  },
}));
