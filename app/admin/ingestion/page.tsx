"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QueueItem {
  id: string;
  title: string;
  organization: string;
  opportunity_type: string;
  status: string;
}

type QueueStatus = "pending_review" | "verified" | "archived";

export default function AdminIngestionPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/ingestion");

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to load the review queue.");
      setQueue([]);
      setLoading(false);
      return;
    }

    const body = await res.json();
    setQueue(body.queue ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, status: QueueStatus) {
    setSavingId(id);
    setError(null);

    const res = await fetch(`/api/admin/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to update status.");
      setSavingId(null);
      return;
    }

    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
    setSavingId(null);
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const pending = queue.filter((item) => item.status === "pending_review");

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {pending.length} items pending review
      </p>
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="rounded-lg border border-border">
        {queue.map((item) => (
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
        ))}
        {queue.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Queue empty.</p>
        )}
      </div>
    </div>
  );
}
