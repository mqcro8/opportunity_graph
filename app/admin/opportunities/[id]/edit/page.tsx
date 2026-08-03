"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  OpportunityForm,
  dbToForm,
  type OpportunityFormValues,
} from "@/components/admin/opportunity-form";

export default function EditOpportunityPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [formValues, setFormValues] = useState<OpportunityFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(false);
    }
    load();
  }, [id, router]);

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
      <OpportunityForm
        url={`/api/admin/opportunities/${id}`}
        method="PUT"
        initial={formValues}
        heading="Edit opportunity"
        intro="Update details and tags. Tags control exactly how it matches student profiles."
      />
      <p className="mt-4 text-center text-sm">
        <Link
          href="/admin/opportunities"
          className="text-muted-foreground underline"
        >
          Back to list
        </Link>
      </p>
    </div>
  );
}
