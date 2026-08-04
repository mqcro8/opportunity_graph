import type { ScoredOpportunity } from "./types";

export function explain(rec: ScoredOpportunity): string {
  const nodes = rec.matchedNodes.join(", ");
  const type = rec.opportunity.opportunityType.replace("_", " ");
  if (!nodes) {
    return `This ${type} is available for applicants matching your profile.`;
  }
  return (
    `Because you're interested in ${nodes}, and this ${type}` +
    ` accepts applicants matching your profile.`
  );
}
