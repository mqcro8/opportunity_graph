import { IngestionQueue } from "./ingestion-queue";

export default function AdminIngestionPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; tag?: string; page?: string };
}) {
  return <IngestionQueue searchParams={searchParams} />;
}
