"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/db";

const STEPS = ["Grade", "Interests", "Languages", "Goals"];

const GRADE_OPTIONS = [
  "Middle school (6-8)",
  "High school (9-10)",
  "High school (11-12)",
  "Undergraduate",
  "Graduate",
];

const GOAL_OPTIONS = [
  "Get a scholarship",
  "Join a hackathon",
  "Find a summer program",
  "Compete in an olympiad",
  "Compete in a competition",
  "Get an internship",
  "Get a fellowship",
  "Find a conference",
  "Earn a certification",
  "Get a grant",
  "Study abroad",
  "Do research",
  "Start a company",
];

const INTEREST_NODE_TYPES = ["skill", "interest", "field"];
const LANGUAGE_NODE_TYPE = "language";

export default function ProfilePage() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [gpa, setGpa] = useState("");
  const [grade, setGrade] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [languageOptions, setLanguageOptions] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function loadOptions() {
      const supabase = createClient();
      const { data } = await supabase
        .from("graph_nodes")
        .select("name, type")
        .in("type", [...INTEREST_NODE_TYPES, LANGUAGE_NODE_TYPE]);

      if (!data) return;
      setInterestOptions(
        data
          .filter((n) => INTEREST_NODE_TYPES.includes(n.type))
          .map((n) => n.name)
          .sort((a, b) => a.localeCompare(b))
      );
      setLanguageOptions(
        data
          .filter((n) => n.type === LANGUAGE_NODE_TYPE)
          .map((n) => n.name)
          .sort((a, b) => a.localeCompare(b))
      );
    }
    loadOptions();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setLoading(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setGpa(profile.gpa != null ? String(profile.gpa) : "");
        setGrade(profile.current_grade ?? "");
        setLanguages(profile.languages ?? []);
        setGoals(profile.goals ?? []);
      }

      const { data: profileNodes } = await supabase
        .from("profile_nodes")
        .select("graph_nodes(name, type)")
        .eq("profile_id", user.id);

      if (profileNodes && profileNodes.length > 0) {
        const nodes = profileNodes
          .map((pn) => pn.graph_nodes as unknown as { name: string; type: string } | null)
          .filter((n): n is { name: string; type: string } => n !== null);
        setInterests(
          nodes
            .filter((n) => INTEREST_NODE_TYPES.includes(n.type))
            .map((n) => n.name)
        );
        setLanguages(
          nodes
            .filter((n) => n.type === LANGUAGE_NODE_TYPE)
            .map((n) => n.name)
        );
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  function toggleItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const gpaValue = gpa === "" ? null : Number(gpa);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName || null,
        current_grade: grade,
        gpa: gpaValue !== null && !Number.isNaN(gpaValue) ? gpaValue : null,
        interests,
        languages,
        goals,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSaveError(data.error ?? "Failed to save profile");
      setSaving(false);
      return;
    }

    if (data.matchedCount === 0) {
      const names = [interests, languages, goals].flat().filter(Boolean);
      if (names.length > 0) {
        setSaveError(
          `None of your selections matched known graph nodes. Unmatched: ${names.join(", ")}`
        );
        setSaving(false);
        return;
      }
    }

    setSaved(true);
    setTimeout(() => router.push("/dashboard"), 1000);
    setSaving(false);
  }

  async function handleDeleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    const res = await fetch("/api/profile", { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "Failed to delete account");
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  const stepLabels = ["What's your education level?", "What are you interested in?", "What languages do you speak?", "What are your goals?"];
  const currentOptions =
    step === 0
      ? GRADE_OPTIONS
      : step === 1
        ? interestOptions
        : step === 2
          ? languageOptions
          : GOAL_OPTIONS;

  const currentSelections =
    step === 0 ? [grade] : step === 1 ? interests : step === 2 ? languages : goals;

  const setCurrentSelections =
    step === 0
      ? (v: string) => setGrade(v)
      : step === 1
        ? (v: string[]) => setInterests(v)
        : step === 2
          ? (v: string[]) => setLanguages(v)
          : (v: string[]) => setGoals(v);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <div className="mb-5 flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i < step ? "bg-blue-500" : i === step ? "bg-blue-300" : "bg-secondary"
              )}
            />
          ))}
        </div>
        <p className="mb-1 text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <p className="mb-4 text-lg font-medium">{stepLabels[step]}</p>

        {step === 0 ? (
          <div className="mb-6 space-y-5">
            <div>
              <label
                htmlFor="display-name"
                className="mb-1 block text-sm font-medium"
              >
                Nickname
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="gpa"
                className="mb-1 block text-sm font-medium"
              >
                GPA (optional)
              </label>
              <input
                id="gpa"
                type="number"
                min={0}
                max={4}
                step={0.01}
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                placeholder="e.g. 3.8"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              {GRADE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setGrade(option)}
                  className={cn(
                    "w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    grade === option
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap gap-2">
            {currentOptions.map((option) => {
              const selected = currentSelections.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => {
                    (setCurrentSelections as (v: string[]) => void)(
                      selected
                        ? currentSelections.filter((i) => i !== option)
                        : [...currentSelections, option]
                    );
                  }}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {saveError && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
            {saveError}
          </p>
        )}

        {saved ? (
          <div className="w-full rounded-md bg-green-50 p-3 text-center text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Profile saved. Redirecting...
          </div>
        ) : (
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={
                step === 0 ? !grade : currentSelections.length === 0
              }
              onClick={() => {
                if (step < STEPS.length - 1) {
                  setStep((s) => s + 1);
                } else {
                  handleSave();
                }
              }}
            >
              {saving
                ? "Saving..."
                : step === STEPS.length - 1
                  ? "Save profile"
                  : "Continue"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="mt-6 border-destructive/30 p-6">
        <h2 className="text-sm font-medium text-destructive">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently removes your profile, saved opportunities, and interactions.
          This cannot be undone.
        </p>

        {deleteError && (
          <p className="mt-3 rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
            {deleteError}
          </p>
        )}

        <Button
          variant="outline"
          className="mt-4 w-full border-destructive/50 text-destructive hover:bg-destructive/10"
          disabled={deleting}
          onClick={handleDeleteAccount}
        >
          {deleting
            ? "Deleting..."
            : confirmingDelete
              ? "Click again to confirm"
              : "Delete account"}
        </Button>

        {confirmingDelete && !deleting && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Are you sure? This will permanently delete your account and all your data.
          </p>
        )}
      </Card>
    </div>
  );
}
