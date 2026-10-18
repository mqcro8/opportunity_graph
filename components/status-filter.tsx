"use client";

import { Chip } from "@/components/ui/chip";

const OPTIONS = [
  { value: "", label: "All" },
  { value: "pending_review", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "archived", label: "Archived" },
];

export function StatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Chip>
      ))}
    </div>
  );
}
