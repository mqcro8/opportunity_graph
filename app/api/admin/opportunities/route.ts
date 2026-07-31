import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { linkOpportunityToNodes } from "@/lib/linking";
import { slugify } from "@/lib/utils";

const AdminOpportunitySchema = z.object({
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
});

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
      application_deadline: body.application_deadline ?? null,
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

  const linkedNodes = await linkOpportunityToNodes(admin, inserted.id, {
    title: body.title,
    organization: body.organization,
    description: body.description,
    opportunity_type: body.opportunity_type,
  });

  return NextResponse.json({ ok: true, id: inserted.id, slug, linkedNodes });
}
