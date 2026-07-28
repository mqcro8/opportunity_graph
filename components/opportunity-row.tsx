import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ScoredOpportunity } from "@/lib/types";
import { getDeadlineInfo } from "@/lib/utils";

export function OpportunityRow({ rec }: { rec: ScoredOpportunity }) {
  const { label, urgent } = getDeadlineInfo(rec.opportunity.applicationDeadline);

  return (
    <div className="border-b border-border p-5 last:border-b-0">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{rec.opportunity.title}</p>
          <p className="text-sm text-muted-foreground">
            {rec.opportunity.organization} · {rec.opportunity.opportunityType.replace("_", " ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-medium">{rec.score}%</p>
          <p className="text-xs text-muted-foreground">match</p>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {rec.matchedNodes.map((n) => (
          <Badge key={n} variant="interest">
            {n}
          </Badge>
        ))}
        <Badge variant={urgent ? "deadline" : "muted"}>
          {urgent && <Clock className="h-3 w-3" />}
          {label}
        </Badge>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{rec.explanation}</p>
      <Link
        href={`/opportunities/${rec.opportunity.slug}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        View details →
      </Link>
    </div>
  );
}
