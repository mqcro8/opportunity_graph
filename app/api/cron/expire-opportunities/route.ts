import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function verifyCron(request: Request): boolean {
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("cron_secret");
  const headerSecret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;

  if (isVercelCron) return true;
  if (!expected) return true;
  return querySecret === expected || headerSecret === expected;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("opportunities")
    .update({ status: "archived", last_verified_at: new Date().toISOString() })
    .eq("status", "verified")
    .or("registration_deadline.lt.now,event_end_date.lt.now")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, archived: data?.length ?? 0 });
}

export async function POST(request: Request) {
  return GET(request);
}
