"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  OpportunityFilters,
  type FilterNode,
} from "@/components/opportunity-filters";
import { StatusFilter } from "@/components/status-filter";
import { Pagination } from "@/components/pagination";
import { PAGE_SIZE } from "@/lib/constants";

interface QueueItem {
  id: string;
  title: string;
  organization: string;
  opportunity_type: string;
  status: string;
}

type QueueStatus = "pending_review" | "verified" | "archived";

export function IngestionQueue({
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

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nodes, setNodes] = useState<FilterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

    const res = await fetch(`/api/admin/ingestion?${params.toString()}`);

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to load the review queue.");
      setQueue([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const body = await res.json();
    setQueue(body.queue ?? []);
    setTotal(body.total ?? 0);
    setLoading(false);
  }, [status, type, tag, page, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, newStatus: QueueStatus) {
    setSavingId(id);
    setError(null);

    const res = await fetch(`/api/admin/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to update status.");
      setSavingId(null);
      return;
    }

    setSavingId(null);
    load();
  }

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
      <p className="mb-4 text-sm text-muted-foreground">
        {total} item{total === 1 ? "" : "s"}
      </p>
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
        ) : queue.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Queue empty.</p>
        ) : (
          queue.map((item) => (
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
              {item.status === "pending_review" ? (
                <div className="flex gap-2">
                  <Link href={`/admin/ingestion/${item.id}`}>
                    <Button size="sm" variant="outline">
                      View details
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    disabled={savingId === item.id}
                    onClick={() => resolve(item.id, "verified")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === item.id}
                    onClick={() => resolve(item.id, "archived")}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                <Link href={`/admin/ingestion/${item.id}`}>
                  <Button size="sm" variant="outline">
                    View details
                  </Button>
                </Link>
              )}
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
