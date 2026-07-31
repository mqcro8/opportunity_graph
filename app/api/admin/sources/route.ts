import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

const AdminSourceSchema = z.object({
  name: z.string().min(2),
  tier: z.number().int().min(1).max(3),
  base_url: z.string().url(),
  description: z.string().optional(),
  urls: z.array(z.string().url()).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = AdminSourceSchema.parse(await request.json());
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

  const { data: inserted, error } = await admin
    .from("sources")
    .insert({
      name: body.name,
      tier: body.tier,
      base_url: body.base_url,
      description: body.description ?? null,
      scrape_config: body.urls?.length ? { urls: body.urls } : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
