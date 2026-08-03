"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  OpportunityFilters,
  type FilterNode,
} from "@/components/opportunity-filters";

export function DashboardFilters({
  nodes,
  type,
  tag,
}: {
  nodes: FilterNode[];
  type: string;
  tag: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function applyFilters(nextType: string, nextTag: string) {
    const params = new URLSearchParams();
    if (nextType) params.set("type", nextType);
    if (nextTag) params.set("tag", nextTag);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <OpportunityFilters
      nodes={nodes}
      type={type}
      tag={tag}
      onTypeChange={(t) => applyFilters(t, tag)}
      onTagChange={(t) => applyFilters(type, t)}
    />
  );
}
