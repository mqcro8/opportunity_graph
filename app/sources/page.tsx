import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SourceList } from "@/components/source-list";
import { SourceFilters } from "@/components/source-filters";
import { Pagination } from "@/components/pagination";
import { PAGE_SIZE } from "@/lib/constants";

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: { tier?: string; q?: string; page?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tier = searchParams.tier ?? "";
  const q = searchParams.q ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  let query = supabase
    .from("sources")
    .select("name, tier, base_url, description, last_run_at", {
      count: "exact",
    })
    .order("tier")
    .order("name");

  if (tier) query = query.eq("tier", Number(tier));
  if (q) query = query.ilike("name", `%${q}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data: sources, count } = await query.range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (tier) params.set("tier", tier);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/sources?${qs}` : "/sources";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Source directory</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every official directory the app ingests from.
      </p>
      <div className="mt-4">
        <SourceFilters />
      </div>
      <SourceList sources={sources ?? []} />
      {total === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No sources found.</p>
      )}
      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        pageSize={PAGE_SIZE}
        buildHref={buildHref}
      />
    </div>
  );
}
