"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlanState } from "@/engine/types/planState";
import type { LifeEvent } from "@/scenario/lifeEvents/types";
import { buildDefaultLifeEvents } from "@/lib/defaultLifeEvents";

interface PlanStore {
  plan: PlanState | null;
  activeTab: "dashboard" | "allocation" | "milestones";
  selectedAge: number;
  lifeEvents: LifeEvent[];
  lastToggleResponse: string;

  setPlan: (plan: PlanState) => void;
  setActiveTab: (tab: "dashboard" | "allocation" | "milestones") => void;
  setSelectedAge: (age: number) => void;
  toggleLifeEvent: (id: string) => void;
  setLastToggleResponse: (msg: string) => void;
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      plan: null,
      activeTab: "dashboard",
      selectedAge: 30,
      lifeEvents: buildDefaultLifeEvents(),
      lastToggleResponse: "",

      setPlan: (plan) =>
        set({
          plan,
          selectedAge: plan.startAge,
          lifeEvents: buildDefaultLifeEvents(plan.startAge),
        }),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedAge: (age) => set({ selectedAge: age }),

      toggleLifeEvent: (id) =>
        set((state) => ({
          lifeEvents: state.lifeEvents.map((e) =>
            e.id === id ? { ...e, enabled: !e.enabled } : e
          ),
        })),

      setLastToggleResponse: (msg) => set({ lastToggleResponse: msg }),
    }),
    { name: "foresight-plan" }
  )
);
