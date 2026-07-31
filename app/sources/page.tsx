import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SourceList } from "@/components/source-list";

export default async function SourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sources } = await supabase
    .from("sources")
    .select("name, tier, base_url, description, last_run_at")
    .order("tier")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Source directory</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every official directory the app ingests from.
      </p>
      <SourceList sources={sources ?? []} />
    </div>
  );
}
