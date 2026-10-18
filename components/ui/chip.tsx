import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "focus-ring inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-accent bg-accent-muted text-accent-muted-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}
