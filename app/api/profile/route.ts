import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: profileNodes } = await supabase
    .from("profile_nodes")
    .select("node_id, weight, source, graph_nodes(id, name, slug, type)")
    .eq("profile_id", user.id);

  return NextResponse.json({
    profile: profile ?? null,
    profileNodes: profileNodes ?? [],
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { full_name, current_grade, university_status, gpa, languages, goals, preferences, nodeIds } = body;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name,
      current_grade,
      university_status,
      gpa,
      languages: languages ?? [],
      goals: goals ?? [],
      preferences: preferences ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (Array.isArray(nodeIds)) {
    await supabase.from("profile_nodes").delete().eq("profile_id", user.id);

    if (nodeIds.length > 0) {
      const { error: nodesError } = await supabase.from("profile_nodes").insert(
        nodeIds.map((nodeId: string) => ({
          profile_id: user.id,
          node_id: nodeId,
          source: "user_input",
        }))
      );

      if (nodesError) {
        return NextResponse.json({ error: nodesError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
