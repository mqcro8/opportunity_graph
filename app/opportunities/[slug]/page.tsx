import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import { ScoreBreakdown as ScoreBreakdownUI } from "@/components/score-breakdown";
import { Badge } from "@/components/ui/badge";
import { expandGraph } from "@/lib/graph";
import { explain } from "@/lib/explain";
import {
  interestScore,
  eligibilityScore,
  deadlineScore,
  experienceScore,
  popularityScore,
  WEIGHTS,
} from "@/lib/recommendations";
import type { ScoredOpportunity, ScoreBreakdown } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function OpportunityPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();
  const { slug } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("slug", slug)
    .eq("status", "verified")
    .single();

  if (error || !opportunity) notFound();

  const { data: profileNodes } = await supabase
    .from("profile_nodes")
    .select("node_id")
    .eq("profile_id", user.id);

  const profileNodeIds = (profileNodes ?? []).map((pn) => pn.node_id);

  let profileNames: string[] = [];
  let expandedNames: string[] = [];
  let expandedNodeIds: string[] = [];

  if (profileNodeIds.length > 0) {
    const expansion = await expandGraph(profileNodeIds, { hops: 2 });
    expandedNodeIds = expansion.expandedNodeIds;

    const { data: pNames } = await supabase
      .from("graph_nodes")
      .select("name")
      .in("id", profileNodeIds);

    const { data: eNames } = await supabase
      .from("graph_nodes")
      .select("name")
      .in("id", expandedNodeIds);

    profileNames = (pNames ?? []).map((n) => n.name);
    expandedNames = (eNames ?? []).map((n) => n.name);
  }

  const oppNodesQuery = supabase
    .from("opportunity_nodes")
    .select("relevance, graph_nodes(name, slug)")
    .eq("opportunity_id", opportunity.id);

  if (expandedNodeIds.length > 0) {
    oppNodesQuery.in("node_id", expandedNodeIds);
  }

  const { data: oppNodes } = await oppNodesQuery;

  const matchedNodes = (oppNodes ?? [])
    .map((on) => {
      const gn = on.graph_nodes as unknown as { name: string };
      return gn?.name;
    })
    .filter(Boolean) as string[];

  const { data: allOppNodes } = await supabase
    .from("opportunity_nodes")
    .select("graph_nodes(name)")
    .eq("opportunity_id", opportunity.id);

  const tags = (allOppNodes ?? [])
    .map((on) => {
      const gn = on.graph_nodes as unknown as { name: string };
      return gn?.name;
    })
    .filter(Boolean) as string[];

  const breakdown: ScoreBreakdown = {
    interest: interestScore(matchedNodes, profileNames, expandedNames),
    eligibility: eligibilityScore(opportunity.eligibility),
    deadline: deadlineScore({
      registrationOpens: opportunity.registration_opens,
      registrationDeadline: opportunity.registration_deadline,
      eventEndDate: opportunity.event_end_date,
    }),
    experience: experienceScore(),
    popularity: popularityScore(),
  };

  const total = Math.round(
    breakdown.interest * WEIGHTS.interest +
    breakdown.eligibility * WEIGHTS.eligibility +
    breakdown.deadline * WEIGHTS.deadline +
    breakdown.experience * WEIGHTS.experience +
    breakdown.popularity * WEIGHTS.popularity
  );

  const oppShape = {
    id: opportunity.id,
    slug: opportunity.slug,
    title: opportunity.title,
    organization: opportunity.organization,
    description: opportunity.description ?? "",
    opportunityType: opportunity.opportunity_type as ScoredOpportunity["opportunity"]["opportunityType"],
    registrationOpens: opportunity.registration_opens,
    registrationDeadline: opportunity.registration_deadline,
    eventStartDate: opportunity.event_start_date,
    eventEndDate: opportunity.event_end_date,
    country: opportunity.country,
    deliveryMode: opportunity.delivery_mode as ScoredOpportunity["opportunity"]["deliveryMode"],
    sourceUrl: opportunity.source_url,
    applicationUrl: opportunity.application_url ?? "",
    status: opportunity.status as ScoredOpportunity["opportunity"]["status"],
    tags,
  };

  const explanation = explain({
    opportunity: oppShape,
    score: total,
    breakdown,
    matchedNodes,
    explanation: "",
  });

  const rec: ScoredOpportunity = {
    opportunity: oppShape,
    score: total,
    breakdown,
    matchedNodes,
    explanation,
  };

  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">
        {opportunity.opportunity_type.replace("_", " ")} · {opportunity.country}
      </p>
      <h1 className="mb-1 text-xl font-medium">{opportunity.title}</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Hosted by {opportunity.organization} ·{" "}
        {opportunity.delivery_mode?.replace("_", " ")}
      </p>

      <p className="mb-5 text-xs text-muted-foreground">
        {opportunity.registration_opens && (
          <span>Registration opens {formatDate(opportunity.registration_opens)} · </span>
        )}
        {opportunity.registration_deadline && (
          <span>Deadline {formatDate(opportunity.registration_deadline)} · </span>
        )}
        {opportunity.event_start_date && opportunity.event_end_date && (
          <span>
            Event runs {formatDate(opportunity.event_start_date)}–{formatDate(opportunity.event_end_date)} ·{" "}
          </span>
        )}
        <span>Always verify dates on the official site.</span>
      </p>

      <div className="mb-5">
        <ScoreBreakdownUI breakdown={breakdown} total={total} />
      </div>

      {tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={matchedNodes.includes(tag) ? "interest" : "muted"}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <p className="mb-5 text-sm leading-7 text-muted-foreground">
        {explanation}
      </p>

      <div className="flex gap-2">
        <a
          href={opportunity.application_url}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({})}
        >
          Open application →
        </a>
        <SaveButton opportunityId={opportunity.id} />
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Always verify the details — deadlines, eligibility, and requirements —
        on the official site before applying.
      </p>
    </div>
  );
}
