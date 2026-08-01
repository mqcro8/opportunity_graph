"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  OpportunityFilters,
  type FilterNode,
} from "@/components/opportunity-filters";
import { StatusFilter } from "@/components/status-filter";
import { Pagination } from "@/components/pagination";
import { PAGE_SIZE } from "@/lib/constants";

interface ListItem {
  id: string;
  slug: string;
  title: string;
  organization: string;
  opportunity_type: string;
  status: string;
  created_at: string;
}

export function OpportunitiesList({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; tag?: string; page?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();

  const status = searchParams.status ?? "";
  const type = searchParams.type ?? "";
  const tag = searchParams.tag ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nodes, setNodes] = useState<FilterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/graph-nodes");
      if (!res.ok) return;
      const body = await res.json();
      if (!cancelled) setNodes(body.nodes ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (tag) params.set("tag", tag);
    params.set("page", String(page));

    const res = await fetch(`/api/admin/opportunities?${params.toString()}`);

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to load opportunities.");
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const body = await res.json();
    setItems(body.opportunities ?? []);
    setTotal(body.total ?? 0);
    setLoading(false);
  }, [status, type, tag, page, router]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters(nextStatus: string, nextType: string, nextTag: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (nextType) params.set("type", nextType);
    if (nextTag) params.set("tag", nextTag);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (tag) params.set("tag", tag);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} opportunit{total === 1 ? "y" : "ies"}
        </p>
        <Link
          href="/admin/opportunities/new"
          className={buttonVariants({ size: "sm" })}
        >
          Add opportunity
        </Link>
      </div>
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <StatusFilter
        value={status}
        onChange={(s) => applyFilters(s, type, tag)}
      />
      <OpportunityFilters
        nodes={nodes}
        type={type}
        tag={tag}
        onTypeChange={(t) => applyFilters(status, t, tag)}
        onTagChange={(t) => applyFilters(status, type, t)}
      />
      <div className="mt-4 rounded-lg border border-border">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No opportunities yet.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-border p-4 last:border-b-0"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  {item.organization}
                  <Badge variant="muted">
                    {item.opportunity_type.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={
                      item.status === "verified"
                        ? "interest"
                        : item.status === "archived"
                          ? "deadline"
                          : "muted"
                    }
                  >
                    {item.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <Link href={`/admin/opportunities/${item.id}/edit`}>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              </Link>
            </div>
          ))
        )}
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        buildHref={buildHref}
      />
    </div>
  );
}
