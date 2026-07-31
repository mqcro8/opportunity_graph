import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GOAL_NODE_MAP } from "@/lib/linking";

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
  const { display_name, current_grade, gpa, languages, goals, preferences, interests } = body;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name,
      current_grade,
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

  const selectedInterests = body.interests ?? [];
  const selectedLanguages = body.languages ?? [];
  const selectedGoals = body.goals ?? [];

  const { data: byNameNodes, error: graphError } = await supabase
    .from("graph_nodes")
    .select("id, name")
    .in("name", [...selectedInterests, ...selectedLanguages]);

  const goalSlugs = [...new Set(selectedGoals.flatMap((g: string) => GOAL_NODE_MAP[g] ?? []))];
  const { data: goalNodes } = goalSlugs.length > 0
    ? await supabase.from("graph_nodes").select("id, name").in("slug", goalSlugs)
    : { data: [] };

  if (graphError) {
    return NextResponse.json({ error: graphError.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const matchedNodes = [...(byNameNodes ?? []), ...(goalNodes ?? [])].filter(
    (n) => (seen.has(n.id) ? false : (seen.add(n.id), true))
  );

  const { error: deleteError } = await supabase
    .from("profile_nodes")
    .delete()
    .eq("profile_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (matchedNodes.length > 0) {
    const { error: nodesError } = await supabase.from("profile_nodes").insert(
      matchedNodes.map((node) => ({
        profile_id: user.id,
        node_id: node.id,
        source: "user_input",
      }))
    );

    if (nodesError) {
      return NextResponse.json({ error: nodesError.message }, { status: 500 });
    }
  }

  const matchedNames = matchedNodes.map((n) => n.name);
  const byNameMatched = new Set((byNameNodes ?? []).map((n) => n.name));
  const unmatchedNames = [...selectedInterests, ...selectedLanguages].filter(
    (n) => !byNameMatched.has(n)
  );

  return NextResponse.json({
    ok: true,
    nodeNames: [...selectedInterests, ...selectedLanguages, ...selectedGoals],
    matchedCount: matchedNodes.length,
    matchedNames,
    unmatchedNames,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
