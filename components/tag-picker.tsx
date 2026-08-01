"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TagNode {
  id: string;
  name: string;
  slug: string;
  type: string;
}

const TYPE_LABELS: Record<string, string> = {
  skill: "Skills",
  interest: "Interests",
  field: "Fields",
  university: "Universities",
  category: "Categories",
  language: "Languages",
  region: "Regions",
  age_group: "Age groups",
  audience: "Audience",
};

const CREATE_TYPES = [
  "interest",
  "skill",
  "field",
  "region",
  "language",
  "audience",
];

const TYPE_ORDER = [
  "field",
  "skill",
  "interest",
  "category",
  "region",
  "language",
  "audience",
  "university",
  "age_group",
];

export function TagPicker({
  nodes,
  selected,
  onChange,
}: {
  nodes: TagNode[];
  selected: string[];
  onChange: (slugs: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(CREATE_TYPES[0]);
  const [extra, setExtra] = useState<TagNode[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const all = useMemo(() => {
    const merged = [...nodes, ...extra];
    const seen = new Set<string>();
    return merged.filter((n) => (seen.has(n.slug) ? false : (seen.add(n.slug), true)));
  }, [nodes, extra]);

  const byType = useMemo(() => {
    const grouped: Record<string, TagNode[]> = {};
    for (const node of all) {
      (grouped[node.type] ??= []).push(node);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.name.localeCompare(b.name));
    }
    return grouped;
  }, [all]);

  const q = query.trim().toLowerCase();
  const types = useMemo(() => {
    const list = Object.keys(byType).sort(
      (a, b) =>
        (TYPE_ORDER.indexOf(a) === -1 ? 99 : TYPE_ORDER.indexOf(a)) -
        (TYPE_ORDER.indexOf(b) === -1 ? 99 : TYPE_ORDER.indexOf(b))
    );
    if (!q) return list;
    return list.filter((t) =>
      byType[t].some((n) => n.name.toLowerCase().includes(q))
    );
  }, [byType, q]);

  function toggle(slug: string) {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug]
    );
  }

  async function createTag() {
    const name = newName.trim();
    if (name.length < 2) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/graph-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: newType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create tag");
        return;
      }
      const node = data.node as TagNode;
      setExtra((prev) => [...prev, node]);
      onChange([...selected, node.slug]);
      setNewName("");
    } catch {
      setError("Failed to create tag");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          className={inputClass}
          placeholder="Search tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {all
              .filter((n) => selected.includes(n.slug))
              .map((n) => (
                <button
                  key={n.slug}
                  type="button"
                  onClick={() => toggle(n.slug)}
                  className="cursor-pointer"
                  title="Click to remove"
                >
                  <Badge variant="interest">{n.name} ✕</Badge>
                </button>
              ))}
          </div>
        )}
      </div>

      {types.map((type) => (
        <div key={type}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {TYPE_LABELS[type] ?? type}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {byType[type].map((node) => {
              const isSelected = selected.includes(node.slug);
              const match = !q || node.name.toLowerCase().includes(q);
              if (!match) return null;
              return (
                <button
                  key={node.slug}
                  type="button"
                  onClick={() => toggle(node.slug)}
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
            {byType[type].length === 0 && (
              <p className="text-xs text-muted-foreground">None.</p>
            )}
          </div>
        </div>
      ))}

      <div className="border-t border-border pt-4">
        <p className="mb-1.5 text-sm font-medium">Create a new tag</p>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Tag name, e.g. Math"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createTag();
              }
            }}
          />
          <select
            className={cn(inputClass, "w-36")}
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            {CREATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={creating || newName.trim().length < 2}
            onClick={createTag}
          >
            {creating ? "Adding..." : "Add"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
