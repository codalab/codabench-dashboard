import clsx from "clsx";

const TONES = {
  neutral: "bg-surface-2 text-ink-secondary",
  accent: "bg-accent-soft text-accent",
} as const;

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-5",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
