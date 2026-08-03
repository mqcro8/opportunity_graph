"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SOURCE_TIERS } from "@/lib/constants";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function SourceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tier = searchParams.get("tier") ?? "";
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function commitSearch() {
    update("q", draft.trim());
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs transition-colors",
      active
        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        : "border-border text-muted-foreground hover:border-foreground/30"
    );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <span className="mb-1 block text-sm font-medium">Tier</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => update("tier", "")}
            className={chip(tier === "")}
          >
            All
          </button>
          {SOURCE_TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update("tier", String(t))}
              className={chip(tier === String(t))}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Search</span>
        <input
          className={cn(inputClass, "w-64")}
          placeholder="Search sources..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitSearch();
            }
          }}
          onBlur={commitSearch}
        />
      </label>
    </div>
  );
}
