import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ── Static "screenshot" preview components ─────────────────── */

function EventCardPreview({
  emoji,
  label,
  meta,
  color,
  bg,
  on,
}: {
  emoji: string;
  label: string;
  meta: string;
  color: string;
  bg: string;
  on: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: "10px",
        border: `1.5px solid ${on ? color : "var(--border)"}`,
        background: on ? bg : "var(--surface)",
        padding: "10px 12px",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        marginBottom: "6px",
      }}
    >
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "8px",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--ink)" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "var(--ink-60)", fontFamily: "var(--font-geist-mono)", marginTop: "2px" }}>
          {meta}
        </div>
      </div>
      {/* Toggle */}
      <div
        style={{
          width: "28px",
          height: "16px",
          borderRadius: "8px",
          background: on ? color : "var(--border)",
          position: "relative",
          flexShrink: 0,
          marginTop: "4px",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "var(--paper)",
            top: "2px",
            left: on ? "14px" : "2px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
        />
      </div>
    </div>
  );
}

function ScreenshotLifeEvents() {
  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "16px",
        width: "240px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", fontWeight: 500, marginBottom: "10px" }}>
        Life Events
      </div>
      <EventCardPreview emoji="💍" label="Marriage" meta="Age 31 · +$650/mo" color="var(--gold)" bg="var(--gold-bg)" on={true} />
      <EventCardPreview emoji="🏠" label="Buy a home" meta="Age 35 · $1,299/mo" color="var(--slate)" bg="var(--slate-bg)" on={true} />
      <EventCardPreview emoji="🚀" label="Career leap" meta="Age 40 · +$42,500/yr" color="var(--sage)" bg="var(--sage-bg)" on={true} />
      <EventCardPreview emoji="🌍" label="Sabbatical" meta="Age 45 · $1,500/mo" color="var(--amber)" bg="var(--amber-bg)" on={false} />
    </div>
  );
}

function ScreenshotAllocation() {
  const rows = [
    { priority: 1, color: "var(--gold)",  bg: "var(--gold-bg)",  label: "Emergency Fund",       detail: "6mo cushion",          amount: "$388/mo", bucket: "Emergency",    bucketColor: "var(--gold)" },
    { priority: 2, color: "var(--slate)", bg: "var(--slate-bg)", label: "401(k) to match",       detail: "Full employer match",   amount: "$483/mo", bucket: "Tax-sheltered", bucketColor: "var(--slate)" },
    { priority: 3, color: "var(--sage)",  bg: "var(--sage-bg)",  label: "HSA max",               detail: "Triple tax-advantaged", amount: "$305/mo", bucket: "Growth",       bucketColor: "var(--sage)" },
    { priority: 2, color: "var(--slate)", bg: "var(--slate-bg)", label: "Down payment savings",  detail: "$90K by age 37",        amount: "$1,288/mo", bucket: "Tax-sheltered", bucketColor: "var(--slate)" },
  ];

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "16px",
        width: "300px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "11px", fontFamily: "var(--font-lora)", fontWeight: 500, color: "var(--ink)", marginBottom: "2px" }}>
        Ages 30–31
      </div>
      <div style={{ fontSize: "10px", color: "var(--ink-60)", marginBottom: "12px" }}>$140K income</div>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 8px",
            background: row.priority === 1 ? "var(--gold-bg)" : "var(--surface)",
            borderRadius: "8px",
            border: row.priority === 1 ? "1px solid var(--gold)" : "1px solid transparent",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              background: row.bg,
              color: row.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {row.priority}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--ink)" }}>{row.label}</div>
            <div style={{ fontSize: "10px", color: "var(--ink-60)" }}>{row.detail}</div>
          </div>
          <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: "10px", color: row.priority === 1 ? "var(--gold)" : "var(--ink-60)", fontWeight: 500, whiteSpace: "nowrap" }}>
            {row.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

function MilestoneCardPreview({
  emoji,
  name,
  amount,
  eta,
  progress,
  state,
  why,
}: {
  emoji: string;
  name: string;
  amount: string;
  eta: string;
  progress?: number;
  state: "reached" | "next" | "locked";
  why: string;
}) {
  const isReached = state === "reached";
  const isNext = state === "next";
  return (
    <div
      style={{
        background: isReached ? "linear-gradient(135deg, #FEFDF9 0%, #F8F5EC 100%)" : "var(--surface)",
        border: isReached ? "1.5px solid var(--gold)" : "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          marginBottom: "8px",
          background: isReached ? "linear-gradient(135deg, #FFF8E6 0%, #FDECC0 100%)" : "var(--surface)",
          opacity: state === "locked" ? 0.45 : 1,
          filter: state === "locked" ? "grayscale(1)" : "none",
        }}
      >
        {emoji}
      </div>
      <div style={{ fontFamily: "var(--font-lora)", fontSize: "12px", fontWeight: 500, color: "var(--ink)" }}>{name}</div>
      <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: "11px", color: isNext ? "var(--gold)" : "var(--ink-60)", fontWeight: 500, marginTop: "2px" }}>{amount}</div>
      {isReached ? (
        <div style={{ fontSize: "10px", color: "var(--sage)", fontWeight: 500, marginTop: "4px" }}>✓ {eta}</div>
      ) : (
        <div style={{ fontSize: "10px", color: "var(--ink-60)", marginTop: "4px" }}>{eta}</div>
      )}
      {isNext && progress !== undefined && (
        <div style={{ height: "2px", background: "var(--border)", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--gold)", borderRadius: "2px" }} />
        </div>
      )}
      <div style={{ fontSize: "10px", color: "var(--ink-60)", marginTop: "6px", lineHeight: 1.5, fontStyle: "italic" }}>{why}</div>
    </div>
  );
}

