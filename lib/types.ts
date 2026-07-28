// Mirrors the Postgres schema in opportunity-graph-architecture-plan.md, Section 2.

export type OpportunityType =
  | "scholarship"
  | "hackathon"
  | "olympiad"
  | "internship"
  | "summer_program"
  | "conference"
  | "fellowship"
  | "competition"
  | "exchange"
  | "certification"
  | "grant";

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  organization: string;
  description: string;
  opportunityType: OpportunityType;
  applicationDeadline: string | null; // ISO date
  country: string | null;
  deliveryMode: "online" | "in_person" | "hybrid" | null;
  sourceUrl: string;
  applicationUrl: string;
  status: "pending_review" | "verified" | "archived";
}

// Keys match the WEIGHTS keys in lib/recommendations.ts exactly —
// one shape, used by both the scoring function and the UI.
export interface ScoreBreakdown {
  interest: number;
  eligibility: number;
  deadline: number;
  experience: number;
  popularity: number;
}

export interface ScoredOpportunity {
  opportunity: Opportunity;
  score: number; // 0-100
  breakdown: ScoreBreakdown;
  matchedNodes: string[];
  explanation: string;
}
