"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";

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

interface Result {
  ok: boolean;
  message: string;
  linkedNodes?: string[];
}

export default function NewOpportunityPage() {
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [description, setDescription] = useState("");
  const [opportunityType, setOpportunityType] = useState("hackathon");
  const [deadline, setDeadline] = useState("");
  const [country, setCountry] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [minGrade, setMinGrade] = useState("");
  const [maxGrade, setMaxGrade] = useState("");
  const [countries, setCountries] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function clearForm() {
    setTitle("");
    setOrganization("");
    setDescription("");
    setOpportunityType("hackathon");
    setDeadline("");
    setCountry("");
    setDeliveryMode("");
    setApplicationUrl("");
    setSourceUrl("");
    setMinGrade("");
    setMaxGrade("");
    setCountries("");
    setAgeMin("");
    setAgeMax("");
    setEducationLevel("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch("/api/admin/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        organization,
        description: description || undefined,
        opportunity_type: opportunityType,
        application_deadline: deadline || null,
        country: country || null,
        delivery_mode: deliveryMode || null,
        application_url: applicationUrl || null,
        source_url: sourceUrl || null,
        education_level: educationLevel
          ? educationLevel.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        eligibility: {
          min_grade: minGrade || null,
          max_grade: maxGrade || null,
          countries: countries
            ? countries.split(",").map((s) => s.trim()).filter(Boolean)
            : ["*"],
          age_min: ageMin ? Number(ageMin) : null,
          age_max: ageMax ? Number(ageMax) : null,
        },
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setResult({
        ok: true,
        message: `Saved "${title}" as verified.`,
        linkedNodes: data.linkedNodes,
      });
      clearForm();
    } else {
      setResult({ ok: false, message: data.error ?? "Failed to save" });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Add opportunity</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Saves as verified and auto-links to matching graph nodes.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Card className="space-y-4 p-6">
          <Field label="Title">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization">
              <input
                className={inputClass}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </Field>

            <Field label="Type">
              <select
                className={inputClass}
                value={opportunityType}
                onChange={(e) => setOpportunityType(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Application deadline">
              <input
                type="date"
                className={inputClass}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Field>

            <Field label="Delivery mode">
              <select
                className={inputClass}
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value)}
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
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </Field>

            <Field label="Education level" hint="Comma separated, e.g. high_school, undergraduate">
              <input
                className={inputClass}
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                placeholder="high_school, undergraduate"
              />
            </Field>
          </div>

          <Field label="Application URL">
            <input
              type="url"
              className={inputClass}
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <Field label="Source URL" hint="Where this opportunity is officially listed.">
            <input
              type="url"
              className={inputClass}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
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
                value={minGrade}
                onChange={(e) => setMinGrade(e.target.value)}
                placeholder="e.g. 9"
              />
            </Field>

            <Field label="Max grade">
              <input
                className={inputClass}
                value={maxGrade}
                onChange={(e) => setMaxGrade(e.target.value)}
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
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              placeholder="US, MX"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Min age">
              <input
                type="number"
                className={inputClass}
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
            </Field>

            <Field label="Max age">
              <input
                type="number"
                className={inputClass}
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </Field>
          </div>
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

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save opportunity"}
        </Button>
      </form>
    </div>
  );
}
