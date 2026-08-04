import { createClient } from "@/lib/supabase/server";
import { expandGraph } from "@/lib/graph";
import { explain } from "@/lib/explain";
import { EmptyProfileError } from "@/lib/errors";
import { SCORE_MAX } from "@/lib/constants";
import type { ScoredOpportunity, ScoreBreakdown } from "@/lib/types";

export const WEIGHTS = {
  interest: 0.4,
  eligibility: 0.25,
  deadline: 0.15,
  experience: 0.1,
  popularity: 0.1,
} as const;

interface DbOpportunity {
  id: string;
  source_id: string | null;
  slug: string;
  title: string;
  organization: string;
  description: string | null;
  opportunity_type: string;
  registration_opens: string | null;
  registration_deadline: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  eligibility: Record<string, unknown>;
  country: string | null;
  delivery_mode: string | null;
  source_url: string;
  application_url: string | null;
  status: string;
  matched_node_names: string[];
}

export function interestScore(
  matchedNodeNames: string[],
  profileNodeNames: string[],
  expandedNodeNames: string[]
): number {
  const direct = matchedNodeNames.filter((n) => profileNodeNames.includes(n)).length;
  const indirect = matchedNodeNames.filter(
    (n) => !profileNodeNames.includes(n) && expandedNodeNames.includes(n)
  ).length;

  if (matchedNodeNames.length === 0) return 0;
  const ratio = (direct * 1.0 + indirect * 0.5) / matchedNodeNames.length;
  return Math.round(ratio * SCORE_MAX.interest);
}

export function eligibilityScore(eligibility: Record<string, unknown>): number {
  const elig = eligibility as {
    countries?: string[];
  };

  const countries = elig.countries ?? [];
  if (countries.length === 0 || countries.includes("*")) {
    return SCORE_MAX.eligibility;
  }

  return Math.round(SCORE_MAX.eligibility * 0.5);
}

export function deadlineScore(dates: {
  registrationOpens: string | null;
  registrationDeadline: string | null;
  eventEndDate: string | null;
}): number {
  const now = Date.now();

  if (dates.registrationOpens && now < new Date(dates.registrationOpens).getTime()) {
    return Math.round(SCORE_MAX.deadline * 0.5);
  }

  const deadline = dates.registrationDeadline ?? dates.eventEndDate;
  if (!deadline) return Math.round(SCORE_MAX.deadline * 0.5);

  const days = Math.ceil(
    (new Date(deadline).getTime() - now) / 86400000
  );

  if (days < 0) return 0;
  if (days <= 14) return SCORE_MAX.deadline;
  if (days <= 30) return Math.round(SCORE_MAX.deadline * 0.8);
  if (days <= 60) return Math.round(SCORE_MAX.deadline * 0.5);
  return Math.round(SCORE_MAX.deadline * 0.3);
}

export function experienceScore(): number {
  return Math.round(SCORE_MAX.experience * 0.5);
}

export function popularityScore(): number {
  return Math.round(SCORE_MAX.popularity * 0.5);
}

export async function getRecommendations(
  profileId: string,
  limit?: number
): Promise<ScoredOpportunity[]> {
  const supabase = await createClient();

  const { data: profileNodes, error: pnError } = await supabase
    .from("profile_nodes")
    .select("node_id, weight")
    .eq("profile_id", profileId);

  if (pnError) throw pnError;

  const profileNodeIds = (profileNodes ?? []).map((pn) => pn.node_id);

  if (profileNodeIds.length === 0) {
    throw new EmptyProfileError(profileId);
  }

  const { expandedNodeIds } = await expandGraph(profileNodeIds, { hops: 2 });

  const { data: oppNodes, error: onError } = await supabase
    .from("opportunity_nodes")
    .select("opportunity_id, node_id, relevance, graph_nodes(name)")
    .in("node_id", expandedNodeIds);

  if (onError) throw onError;

  const oppIds = [...new Set((oppNodes ?? []).map((on) => on.opportunity_id))];

  if (oppIds.length === 0) return [];

  const { data: opportunities, error: oppError } = await supabase
    .from("opportunities")
    .select("*")
    .in("id", oppIds)
    .eq("status", "verified");

  if (oppError) throw oppError;

  const { data: profileNodeNames } = await supabase
    .from("graph_nodes")
    .select("name")
    .in("id", profileNodeIds);

  const { data: expandedNodeNames } = await supabase
    .from("graph_nodes")
    .select("name")
    .in("id", expandedNodeIds);

  const profileNames = (profileNodeNames ?? []).map((n) => n.name);
  const expandedNames = (expandedNodeNames ?? []).map((n) => n.name);

  const oppNodeMap = new Map<string, string[]>();
  for (const on of oppNodes ?? []) {
    const names = oppNodeMap.get(on.opportunity_id) ?? [];
    const nodeName = (on.graph_nodes as unknown as { name: string })?.name;
    if (nodeName) names.push(nodeName);
    oppNodeMap.set(on.opportunity_id, names);
  }

  const { data: allOppNodes } = await supabase
    .from("opportunity_nodes")
    .select("opportunity_id, graph_nodes(name)")
    .in("opportunity_id", oppIds);

  const allTagsMap = new Map<string, string[]>();
  for (const on of allOppNodes ?? []) {
    const names = allTagsMap.get(on.opportunity_id) ?? [];
    const nodeName = (on.graph_nodes as unknown as { name: string })?.name;
    if (nodeName) names.push(nodeName);
    allTagsMap.set(on.opportunity_id, names);
  }

  const scored: ScoredOpportunity[] = (opportunities ?? []).map((opp) => {
    const matchedNodes = oppNodeMap.get(opp.id) ?? [];

    const interest = interestScore(matchedNodes, profileNames, expandedNames);
    const eligibility = eligibilityScore(opp.eligibility);
    const deadline = deadlineScore({
      registrationOpens: opp.registration_opens,
      registrationDeadline: opp.registration_deadline,
      eventEndDate: opp.event_end_date,
    });
    const experience = experienceScore();
    const popularity = popularityScore();

    const score =
      interest * WEIGHTS.interest +
      eligibility * WEIGHTS.eligibility +
      deadline * WEIGHTS.deadline +
      experience * WEIGHTS.experience +
      popularity * WEIGHTS.popularity;

    const breakdown: ScoreBreakdown = {
      interest,
      eligibility,
      deadline,
      experience,
      popularity,
    };

    const rec: ScoredOpportunity = {
      opportunity: {
        id: opp.id,
        sourceId: opp.source_id,
        slug: opp.slug,
        title: opp.title,
        organization: opp.organization,
        description: opp.description ?? "",
        opportunityType: opp.opportunity_type as ScoredOpportunity["opportunity"]["opportunityType"],
        registrationOpens: opp.registration_opens,
        registrationDeadline: opp.registration_deadline,
        eventStartDate: opp.event_start_date,
        eventEndDate: opp.event_end_date,
        country: opp.country,
        deliveryMode: opp.delivery_mode as ScoredOpportunity["opportunity"]["deliveryMode"],
        sourceUrl: opp.source_url,
        applicationUrl: opp.application_url ?? "",
        status: opp.status as ScoredOpportunity["opportunity"]["status"],
        tags: allTagsMap.get(opp.id) ?? [],
      },
      score: Math.round(score),
      breakdown,
      matchedNodes,
      explanation: "",
    };

    rec.explanation = explain(rec);
    return rec;
  });

  return scored
    .filter((s) => s.breakdown.eligibility > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}