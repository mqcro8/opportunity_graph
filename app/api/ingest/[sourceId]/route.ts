import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractFromUrl } from "@/lib/extraction";
import { linkOpportunityToNodes } from "@/lib/linking";
import { slugify } from "@/lib/utils";

function verifyCronSecret(request: Request): boolean {
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("cron_secret");
  const headerSecret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return querySecret === expected || headerSecret === expected;
}

async function getUrlsToScrape(sourceId: string, supabase: ReturnType<typeof createAdminClient>) {
  const { data: source, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (error || !source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  const config = source.scrape_config as { urls?: string[] } | null;
  const urls = config?.urls?.length ? config.urls : [source.base_url];

  return { source, urls };
}

export async function GET(
  request: Request,
  { params }: { params: { sourceId: string } }
) {
  const { sourceId } = await params;

  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { source, urls } = await getUrlsToScrape(sourceId, supabase);

    let totalFound = 0;
    let totalAdded = 0;
    const errors: string[] = [];

    for (const url of urls) {
      try {
        const extracted = await extractFromUrl(url);

        for (const opp of extracted) {
          totalFound++;
          const slug = slugify(opp.title);

          const { data: existing } = await supabase
            .from("opportunities")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

          if (existing) continue;

          const { data: inserted, error: insertError } = await supabase
            .from("opportunities")
            .insert({
              source_id: sourceId,
              slug,
              title: opp.title,
              organization: opp.organization,
              description: opp.description ?? null,
              opportunity_type: opp.opportunity_type,
              registration_opens: opp.registration_opens ?? null,
              registration_deadline: opp.registration_deadline,
              event_start_date: opp.event_start_date ?? null,
              event_end_date: opp.event_end_date ?? null,
              eligibility: opp.eligibility as unknown as Record<string, unknown>,
              country: opp.country,
              delivery_mode: opp.delivery_mode,
              source_url: url,
              application_url: opp.application_url ?? url,
              status: "pending_review",
            })
            .select("id")
            .single();

          if (insertError) {
            errors.push(`Insert failed for "${opp.title}": ${insertError.message}`);
            continue;
          }

          totalAdded++;

          await linkOpportunityToNodes(supabase, inserted.id, {
            title: opp.title,
            organization: opp.organization,
            description: opp.description,
            opportunity_type: opp.opportunity_type,
          });
        }
      } catch (err) {
        errors.push(`Failed to process ${url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await supabase.from("ingestion_logs").insert({
      source_id: sourceId,
      items_found: totalFound,
      items_added: totalAdded,
      errors,
    });

    await supabase
      .from("sources")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", sourceId);

    return NextResponse.json({
      ok: true,
      source: source.name,
      itemsFound: totalFound,
      itemsAdded: totalAdded,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { sourceId: string } }) {
  return GET(request, { params });
}
