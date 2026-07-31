"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";

interface Result {
  ok: boolean;
  message: string;
}

export default function NewSourcePage() {
  const [name, setName] = useState("");
  const [tier, setTier] = useState("1");
  const [baseUrl, setBaseUrl] = useState("");
  const [description, setDescription] = useState("");
  const [urls, setUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tier: Number(tier),
        base_url: baseUrl,
        description: description || undefined,
        urls: urls
          ? urls.split("\n").map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setResult({ ok: true, message: `Source "${name}" added.` });
      setName("");
      setBaseUrl("");
      setDescription("");
      setUrls("");
    } else {
      setResult({ ok: false, message: data.error ?? "Failed to save" });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Add source</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Register an official website whose listings the app can ingest from.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Card className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Major League Hacking"
                required
              />
            </Field>

            <Field label="Tier">
              <select
                className={inputClass}
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              >
                <option value="1">1 — Official</option>
                <option value="2">2 — Community</option>
                <option value="3">3 — Untrusted</option>
              </select>
            </Field>
          </div>

          <Field label="Base URL" hint="The listing page users will be linked to.">
            <input
              type="url"
              className={inputClass}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://mlh.io/seasons/2026/events"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              className={inputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown to users in the Source Directory."
            />
          </Field>

          <Field
            label="Additional URLs to ingest"
            hint="One per line. Falls back to base_url if empty."
          >
            <textarea
              className={inputClass}
              rows={4}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://mlh.io/seasons/2026/events"
            />
          </Field>
        </Card>

        {result && (
          <div
            className={
              result.ok
                ? "rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
                : "rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            }
          >
            {result.message}
          </div>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save source"}
        </Button>
      </form>
    </div>
  );
}
