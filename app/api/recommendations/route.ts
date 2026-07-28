import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecommendations } from "@/lib/recommendations";
import { EmptyProfileError } from "@/lib/errors";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const recommendations = await getRecommendations(user.id);
    return NextResponse.json({ recommendations });
  } catch (error) {
    if (error instanceof EmptyProfileError) {
      return NextResponse.json(
        { error: "empty_profile", message: error.message },
        { status: 422 }
      );
    }
    throw error;
  }
}
