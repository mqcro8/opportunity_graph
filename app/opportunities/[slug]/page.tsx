import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { SaveButton } from "@/components/save-button";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { Badge } from "@/components/ui/badge";
import type { ScoredOpportunity } from "@/lib/types";

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

  const { data: oppNodes } = await supabase
    .from("opportunity_nodes")
    .select("relevance, graph_nodes(name, slug)")
    .eq("opportunity_id", opportunity.id);

  const matchedNodes = (oppNodes ?? [])
    .map((on) => {
      const gn = on.graph_nodes as unknown as { name: string };
      return gn?.name;
    })
    .filter(Boolean) as string[];

  const breakdown = {
    interest: matchedNodes.length > 0 ? 75 : 25,
    eligibility: 100,
    deadline: 67,
    experience: 50,
    popularity: 50,
  };

  const total = Math.round(
    breakdown.interest * 0.4 +
    breakdown.eligibility * 0.25 +
    breakdown.deadline * 0.15 +
    breakdown.experience * 0.1 +
    breakdown.popularity * 0.1
  );

  const nodes = matchedNodes.join(", ");
  const explanation =
    matchedNodes.length > 0
      ? `Because you're interested in ${nodes}, and this ${opportunity.opportunity_type.replace("_", " ")} accepts applicants matching your profile.`
      : `This ${opportunity.opportunity_type.replace("_", " ")} matches your profile.`;

  const rec: ScoredOpportunity = {
    opportunity: {
      id: opportunity.id,
      slug: opportunity.slug,
      title: opportunity.title,
      organization: opportunity.organization,
      description: opportunity.description ?? "",
      opportunityType: opportunity.opportunity_type as ScoredOpportunity["opportunity"]["opportunityType"],
      applicationDeadline: opportunity.application_deadline,
      country: opportunity.country,
      deliveryMode: opportunity.delivery_mode as ScoredOpportunity["opportunity"]["deliveryMode"],
      sourceUrl: opportunity.source_url,
      applicationUrl: opportunity.application_url ?? "",
      status: opportunity.status as ScoredOpportunity["opportunity"]["status"],
    },
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

      <div className="mb-5">
        <ScoreBreakdown breakdown={breakdown} total={total} />
      </div>

      {matchedNodes.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {matchedNodes.map((n) => (
            <Badge key={n} variant="interest">
              {n}
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
    </div>
  );
}
