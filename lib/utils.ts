import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never run";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Single deterministic path from a raw deadline to display label + urgency.
// Computed once, not re-derived by parsing the formatted string back out.
export function getDeadlineInfo(dateStr: string | null): { label: string; urgent: boolean } {
  if (!dateStr) return { label: "No deadline", urgent: false };

  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

  if (days < 0) return { label: "Closed", urgent: false };
  if (days === 0) return { label: "Closes today", urgent: true };
  if (days <= 14) return { label: `${days} days left`, urgent: true };
  if (days <= 30) return { label: `${days} days left`, urgent: false };

  const months = Math.round(days / 30);
  return { label: `${months} month${months > 1 ? "s" : ""} left`, urgent: false };
}
