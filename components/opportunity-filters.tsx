"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OPPORTUNITY_TYPES } from "@/lib/constants";
import { inputClass } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TYPE_LABELS, TYPE_ORDER } from "@/components/tag-picker";

export interface FilterNode {
  id: string;
  name: string;
  slug: string;
  type: string;
}

function typeIndex(type: string): number {
  const i = TYPE_ORDER.indexOf(type);
  return i === -1 ? 99 : i;
}

export function OpportunityFilters({
  nodes,
  type,
  tag,
  onTypeChange,
  onTagChange,
}: {
  nodes: FilterNode[];
  type: string;
  tag: string;
  onTypeChange: (type: string) => void;
  onTagChange: (tag: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const grouped = useMemo(() => {
    const byType: Record<string, FilterNode[]> = {};
    for (const node of nodes) {
      (byType[node.type] ??= []).push(node);
    }
    for (const key of Object.keys(byType)) {
      byType[key].sort((a, b) => a.name.localeCompare(b.name));
    }
    return byType;
  }, [nodes]);

  const q = query.trim().toLowerCase();
  const visibleTypes = useMemo(() => {
    return Object.keys(grouped)
      .filter((t) =>
        !q
          ? grouped[t].length > 0
          : grouped[t].some((n) => n.name.toLowerCase().includes(q))
      )
      .sort((a, b) => typeIndex(a) - typeIndex(b));
  }, [grouped, q]);

  const selectedName = nodes.find((n) => n.slug === tag)?.name ?? tag;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Type</span>
        <select
          className={cn(inputClass, "w-44")}
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <option value="">All types</option>
          {OPPORTUNITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <div ref={rootRef} className="relative w-full max-w-xs">
        <span className="mb-1 block text-sm font-medium">Tag</span>
        {tag && (
          <div className="mb-1.5">
            <button
              type="button"
              onClick={() => onTagChange("")}
              className="cursor-pointer"
              title="Clear tag filter"
            >
              <Badge variant="interest">{selectedName} ✕</Badge>
            </button>
          </div>
        )}
        <input
          className={inputClass}
          placeholder="Filter by tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {open && visibleTypes.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-background p-3 shadow-lg">
            {visibleTypes.map((typeName) => (
              <div key={typeName} className="mb-3 last:mb-0">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {TYPE_LABELS[typeName] ?? typeName}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {grouped[typeName]
                    .filter((n) => !q || n.name.toLowerCase().includes(q))
                    .map((node) => {
                      const isSelected = node.slug === tag;
                      return (
                        <button
                          key={node.slug}
                          type="button"
                          onClick={() => onTagChange(isSelected ? "" : node.slug)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "border-border text-muted-foreground hover:border-foreground/30"
                          )}
                        >
                          {node.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
