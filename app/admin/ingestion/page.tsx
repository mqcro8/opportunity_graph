"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/db";

interface PendingItem {
  id: string;
  title: string;
  organization: string;
  opportunity_type: string;
  status: string;
}

export default function AdminIngestionPage() {
  const [queue, setQueue] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("opportunities")
        .select("id, title, organization, opportunity_type, status")
        .in("status", ["pending_review", "verified", "archived"])
        .order("created_at", { ascending: false });

      setQueue(data ?? []);
      setLoading(false);
    }

    load();
  }, [router]);

  async function resolve(id: string, newStatus: "verified" | "archived") {
    const supabase = createClient();
    await supabase
      .from("opportunities")
      .update({ status: newStatus, last_verified_at: new Date().toISOString() })
      .eq("id", id);

    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );
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
            {item.status === "pending_review" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolve(item.id, "verified")}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolve(item.id, "archived")}
                >
                  Reject
                </Button>
              </div>
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
