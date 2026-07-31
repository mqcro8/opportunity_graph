import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SourceList, type DirectorySource } from "@/components/source-list";

export { type DirectorySource } from "@/components/source-list";

export function SourceDirectory({
  sources,
  showFullListLink = false,
}: {
  sources: DirectorySource[];
  showFullListLink?: boolean;
}) {
  if (sources.length === 0) return null;

  return (
    <Card className="mt-8 p-5">
      <h2 className="text-lg font-medium">
        Don&apos;t see what you&apos;re looking for? Browse these official
        directories directly.
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Opportunities are verified manually before they appear here. For the
        full list, check the source sites.
      </p>
      <SourceList sources={sources} />
      {showFullListLink && (
        <div className="mt-4 border-t border-border pt-3">
          <Link href="/sources" className="text-sm font-medium hover:underline">
            View the full list of sources →
          </Link>
        </div>
      )}
    </Card>
  );
}
