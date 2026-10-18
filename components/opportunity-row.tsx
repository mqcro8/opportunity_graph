import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ScoredOpportunity } from "@/lib/types";
import { getDateDisplay } from "@/lib/utils";

export function OpportunityRow({ rec }: { rec: ScoredOpportunity }) {
  const { active, deadlineLabel, deadlineUrgent, eventLabel } = getDateDisplay(
    rec.opportunity
  );
  const tags =
    rec.opportunity.tags.length > 0 ? rec.opportunity.tags : rec.matchedNodes;

  return (
    <article className="border-b border-border p-5 transition-colors last:border-b-0 hover:bg-secondary/30">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="flex-1">
          <Link
            href={`/opportunities/${rec.opportunity.slug}`}
            className="text-base font-medium hover:underline focus-ring rounded"
          >
            {rec.opportunity.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {rec.opportunity.organization} · {rec.opportunity.opportunityType.replace("_", " ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-medium">{rec.score}%</p>
          <p className="text-xs text-muted-foreground">match to your profile</p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {deadlineLabel && (
          <Badge variant={deadlineUrgent ? "deadline" : "muted"}>
            {deadlineUrgent && <Clock className="h-3 w-3" />}
            {deadlineLabel}
          </Badge>
        )}
        {active && <Badge variant="active">Active</Badge>}
        {eventLabel && !active && <Badge variant="muted">{eventLabel}</Badge>}
      </div>

      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant={rec.matchedNodes.includes(tag) ? "interest" : "muted"}>
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <p className="mb-2 text-sm leading-6 text-muted-foreground">
        <span className="font-medium text-foreground/80">Why:</span> {rec.explanation}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={`/opportunities/${rec.opportunity.slug}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          View details →
        </Link>
        {rec.opportunity.applicationUrl && (
          <a
            href={rec.opportunity.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm" })}
          >
            Open application
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}
