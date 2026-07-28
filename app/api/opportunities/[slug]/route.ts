import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = await createClient();
  const { slug } = await params;

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("slug", slug)
    .eq("status", "verified")
    .single();

  if (error || !opportunity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: oppNodes } = await supabase
    .from("opportunity_nodes")
    .select("relevance, graph_nodes(name, slug)")
    .eq("opportunity_id", opportunity.id);

  const matchedNodes = (oppNodes ?? [])
    .map((on) => {
      const gn = on.graph_nodes as unknown as { name: string };
      return gn?.name;
    })
    .filter(Boolean) as string[];

  return NextResponse.json({ opportunity, matchedNodes });
}
