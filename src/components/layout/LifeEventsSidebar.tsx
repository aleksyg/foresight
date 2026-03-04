"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePlanStore } from "@/store/planStore";
import { simulatePlan } from "@/engine/simulatePlan";
import { buildOverridesFromLifeEvent } from "@/scenario/lifeEvents/toTargetedOverrides";
import { buildScenarioYearInputsFromOverrides, extendYearInputsToAge } from "@/rulespec/index";
import { buildToggleResponse } from "@/lib/toggleResponse";
import type { LifeEvent } from "@/scenario/lifeEvents/types";

type EventColor = "gold" | "rose" | "slate" | "sage" | "amber" | "plum" | "teal";

const COLOR_MAP: Record<EventColor, { fg: string; bg: string }> = {
  gold:  { fg: "var(--gold)",  bg: "var(--gold-bg)"  },
  rose:  { fg: "var(--rose)",  bg: "var(--rose-bg)"  },
  slate: { fg: "var(--slate)", bg: "var(--slate-bg)" },
  sage:  { fg: "var(--sage)",  bg: "var(--sage-bg)"  },
  amber: { fg: "var(--amber)", bg: "var(--amber-bg)" },
  plum:  { fg: "var(--plum)",  bg: "var(--plum-bg)"  },
  teal:  { fg: "var(--teal)",  bg: "var(--teal-bg)"  },
};

const EVENT_DISPLAY: Record<string, { emoji: string; color: EventColor; meta: string }> = {
  marriage:    { emoji: "💍", color: "gold",  meta: "Age 31 · +$650/mo"    },
  first_child: { emoji: "👶", color: "rose",  meta: "Age 33 · $2,500/mo"   },
  home:        { emoji: "🏠", color: "slate", meta: "Age 35 · $1,299/mo"   },
  career:      { emoji: "🚀", color: "sage",  meta: "Age 40 · +$42,500/yr" },
  sabbatical:  { emoji: "🌍", color: "amber", meta: "Age 45 · $1,500/mo"   },
  college:     { emoji: "🎓", color: "plum",  meta: "Age 47 · $800/mo"     },
};

const SIM_MAX_AGE = 85;

function Toggle({ on, color }: { on: boolean; color: EventColor }) {
  const { fg } = COLOR_MAP[color];
  return (
    <div
      style={{
        width: "28px",
        height: "16px",
        borderRadius: "8px",
        background: on ? fg : "var(--border)",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s",
        marginTop: "4px",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "white",
          top: "2px",
          left: "2px",
          transform: on ? "translateX(12px)" : "translateX(0)",
          transition: "transform 0.2s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}

function runScenario(plan: Parameters<typeof simulatePlan>[0], events: LifeEvent[]) {
  const enabledEvents = events.filter((e) => e.enabled);
  const overrides = enabledEvents.flatMap((e) =>
    buildOverridesFromLifeEvent(e, { minAge: plan.startAge, maxAge: SIM_MAX_AGE })
  );
  const yearInputs = extendYearInputsToAge(
    buildScenarioYearInputsFromOverrides(plan, overrides),
    plan,
    SIM_MAX_AGE,
  );
  return simulatePlan(plan, { yearInputs, minEndAge: SIM_MAX_AGE });
}

export function LifeEventsSidebar() {
  const { plan, lifeEvents, lastToggleResponse, toggleLifeEvent, setLastToggleResponse } =
    usePlanStore();

  // Auto-dismiss response banner after 4 seconds
  const [visibleResponse, setVisibleResponse] = useState("");
  useEffect(() => {
    if (!lastToggleResponse) return;
    setVisibleResponse(lastToggleResponse);
    const t = setTimeout(() => setVisibleResponse(""), 4000);
    return () => clearTimeout(t);
  }, [lastToggleResponse]);

  const handleToggle = (id: string) => {
    toggleLifeEvent(id);

    if (!plan) return;

    // Compute response after toggle (state hasn't updated yet, so flip manually)
    const updatedEvents = lifeEvents.map((e) =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    );
    const nowEnabled = updatedEvents.find((e) => e.id === id)?.enabled ?? false;
    const evt = lifeEvents.find((e) => e.id === id);
    if (!evt) return;

    const baselineRows = simulatePlan(plan, { minEndAge: SIM_MAX_AGE });
    const scenarioRows = runScenario(plan, updatedEvents);
    const msg = buildToggleResponse(evt.title, nowEnabled, plan, baselineRows, scenarioRows);
    setLastToggleResponse(msg);
  };

  return (
    <aside
      style={{
        width: "280px",
        minWidth: "280px",
        background: "white",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100vh",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            textDecoration: "none",
            display: "block",
          }}
        >
          fore<span style={{ color: "var(--gold)" }}>sight</span>
        </Link>
        <div
          style={{
            fontSize: "10px",
            color: "var(--ink-60)",
            marginTop: "2px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 500,
          }}
        >
          Life-forward planning
        </div>
      </div>

      {/* Section label */}
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--ink-30)",
          fontWeight: 500,
          padding: "14px 20px 8px",
          flexShrink: 0,
        }}
      >
        Life Events
      </div>

      {/* Events list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 12px 12px",
        }}
      >
        {lifeEvents.map((evt) => {
          const display = EVENT_DISPLAY[evt.id] ?? {
            emoji: "✦",
            color: "gold" as EventColor,
            meta: "",
          };
          const { fg, bg } = COLOR_MAP[display.color];

          return (
            <div
              key={evt.id}
              onClick={() => handleToggle(evt.id)}
              style={{
                borderRadius: "10px",
                border: `1.5px solid ${evt.enabled ? fg : "var(--border)"}`,
                marginBottom: "6px",
                cursor: "pointer",
                transition: "all 0.18s",
                overflow: "hidden",
                background: evt.enabled ? bg : "white",
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                    marginTop: "1px",
                    background: bg,
                  }}
                >
                  {display.emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      color: "var(--ink)",
                      lineHeight: 1.3,
                    }}
                  >
                    {evt.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-60)",
                      marginTop: "2px",
                      fontFamily: "var(--font-geist-mono)",
                    }}
                  >
                    {display.meta}
                  </div>
                </div>

                {/* Toggle */}
                <Toggle on={evt.enabled} color={display.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle response banner — auto-dismisses after 4s */}
      {visibleResponse && (
        <div
          style={{
            padding: "10px 16px",
            background: "var(--gold-bg)",
            borderTop: "1px solid var(--gold)40",
            fontSize: "11px",
            color: "var(--gold)",
            fontWeight: 500,
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          {visibleResponse}
        </div>
      )}

      {/* Add event */}
      <div style={{ padding: "0 12px 12px", flexShrink: 0 }}>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "9px 12px",
            border: "1.5px dashed var(--border)",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--ink-60)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--gold)";
            el.style.color = "var(--gold)";
            el.style.background = "var(--gold-bg)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--border)";
            el.style.color = "var(--ink-60)";
            el.style.background = "transparent";
          }}
        >
          + Add life event
        </button>
      </div>
    </aside>
  );
}
