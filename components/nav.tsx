"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/db";
import { ThemeToggle } from "@/components/theme-toggle";
import { GraphMark } from "@/components/graph-mark";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; displayName: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setUser(null);
        return;
      }

      let displayName: string | null = null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.display_name) {
        displayName = profile.display_name as string;
      }

      setUser({ email: data.user.email ?? "", displayName });
    });
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <GraphMark />
          <span>Opportunity graph</span>
        </Link>
        <nav className="flex items-center gap-6">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground focus-ring rounded"
              >
                Matches
              </Link>
              <Link
                href="/profile"
                className="text-sm text-muted-foreground hover:text-foreground focus-ring rounded"
              >
                Profile
              </Link>
              <span className="text-xs text-muted-foreground">
                {user.displayName ?? user.email}
              </span>
              <button
                onClick={handleLogout}
                className="focus-ring rounded text-sm text-muted-foreground hover:text-foreground"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground focus-ring rounded"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
