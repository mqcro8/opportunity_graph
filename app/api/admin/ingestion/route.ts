import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { PAGE_SIZE } from "@/lib/constants";

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
      return NextResponse.json({ queue: [], total: 0, page, pageSize });
    }
  }

  let query = admin
    .from("opportunities")
    .select("id, title, organization, opportunity_type, status, created_at", {
      count: "exact",
    })
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
    queue: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}
