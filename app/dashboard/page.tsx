import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunityRow } from "@/components/opportunity-row";
import { SourceDirectory } from "@/components/source-directory";
import type { DirectorySource } from "@/components/source-directory";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const DASHBOARD_SOURCE_LIMIT = 3;

interface SourceRow {
  id: string;
  name: string;
  tier: number;
  base_url: string;
  description: string | null;
  last_run_at: string | null;
}

function rankSources(
  sources: SourceRow[],
  counts: Record<string, number>
): DirectorySource[] {
  return [...sources]
    .sort((a, b) => {
      const ca = counts[a.id] ?? 0;
      const cb = counts[b.id] ?? 0;
      if (ca !== cb) return cb - ca;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    })
    .slice(0, DASHBOARD_SOURCE_LIMIT)
    .map((s) => ({
      name: s.name,
      tier: s.tier,
      base_url: s.base_url,
      description: s.description,
      last_run_at: s.last_run_at,
    }));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  const { data: sources } = await supabase
    .from("sources")
    .select("id, name, tier, base_url, description, last_run_at")
    .order("tier")
    .order("name");

  const sourceRows = (sources ?? []) as SourceRow[];
  let directorySources = rankSources(sourceRows, {});

  let content;

  if (!profile) {
    content = (
      <div className="py-12 text-center">
        <p className="mb-4 text-muted-foreground">
          Complete your profile to see personalized recommendations.
        </p>
        <Link href="/profile" className={buttonVariants({})}>
          Set up profile →
        </Link>
      </div>
    );
  } else {
    const { data: profileNodes } = await supabase
      .from("profile_nodes")
      .select("node_id")
      .eq("profile_id", user.id);

    if (!profileNodes || profileNodes.length === 0) {
      content = (
        <div className="py-12 text-center">
          <p className="mb-4 text-muted-foreground">
            Add interests and skills to your profile to see recommendations.
          </p>
          <Link href="/profile" className={buttonVariants({})}>
            Set up profile →
          </Link>
        </div>
      );
    } else {
      const { getRecommendations } = await import("@/lib/recommendations");
      const { EmptyProfileError } = await import("@/lib/errors");

      let recommendations;
      try {
        recommendations = await getRecommendations(user.id);
      } catch (error) {
        if (!(error instanceof EmptyProfileError)) throw error;
        content = (
          <div className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              Add interests and skills to your profile to see recommendations.
            </p>
            <Link href="/profile" className={buttonVariants({})}>
              Set up profile →
            </Link>
          </div>
        );
      }

      if (recommendations) {
        const counts: Record<string, number> = {};
        for (const rec of recommendations) {
          if (rec.opportunity.sourceId) {
            counts[rec.opportunity.sourceId] =
              (counts[rec.opportunity.sourceId] ?? 0) + 1;
          }
        }
        directorySources = rankSources(sourceRows, counts);

        content = (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              {recommendations.length} opportunit
              {recommendations.length === 1 ? "y" : "ies"} match your profile
            </p>
            <Card className="overflow-hidden">
              {recommendations.map((rec) => (
                <OpportunityRow key={rec.opportunity.id} rec={rec} />
              ))}
              {recommendations.length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">
                  No matches yet. Try adding more interests to your profile.
                </p>
              )}
            </Card>
          </div>
        );
      }
    }
  }

  return (
    <div>
      {content}
      <SourceDirectory sources={directorySources} showFullListLink />
    </div>
  );
}
