import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const adminEmail = process.env.ADMIN_EMAIL;

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!adminEmail || user.email !== adminEmail) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, user };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(adminEmail && email && email === adminEmail);
}
