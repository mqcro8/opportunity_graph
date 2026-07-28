import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { opportunity_id, status } = body;

  if (!opportunity_id || !status) {
    return NextResponse.json(
      { error: "opportunity_id and status required" },
      { status: 400 }
    );
  }

  const validStatuses = [
    "viewed",
    "saved",
    "applied",
    "accepted",
    "rejected",
    "dismissed",
  ];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase.from("interactions").upsert(
    {
      profile_id: user.id,
      opportunity_id,
      status,
    },
    { onConflict: "profile_id,opportunity_id,status" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
