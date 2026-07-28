import type { ScoredOpportunity } from "./types";

export function explain(rec: ScoredOpportunity): string {
  const nodes = rec.matchedNodes.join(", ");
  return (
    `Because you're interested in ${nodes}, and this ${rec.opportunity.opportunityType.replace("_", " ")}` +
    ` accepts applicants matching your profile.`
  );
}
