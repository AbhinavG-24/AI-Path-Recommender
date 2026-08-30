import React, { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
  glow = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx("rounded-2xl p-5 transition-all", className)}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: glow ? "var(--shadow-glow)" : "var(--shadow-card)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({
  children,
  tone = "default",
  onRemove,
}: {
  children: ReactNode;
  tone?: "default" | "mastered" | "gap" | "missing" | "path";
  onRemove?: () => void;
}) {
  const styles: Record<string, React.CSSProperties> = {
    default:  { background: "var(--color-surface-2)", color: "var(--color-muted)" },
    mastered: { background: "rgba(0,255,102,0.15)", color: "#00FF66", border: "1px solid rgba(0,255,102,0.3)" },
    gap:      { background: "rgba(0,229,255,0.15)", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.3)" },
    missing:  { background: "rgba(255,107,53,0.15)", color: "#FF6B35", border: "1px solid rgba(255,107,53,0.3)" },
    path:     { background: "rgba(255,0,85,0.15)",  color: "#FF0055", border: "1px solid rgba(255,0,85,0.3)" },
  };
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono"
      style={styles[tone]}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2";

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(135deg, #FF0055 0%, #FF3366 100%)",
      color: "white",
      boxShadow: "0 4px 16px rgba(255,0,85,0.4)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-muted)",
    },
    outline: {
      background: "transparent",
      border: "1px solid var(--color-border)",
      color: "var(--color-text)",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(base, "hover:brightness-110 active:scale-95", className)}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  );
}

// ─── ProgressBar (animated on mount) ─────────────────────────────────────────
export function ProgressBar({
  value,
  tone = "path",
  animate = false,
  label,
}: {
  value: number;
  tone?: "path" | "mastered" | "gap";
  animate?: boolean;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));

  const colors: Record<string, string> = {
    path:     "#FF0055",
    mastered: "#00FF66",
    gap:      "#00E5FF",
  };

  const glows: Record<string, string> = {
    path:     "0 0 8px rgba(255,0,85,0.5)",
    mastered: "0 0 8px rgba(0,255,102,0.5)",
    gap:      "0 0 8px rgba(0,229,255,0.5)",
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-muted)" }}>
          <span>{label}</span>
          <span className="font-mono">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: "var(--color-surface-2)" }}
      >
        <div
          className={clsx("h-full rounded-full", animate && "skill-bar-fill")}
          style={{
            width: `${pct}%`,
            background: colors[tone],
            boxShadow: glows[tone],
            animationDuration: `${0.4 + pct / 200}s`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Apple Fitness Triple Ring ────────────────────────────────────────────────
export function FitnessRings({
  outer,
  middle,
  inner,
  size = 160,
}: {
  outer: number;   // red  — course completion
  middle: number;  // green — streak / study time
  inner: number;   // cyan  — quizzes
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const gap = 10;
  const strokeW = 12;

  const rings = [
    { r: cx - strokeW / 2 - 2,               pct: outer,  color: "#FF0055", label: "Move",     glow: "rgba(255,0,85,0.6)"   },
    { r: cx - strokeW / 2 - gap - strokeW - 2, pct: middle, color: "#00FF66", label: "Exercise", glow: "rgba(0,255,102,0.6)" },
    { r: cx - strokeW / 2 - gap * 2 - strokeW * 2 - 2, pct: inner, color: "#00E5FF", label: "Stand", glow: "rgba(0,229,255,0.6)" },
  ];

  const outerRef   = useRef<SVGCircleElement>(null);
  const middleRef  = useRef<SVGCircleElement>(null);
  const innerRef   = useRef<SVGCircleElement>(null);
  const refs = [outerRef, middleRef, innerRef];

  useEffect(() => {
    rings.forEach((ring, i) => {
      const el = refs[i].current;
      if (!el) return;
      const circumference = 2 * Math.PI * ring.r;
      const offset = circumference - (ring.pct / 100) * circumference;
      el.style.strokeDasharray = String(circumference);
      el.style.strokeDashoffset = String(circumference);
      el.style.transition = `stroke-dashoffset ${1.2 + i * 0.2}s cubic-bezier(0.34,1.2,0.64,1)`;
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = String(offset);
      });
    });
  }, [outer, middle, inner]);

  return (
    <svg width={size} height={size} className="-rotate-90">
      {rings.map((ring, i) => {
        const circumference = 2 * Math.PI * ring.r;
        return (
          <g key={i}>
            {/* Track */}
            <circle
              cx={cx} cy={cy} r={ring.r}
              stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} fill="none"
            />
            {/* Progress */}
            <circle
              ref={refs[i]}
              cx={cx} cy={cy} r={ring.r}
              stroke={ring.color} strokeWidth={strokeW} fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${ring.glow})` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── ScoreRing (single animated ring — used in Roadmap) ──────────────────────
export function ScoreRing({ value, size = 72 }: { value: number; size?: number }) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(circumference);
    el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.34,1.2,0.64,1)";
    requestAnimationFrame(() => {
      el.style.strokeDashoffset = String(offset);
    });
  }, [value, circumference, offset]);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="rgba(255,255,255,0.06)" strokeWidth={7} fill="none"
      />
      <circle
        ref={circleRef}
        cx={size / 2} cy={size / 2} r={radius}
        stroke="#FF0055" strokeWidth={7} fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 6px rgba(255,0,85,0.6))" }}
      />
      <text
        x={size / 2} y={size / 2}
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22}
        fontFamily="var(--font-mono)"
        fill="var(--color-text)"
        fontWeight="700"
      >
        {Math.round(value)}
      </text>
    </svg>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="w-7 h-7 rounded-full animate-spin border-2 border-t-transparent"
        style={{ borderColor: "#FF0055", borderTopColor: "transparent", boxShadow: "0 0 12px rgba(255,0,85,0.4)" }}
      />
    </div>
  );
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{
        border: "1px solid rgba(255,107,53,0.4)",
        background: "rgba(255,107,53,0.12)",
        color: "#FF6B35",
      }}
    >
      {message}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-7">
      <h1
        className="text-2xl font-display font-bold tracking-tight"
        style={{ color: "var(--color-text)" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
