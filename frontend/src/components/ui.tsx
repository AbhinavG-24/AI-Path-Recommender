import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-(--color-border) bg-(--color-surface) p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "mastered" | "gap" | "missing" | "path";
}) {
  const tones: Record<string, string> = {
    default: "bg-(--color-surface-2) text-(--color-muted)",
    mastered: "bg-(--color-mastered)/15 text-(--color-mastered)",
    gap: "bg-(--color-gap)/15 text-(--color-gap)",
    missing: "bg-(--color-missing)/15 text-(--color-missing)",
    path: "bg-(--color-path-soft) text-(--color-path)",
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-mono", tones[tone])}>
      {children}
    </span>
  );
}

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
  const variants: Record<string, string> = {
    primary: "bg-(--color-path) text-white hover:opacity-90",
    ghost: "text-(--color-muted) hover:text-(--color-text) hover:bg-(--color-surface-2)",
    outline:
      "border border-(--color-border) text-(--color-text) hover:border-(--color-path)",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--color-path)",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, tone = "path" }: { value: number; tone?: "path" | "mastered" | "gap" }) {
  const colors: Record<string, string> = {
    path: "bg-(--color-path)",
    mastered: "bg-(--color-mastered)",
    gap: "bg-(--color-gap)",
  };
  return (
    <div className="w-full h-1.5 rounded-full bg-(--color-surface-2) overflow-hidden">
      <div
        className={clsx("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ScoreRing({ value, size = 72 }: { value: number; size?: number }) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--color-surface-2)"
        strokeWidth={6}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--color-path)"
        strokeWidth={6}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2}
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-mono fill-(--color-text)"
        fontSize={size * 0.24}
      >
        {Math.round(value)}
      </text>
    </svg>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-(--color-path) border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-(--color-missing)/40 bg-(--color-missing)/10 text-(--color-missing) px-4 py-3 text-sm">
      {message}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-(--color-muted) text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
