"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface ListItem {
  id: string;
  slug: string;
  title: string;
  organization: string;
  opportunity_type: string;
  status: string;
  created_at: string;
}

export default function AdminOpportunitiesPage() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/opportunities");

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to load opportunities.");
      setItems([]);
      setLoading(false);
      return;
    }

    const body = await res.json();
    setItems(body.opportunities ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} opportunities
        </p>
        <Link href="/admin/opportunities/new" className={buttonVariants({ size: "sm" })}>
          Add opportunity
        </Link>
      </div>
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="rounded-lg border border-border">
        {items.map((item) => (
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
        ))}
        {items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No opportunities yet.</p>
        )}
      </div>
    </div>
  );
}
