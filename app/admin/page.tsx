import Link from "next/link";
import { Card } from "@/components/ui/card";

const LINKS = [
  {
    href: "/admin/ingestion",
    title: "Review queue",
    description: "Approve or reject AI-extracted opportunities.",
  },
  {
    href: "/admin/opportunities/new",
    title: "Add opportunity",
    description: "Manually add a verified opportunity with auto-linked matches.",
  },
  {
    href: "/admin/sources/new",
    title: "Add source",
    description: "Register an official website to ingest from.",
  },
];

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage opportunities, sources, and ingestion.
      </p>
      <div className="mt-6 space-y-3">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <Card className="p-4 transition-colors hover:border-foreground/30">
              <p className="font-medium">{link.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {link.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
