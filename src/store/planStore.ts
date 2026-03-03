"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlanState } from "@/engine/types/planState";

interface PlanStore {
  plan: PlanState | null;
  activeTab: "dashboard" | "allocation" | "milestones";
  selectedAge: number;

  setPlan: (plan: PlanState) => void;
  setActiveTab: (tab: "dashboard" | "allocation" | "milestones") => void;
  setSelectedAge: (age: number) => void;
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set) => ({
      plan: null,
      activeTab: "dashboard",
      selectedAge: 30,

      setPlan: (plan) => set({ plan, selectedAge: plan.startAge }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedAge: (age) => set({ selectedAge: age }),
    }),
    { name: "foresight-plan" }
  )
);
