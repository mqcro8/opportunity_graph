import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunityRow } from "@/components/opportunity-row";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

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

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-muted-foreground">
          Complete your profile to see personalized recommendations.
        </p>
        <Link href="/profile" className={buttonVariants({})}>
          Set up profile →
        </Link>
      </div>
    );
  }

  const { data: profileNodes } = await supabase
    .from("profile_nodes")
    .select("node_id")
    .eq("profile_id", user.id);

  if (!profileNodes || profileNodes.length === 0) {
    return (
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

  const { getRecommendations } = await import("@/lib/recommendations");
  const { EmptyProfileError } = await import("@/lib/errors");

  let recommendations;
  try {
    recommendations = await getRecommendations(user.id);
  } catch (error) {
    if (error instanceof EmptyProfileError) {
      return (
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
    throw error;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {recommendations.length} opportunit{recommendations.length === 1 ? "y" : "ies"} match your profile
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
