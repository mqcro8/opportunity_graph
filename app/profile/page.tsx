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

const INTEREST_OPTIONS = [
  "Artificial Intelligence",
  "Robotics",
  "Web Development",
  "Data Analysis",
  "Climate Science",
  "Biomedical Engineering",
  "Entrepreneurship",
  "Social Impact",
  "Space Exploration",
  "Research",
  "Public Speaking",
  "Technical Writing",
];

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Mandarin",
  "French",
  "German",
  "Portuguese",
  "Arabic",
  "Hindi",
];

const GOAL_OPTIONS = [
  "Get a scholarship",
  "Join a hackathon",
  "Find a summer program",
  "Compete in an olympiad",
  "Get an internship",
  "Study abroad",
  "Do research",
  "Start a company",
];

interface GraphNode {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export default function ProfilePage() {
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const router = useRouter();

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

      const { data: nodes } = await supabase
        .from("graph_nodes")
        .select("id, name, slug, type")
        .in("type", ["skill", "interest", "field", "language"]);

      setGraphNodes(nodes ?? []);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setGrade(profile.current_grade ?? "");
        setLanguages(profile.languages ?? []);
        setGoals(profile.goals ?? []);
      }

      const { data: profileNodes } = await supabase
        .from("profile_nodes")
        .select("graph_nodes(name)")
        .eq("profile_id", user.id);

      if (profileNodes && profileNodes.length > 0) {
        const names = profileNodes
          .map((pn) => {
            const gn = pn.graph_nodes as unknown as { name: string };
            return gn?.name;
          })
          .filter(Boolean);
        setInterests(names);
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
    const matchedNodeIds = graphNodes
      .filter(
        (n) =>
          interests.includes(n.name) ||
          languages.includes(n.name) ||
          goals.includes(n.name)
      )
      .map((n) => n.id);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_grade: grade,
        languages,
        goals,
        nodeIds: matchedNodeIds,
      }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1000);
    }
    setSaving(false);
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
        ? INTEREST_OPTIONS
        : step === 2
          ? LANGUAGE_OPTIONS
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
          <div className="mb-6 space-y-2">
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
    </div>
  );
}
