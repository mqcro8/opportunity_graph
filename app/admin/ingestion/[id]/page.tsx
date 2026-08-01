"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  OpportunityForm,
  dbToForm,
  type OpportunityFormHandle,
  type OpportunityFormValues,
} from "@/components/admin/opportunity-form";

function statusVariant(status: string): "interest" | "deadline" | "muted" {
  if (status === "verified") return "interest";
  if (status === "archived") return "deadline";
  return "muted";
}

export default function AdminIngestionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const formRef = useRef<OpportunityFormHandle>(null);
  const [formValues, setFormValues] = useState<OpportunityFormValues | null>(
    null
  );
  const [status, setStatus] = useState<string>("pending_review");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/opportunities/${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Failed to load opportunity.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setFormValues(dbToForm(data.opportunity, data.tags ?? []));
      setStatus(String(data.opportunity.status ?? "pending_review"));
      setSourceUrl(data.opportunity.source_url ?? null);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function resolve(nextStatus: "verified" | "archived") {
    setResolving(true);
    setActionError(null);

    try {
      if (nextStatus === "verified") {
        const saved = formRef.current ? await formRef.current.save() : true;
        if (!saved) {
          setResolving(false);
          return;
        }
      }

      const res = await fetch(`/api/admin/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setActionError(
          body?.error ??
            `Failed to ${nextStatus === "verified" ? "approve" : "reject"}.`
        );
        setResolving(false);
        return;
      }

      router.push("/admin/ingestion");
    } catch {
      setActionError("Something went wrong.");
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !formValues) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        {error ?? "Not found"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/admin/ingestion"
          className="text-sm text-muted-foreground underline"
        >
          ← Back to review queue
        </Link>
        <Badge variant={statusVariant(status)}>
          {status.replace("_", " ")}
        </Badge>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <OpportunityForm
        ref={formRef}
        url={`/api/admin/opportunities/${id}`}
        method="PUT"
        initial={formValues}
        heading="Review opportunity"
        intro="All fields below were extracted by AI. Check them against the official page, fix anything wrong, then approve or reject."
        extraActions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={resolving}
              onClick={() => resolve("archived")}
            >
              Reject
            </Button>
            <Button
              type="button"
              disabled={resolving}
              onClick={() => resolve("verified")}
            >
              Approve
            </Button>
          </>
        }
      />

      {sourceUrl && (
        <p className="mt-4 text-center text-sm">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground underline"
          >
            View official page ↗
          </a>
        </p>
      )}
    </div>
  );
}
