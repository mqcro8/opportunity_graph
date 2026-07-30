"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveButton({ opportunityId }: { opportunityId: string }) {
  async function handleSave() {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_id: opportunityId, status: "saved" }),
    });
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      className={cn(buttonVariants({ variant: "outline" }))}
    >
      Save
    </button>
  );
}
