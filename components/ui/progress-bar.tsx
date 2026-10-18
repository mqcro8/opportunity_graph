import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  className?: string;
}

export function ProgressBar({ label, value, max, className }: ProgressBarProps) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-xs text-muted-foreground">
        {value}/{max}
      </span>
    </div>
  );
}
