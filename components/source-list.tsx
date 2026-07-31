import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface DirectorySource {
  name: string;
  tier: number;
  base_url: string;
  description: string | null;
  last_run_at: string | null;
}

export function SourceList({ sources }: { sources: DirectorySource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 divide-y divide-border border-t border-border">
      {sources.map((source) => (
        <div key={source.name} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <a
                href={source.base_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium hover:underline"
              >
                {source.name}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              {source.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {source.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="muted">Tier {source.tier}</Badge>
              <p className="text-xs text-muted-foreground">
                {formatDate(source.last_run_at)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
