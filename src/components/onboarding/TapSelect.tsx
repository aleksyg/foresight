"use client";

interface TapSelectOption<T extends string> {
  value: T;
  label: string;
  sublabel?: string;
  emoji?: string;
}

interface TapSelectProps<T extends string> {
  options: TapSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function TapSelect<T extends string>({
  options,
  value,
  onChange,
}: TapSelectProps<T>) {
  return (
    <div className="flex gap-4 w-full">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 rounded-2xl border-2 p-6 text-left transition-all"
            style={{
              borderColor: selected ? "var(--gold)" : "var(--border)",
              background: selected ? "var(--gold-bg)" : "var(--paper)",
            }}
          >
            {opt.emoji && (
              <div className="text-2xl mb-2">{opt.emoji}</div>
            )}
            <div
              className="type-title"
              style={{ color: selected ? "var(--gold)" : "var(--ink)" }}
            >
              {opt.label}
            </div>
            {opt.sublabel && (
              <div
                className="type-body-small mt-1"
                style={{ color: "var(--ink-60)" }}
              >
                {opt.sublabel}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