function ScreenshotMilestones() {
  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "16px",
        width: "260px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", fontWeight: 500, marginBottom: "10px" }}>
        Milestones
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <MilestoneCardPreview
          emoji="🌱"
          name="Emergency Fund"
          amount="$30K"
          eta="Age 31 · 1y away"
          progress={72}
          state="next"
          why="Six months covered. No emergency becomes a crisis."
        />
        <MilestoneCardPreview
          emoji="🏆"
          name="First $100K"
          amount="$100K"
          eta="Age 32 · 2y away"
          state="locked"
          why="The hardest one. Compounding takes over."
        />
        <MilestoneCardPreview
          emoji="🏡"
          name="Down Payment"
          amount="$90K"
          eta="Age 37 · 7y away"
          state="locked"
          why="Ready to buy without touching retirement."
        />
        <MilestoneCardPreview
          emoji="💎"
          name="Quarter Million"
          amount="$250K"
          eta="Reached at 39"
          state="reached"
          why="A foundation most people never reach."
        />
      </div>
    </div>
  );
}

/* ── Landing page ────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
          }}
        >
          fore<span style={{ color: "var(--gold)" }}>sight</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ThemeToggle />
          <Link
            href="/plan"
            style={{
              fontSize: "12px",
              color: "var(--ink-60)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Back to my plan →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 32px 0",
          textAlign: "center",
          maxWidth: "860px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--gold-bg)",
            border: "1px solid var(--gold)40",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--gold)",
            marginBottom: "24px",
            letterSpacing: "0.04em",
          }}
        >
          Life-forward financial planning
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 500,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: "20px",
            maxWidth: "640px",
          }}
        >
          Personal finance is about living your life.
          <span style={{ color: "var(--gold)" }}> Retirement is just the math.</span>
        </h1>

        {/* Subtext */}
        <p
          style={{
            fontSize: "15px",
            color: "var(--ink-60)",
            lineHeight: 1.7,
            maxWidth: "480px",
            marginBottom: "12px",
            fontWeight: 300,
          }}
        >
          Most financial apps track accounts. Foresight tracks decisions — marriage,
          a home, a career leap, kids. Toggle a life event and see exactly how it
          reshapes your next 30 years.
        </p>

        {/* 90 seconds promise */}
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink-30)",
            marginBottom: "36px",
            fontWeight: 400,
          }}
        >
          Give us 90 seconds. We&apos;ll show you where you stand.
        </p>

        {/* CTA */}
        <Link
          href="/onboarding/stage1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--gold)",
            color: "white",
            textDecoration: "none",
            borderRadius: "50px",
            padding: "14px 32px",
            fontSize: "14px",
            fontWeight: 500,
            marginBottom: "64px",
            boxShadow: "0 2px 12px rgba(184,146,42,0.30)",
            transition: "opacity 0.15s",
          }}
        >
          Build my plan →
        </Link>

        {/* Screenshots strip */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
            paddingBottom: "64px",
          }}
        >
          {/* Panel 1 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <PreviewLabel>Your life events</PreviewLabel>
            <div style={{ transform: "rotate(-1.5deg)", transformOrigin: "top center" }}>
              <ScreenshotLifeEvents />
            </div>
            <PreviewCaption>Toggle events on and off. See the impact immediately.</PreviewCaption>
          </div>

          {/* Panel 2 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "24px" }}>
            <PreviewLabel>Your allocation plan</PreviewLabel>
            <ScreenshotAllocation />
            <PreviewCaption>Know exactly where every dollar should go, and why.</PreviewCaption>
          </div>

          {/* Panel 3 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <PreviewLabel>Milestones, not balances</PreviewLabel>
            <div style={{ transform: "rotate(1.5deg)", transformOrigin: "top center" }}>
              <ScreenshotMilestones />
            </div>
            <PreviewCaption>Progress toward goals that actually matter to you.</PreviewCaption>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontWeight: 500,
        color: "var(--ink-60)",
      }}
    >
      {children}
    </div>
  );
}

function PreviewCaption({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "11px",
        color: "var(--ink-30)",
        textAlign: "center",
        maxWidth: "220px",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
