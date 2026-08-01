"use client";

import {
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { TagPicker, type TagNode } from "@/components/tag-picker";

const OPPORTUNITY_TYPES = [
  "scholarship",
  "hackathon",
  "olympiad",
  "internship",
  "summer_program",
  "conference",
  "fellowship",
  "competition",
  "exchange",
  "certification",
  "grant",
];

const DELIVERY_MODES = ["online", "in_person", "hybrid"];

export interface OpportunityFormValues {
  title: string;
  organization: string;
  description: string;
  opportunity_type: string;
  application_deadline: string;
  country: string;
  delivery_mode: string;
  application_url: string;
  source_url: string;
  education_level: string;
  min_grade: string;
  max_grade: string;
  countries: string;
  age_min: string;
  age_max: string;
  tags: string[];
}

export function emptyFormValues(): OpportunityFormValues {
  return {
    title: "",
    organization: "",
    description: "",
    opportunity_type: "hackathon",
    application_deadline: "",
    country: "",
    delivery_mode: "",
    application_url: "",
    source_url: "",
    education_level: "",
    min_grade: "",
    max_grade: "",
    countries: "",
    age_min: "",
    age_max: "",
    tags: [],
  };
}

export interface OpportunityDbRow {
  title?: unknown;
  organization?: unknown;
  description?: unknown;
  opportunity_type?: unknown;
  application_deadline?: unknown;
  country?: unknown;
  delivery_mode?: unknown;
  application_url?: unknown;
  source_url?: unknown;
  education_level?: unknown;
  eligibility?: unknown;
}

export function dbToForm(
  opp: OpportunityDbRow,
  tags: string[]
): OpportunityFormValues {
  const elig = (opp.eligibility ?? {}) as {
    min_grade?: string | null;
    max_grade?: string | null;
    countries?: string[];
    age_min?: number | null;
    age_max?: number | null;
  };

  return {
    title: String(opp.title ?? ""),
    organization: String(opp.organization ?? ""),
    description: String(opp.description ?? ""),
    opportunity_type: String(opp.opportunity_type ?? "hackathon"),
    application_deadline: String(opp.application_deadline ?? ""),
    country: String(opp.country ?? ""),
    delivery_mode: String(opp.delivery_mode ?? ""),
    application_url: String(opp.application_url ?? ""),
    source_url: String(opp.source_url ?? ""),
    education_level: ((opp.education_level ?? []) as string[]).join(", "),
    min_grade: elig.min_grade ?? "",
    max_grade: elig.max_grade ?? "",
    countries: (elig.countries ?? []).join(", "),
    age_min: elig.age_min != null ? String(elig.age_min) : "",
    age_max: elig.age_max != null ? String(elig.age_max) : "",
    tags,
  };
}

function buildPayload(values: OpportunityFormValues) {
  return {
    title: values.title,
    organization: values.organization,
    description: values.description || undefined,
    opportunity_type: values.opportunity_type,
    application_deadline: values.application_deadline || null,
    country: values.country || null,
    delivery_mode: values.delivery_mode || null,
    application_url: values.application_url || null,
    source_url: values.source_url || null,
    education_level: values.education_level
      ? values.education_level
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    eligibility: {
      min_grade: values.min_grade || null,
      max_grade: values.max_grade || null,
      countries: values.countries
        ? values.countries
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : ["*"],
      age_min: values.age_min ? Number(values.age_min) : null,
      age_max: values.age_max ? Number(values.age_max) : null,
    },
    tags: values.tags,
  };
}

interface Result {
  ok: boolean;
  message: string;
  linkedNodes?: string[];
}

export interface OpportunityFormHandle {
  save: () => Promise<boolean>;
}

export const OpportunityForm = forwardRef<
  OpportunityFormHandle,
  {
    url: string;
    method: "POST" | "PUT";
    initial: OpportunityFormValues;
    heading: string;
    intro: string;
    extraActions?: React.ReactNode;
  }
>(function OpportunityForm(
  { url, method, initial, heading, intro, extraActions },
  ref
) {
  const [values, setValues] = useState<OpportunityFormValues>(initial);
  const [nodes, setNodes] = useState<TagNode[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    async function loadNodes() {
      const res = await fetch("/api/admin/graph-nodes");
      if (!res.ok) return;
      const data = await res.json();
      setNodes(data.nodes ?? []);
    }
    loadNodes();
  }, []);

  function set<K extends keyof OpportunityFormValues>(
    key: K,
    value: OpportunityFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const save = useCallback(async (): Promise<boolean> => {
    setSubmitting(true);
    setResult(null);

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(values)),
    });

    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setResult({
        ok: true,
        message:
          method === "POST"
            ? `Saved "${values.title}" as verified.`
            : `Updated "${values.title}".`,
        linkedNodes: data.linkedNodes,
      });
      if (method === "POST") setValues(emptyFormValues());
      return true;
    }

    setResult({ ok: false, message: data.error ?? "Failed to save" });
    return false;
  }, [method, url, values]);

  useImperativeHandle(ref, () => ({ save }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void save();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Card className="space-y-4 p-6">
          <Field label="Title">
            <input
              className={inputClass}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization">
              <input
                className={inputClass}
                value={values.organization}
                onChange={(e) => set("organization", e.target.value)}
                required
              />
            </Field>

            <Field label="Type">
              <select
                className={inputClass}
                value={values.opportunity_type}
                onChange={(e) => set("opportunity_type", e.target.value)}
              >
                {OPPORTUNITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className={inputClass}
              rows={4}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Application deadline">
              <input
                type="date"
                className={inputClass}
                value={values.application_deadline}
                onChange={(e) => set("application_deadline", e.target.value)}
              />
            </Field>

            <Field label="Delivery mode">
              <select
                className={inputClass}
                value={values.delivery_mode}
                onChange={(e) => set("delivery_mode", e.target.value)}
              >
                <option value="">Unknown</option>
                {DELIVERY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country">
              <input
                className={inputClass}
                value={values.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </Field>

            <Field label="Education level" hint="Comma separated, e.g. high_school, undergraduate">
              <input
                className={inputClass}
                value={values.education_level}
                onChange={(e) => set("education_level", e.target.value)}
                placeholder="high_school, undergraduate"
              />
            </Field>
          </div>

          <Field label="Application URL">
            <input
              type="url"
              className={inputClass}
              value={values.application_url}
              onChange={(e) => set("application_url", e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <Field label="Source URL" hint="Where this opportunity is officially listed.">
            <input
              type="url"
              className={inputClass}
              value={values.source_url}
              onChange={(e) => set("source_url", e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </Card>

        <Card className="space-y-4 p-6">
          <p className="font-medium">Eligibility</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Min grade">
              <input
                className={inputClass}
                value={values.min_grade}
                onChange={(e) => set("min_grade", e.target.value)}
                placeholder="e.g. 9"
              />
            </Field>

            <Field label="Max grade">
              <input
                className={inputClass}
                value={values.max_grade}
                onChange={(e) => set("max_grade", e.target.value)}
                placeholder="e.g. 12"
              />
            </Field>
          </div>

          <Field
            label="Eligible countries"
            hint="ISO codes or country names, comma separated. Leave empty for global."
          >
            <input
              className={inputClass}
              value={values.countries}
              onChange={(e) => set("countries", e.target.value)}
              placeholder="US, MX"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Min age">
              <input
                type="number"
                className={inputClass}
                value={values.age_min}
                onChange={(e) => set("age_min", e.target.value)}
              />
            </Field>

            <Field label="Max age">
              <input
                type="number"
                className={inputClass}
                value={values.age_max}
                onChange={(e) => set("age_max", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <p className="font-medium">Tags</p>
          <p className="text-sm text-muted-foreground">
            These labels drive matching and show up on the opportunity. The
            category hub for the type is always added. Leave empty to auto-link
            from the title and description.
          </p>
          <TagPicker
            nodes={nodes}
            selected={values.tags}
            onChange={(tags) => set("tags", tags)}
          />
        </Card>

        {result && (
          <div
            className={
              result.ok
                ? "rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
                : "rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            }
          >
            <p>{result.message}</p>
            {result.ok && result.linkedNodes && result.linkedNodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.linkedNodes.map((node) => (
                  <Badge key={node} variant="interest">
                    {node}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : method === "POST" ? "Save opportunity" : "Save changes"}
          </Button>
          {extraActions}
        </div>
      </form>
    </div>
  );
});
