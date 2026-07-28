import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SCORE_MAX } from "@/lib/constants";
import { ScoreBreakdown as ScoreBreakdownType } from "@/lib/types";

const LABELS: Record<keyof ScoreBreakdownType, string> = {
  interest: "Interest match",
  eligibility: "Eligibility",
  deadline: "Deadline",
  experience: "Experience",
  popularity: "Popularity",
};

export function ScoreBreakdown({ breakdown, total }: { breakdown: ScoreBreakdownType; total: number }) {
  const keys = Object.keys(breakdown) as (keyof ScoreBreakdownType)[];

  return (
    <Card className="p-5">
      <p className="mb-3 text-sm text-muted-foreground">Why you&apos;re seeing this</p>
      <div className="space-y-2.5">
        {keys.map((key) => (
          <ProgressBar key={key} label={LABELS[key]} value={breakdown[key]} max={SCORE_MAX[key]} />
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-2xl font-medium">{total}%</span>
      </div>
    </Card>
  );
}
