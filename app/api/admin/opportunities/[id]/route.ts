import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { linkOpportunityToNodes, suggestNodeSlugs } from "@/lib/linking";
import { slugify } from "@/lib/utils";

const StatusSchema = z.object({
  status: z.enum(["verified", "archived"]),
});

const UpdateSchema = z.object({
  title: z.string().min(3),
  organization: z.string().min(2),
  description: z.string().optional(),
  opportunity_type: z.enum([
    "scholarship",
    "hackathon",
    "olympiad",
    "internship",
    "summer_program",
    "conference",
    "fellowship",
    "competition",
    "exchange",
    "certification",
    "grant",
  ]),
  application_deadline: z.string().date().nullable().optional(),
  country: z.string().nullable().optional(),
  delivery_mode: z.enum(["online", "in_person", "hybrid"]).nullable().optional(),
  application_url: z.string().url().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  education_level: z.array(z.string()).optional(),
  eligibility: z
    .object({
      min_grade: z.string().nullable().optional(),
      max_grade: z.string().nullable().optional(),
      countries: z.array(z.string()).optional(),
      age_min: z.number().nullable().optional(),
      age_max: z.number().nullable().optional(),
    })
    .optional(),
  // Graph node slugs the admin explicitly tagged. When present these are
  // authoritative for linking (plus the category hub is always added).
  tags: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: opportunity, error } = await admin
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!opportunity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: links } = await admin
    .from("opportunity_nodes")
    .select("graph_nodes(slug, name)")
    .eq("opportunity_id", id);

  const tags = (links ?? [])
    .map((l) => {
      const gn = l.graph_nodes as unknown as { slug: string } | null;
      return gn?.slug;
    })
    .filter((s): s is string => Boolean(s));

  return NextResponse.json({ opportunity, tags });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body;
  try {
    body = StatusSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("opportunities")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await admin
    .from("opportunities")
    .update({
      status: body.status,
      last_verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, status: body.status });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body;
  try {
    body = UpdateSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("opportunities")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slug = slugify(body.title);

  const { data: slugOwner } = await admin
    .from("opportunities")
    .select("id, title")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (slugOwner) {
    return NextResponse.json(
      {
        error: `Slug "${slug}" already exists for "${slugOwner.title}".`,
      },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin
    .from("opportunities")
    .update({
      slug,
      title: body.title,
      organization: body.organization,
      description: body.description ?? null,
      opportunity_type: body.opportunity_type,
      application_deadline: body.application_deadline ?? null,
      country: body.country ?? null,
      delivery_mode: body.delivery_mode ?? null,
      education_level: body.education_level ?? [],
      source_url: body.source_url ?? body.application_url ?? "",
      application_url: body.application_url ?? null,
      eligibility: body.eligibility ?? {},
      last_verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: deleteError } = await admin
    .from("opportunity_nodes")
    .delete()
    .eq("opportunity_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const explicitSlugs =
    body.tags && body.tags.length > 0
      ? body.tags
      : suggestNodeSlugs({
          title: body.title,
          organization: body.organization,
          description: body.description,
          opportunity_type: body.opportunity_type,
        });

  const linkedNodes = await linkOpportunityToNodes(
    admin,
    id,
    {
      title: body.title,
      organization: body.organization,
      description: body.description,
      opportunity_type: body.opportunity_type,
    },
    explicitSlugs
  );

  return NextResponse.json({ ok: true, id, slug, linkedNodes });
}
