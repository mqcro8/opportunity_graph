import { OpportunitiesList } from "./opportunities-list";

export default function AdminOpportunitiesPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; tag?: string; page?: string };
}) {
  return <OpportunitiesList searchParams={searchParams} />;
}
