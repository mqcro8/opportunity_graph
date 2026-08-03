import Link from "next/link";
import { cn } from "@/lib/utils";

const pageLinkClass =
  "flex h-8 min-w-8 items-center justify-center rounded-md border border-border px-2 text-sm hover:border-foreground/30";

function pageItems(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  if (page > 3) items.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
    items.push(p);
  }
  if (page < totalPages - 2) items.push("…");
  items.push(totalPages);
  return items;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * (pageSize ?? 0) + 1;
  const to = Math.min(page * (pageSize ?? 0), total ?? 0);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {total ? (
        <p className="text-xs text-muted-foreground">
          {from}–{to} of {total}
        </p>
      ) : (
        <span />
      )}
      <nav className="flex items-center gap-1">
        {page > 1 && (
          <Link href={buildHref(page - 1)} className={pageLinkClass}>
            Prev
          </Link>
        )}
        {pageItems(page, totalPages).map((item, i) =>
          item === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-8 min-w-8 items-center justify-center text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Link
              key={item}
              href={buildHref(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                pageLinkClass,
                item === page && "border-foreground font-medium"
              )}
            >
              {item}
            </Link>
          )
        )}
        {page < totalPages && (
          <Link href={buildHref(page + 1)} className={pageLinkClass}>
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}
