import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";

const NODE_TYPES = [
  "skill",
  "interest",
  "field",
  "university",
  "category",
  "language",
  "region",
  "age_group",
  "audience",
] as const;

const CreateNodeSchema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(NODE_TYPES),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("graph_nodes")
    .select("id, name, slug, type")
    .order("type")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped: Record<string, { id: string; name: string; slug: string }[]> = {};
  for (const node of data ?? []) {
    (grouped[node.type] ??= []).push({ id: node.id, name: node.name, slug: node.slug });
  }

  return NextResponse.json({ nodes: data ?? [], grouped });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = CreateNodeSchema.parse(await request.json());
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
  const slug = slugify(body.name);

  const { data: existing } = await admin
    .from("graph_nodes")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Tag "${body.name}" already exists as "${existing.name}".` },
      { status: 409 }
    );
  }

  const { data: inserted, error } = await admin
    .from("graph_nodes")
    .insert({ name: body.name, slug, type: body.type })
    .select("id, name, slug, type")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, node: inserted }, { status: 201 });
}
