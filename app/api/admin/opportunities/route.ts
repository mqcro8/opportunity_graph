import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { linkOpportunityToNodes } from "@/lib/linking";
import { slugify } from "@/lib/utils";
import { OPPORTUNITY_TYPES, PAGE_SIZE } from "@/lib/constants";

const AdminOpportunitySchema = z.object({
  title: z.string().min(3),
  organization: z.string().min(2),
  description: z.string().optional(),
  opportunity_type: z.enum(OPPORTUNITY_TYPES),
  registration_opens: z.string().date().nullable().optional(),
  registration_deadline: z.string().date().nullable().optional(),
  event_start_date: z.string().date().nullable().optional(),
  event_end_date: z.string().date().nullable().optional(),
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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1
  );
  const pageSize = Math.max(
    1,
    Number.parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE), 10) ||
      PAGE_SIZE
  );

  let ids: string[] | null = null;
  if (tag) {
    const { data: node } = await admin
      .from("graph_nodes")
      .select("id")
      .eq("slug", tag)
      .maybeSingle();

    if (node) {
      const { data: links } = await admin
        .from("opportunity_nodes")
        .select("opportunity_id")
        .eq("node_id", node.id);
      ids = (links ?? []).map((l) => l.opportunity_id);
    }

    if (!node || !ids || ids.length === 0) {
      return NextResponse.json({ opportunities: [], total: 0, page, pageSize });
    }
  }

  let query = admin
    .from("opportunities")
    .select(
      "id, slug, title, organization, opportunity_type, status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("opportunity_type", type);
  if (ids) query = query.in("id", ids);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    opportunities: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = AdminOpportunitySchema.parse(await request.json());
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
  const slug = slugify(body.title);

  const { data: existing } = await admin
    .from("opportunities")
    .select("id, title")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: `Slug "${slug}" already exists for "${existing.title}".`,
      },
      { status: 409 }
    );
  }

  const { data: inserted, error } = await admin
    .from("opportunities")
    .insert({
      slug,
      title: body.title,
      organization: body.organization,
      description: body.description ?? null,
      opportunity_type: body.opportunity_type,
      registration_opens: body.registration_opens ?? null,
      registration_deadline: body.registration_deadline ?? null,
      event_start_date: body.event_start_date ?? null,
      event_end_date: body.event_end_date ?? null,
      country: body.country ?? null,
      delivery_mode: body.delivery_mode ?? null,
      education_level: body.education_level ?? [],
      source_url: body.source_url ?? body.application_url ?? "",
      application_url: body.application_url ?? null,
      eligibility: body.eligibility ?? {},
      status: "verified",
      last_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const linkedNodes = await linkOpportunityToNodes(
    admin,
    inserted.id,
    {
      title: body.title,
      organization: body.organization,
      description: body.description,
      opportunity_type: body.opportunity_type,
    },
    body.tags
  );

  return NextResponse.json({ ok: true, id: inserted.id, slug, linkedNodes });
}
