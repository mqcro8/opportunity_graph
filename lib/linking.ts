import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpportunityType } from "@/lib/types";

// Every opportunity_type maps to a category hub node. This is the guarantee
// that an opportunity is reachable from the matching profile goal even when
// the title/description text matches nothing else.
export const CATEGORY_SLUG: Record<OpportunityType, string> = {
  scholarship: "scholarships",
  hackathon: "hackathons",
  olympiad: "olympiads",
  internship: "internships",
  summer_program: "summer-programs",
  conference: "conferences",
  fellowship: "fellowships",
  competition: "competitions",
  exchange: "exchanges",
  certification: "certifications",
  grant: "grants",
};

// Default graph nodes per opportunity type — category hub always first,
// followed by nodes the type is broadly associated with.
export const TYPE_DEFAULT_NODES: Record<OpportunityType, string[]> = {
  hackathon: ["hackathons", "python", "javascript", "web-development", "computer-science"],
  scholarship: ["scholarships"],
  olympiad: ["olympiads", "research"],
  internship: ["internships"],
  summer_program: ["summer-programs"],
  conference: ["conferences", "research"],
  fellowship: ["fellowships", "research"],
  competition: ["competitions"],
  exchange: ["exchanges"],
  certification: ["certifications"],
  grant: ["grants", "research"],
};

// Keyword map for matching free text (title + organization + description)
// against graph nodes. Word-boundary aware so "web" doesn't match "webinar".
// Keep in sync with graph_nodes.slug values.
export const NODE_KEYWORDS: Record<string, string[]> = {
  python: ["python"],
  javascript: ["javascript", " js", "react", "node.js", "nodejs", "typescript"],
  "machine-learning": ["machine learning", "deep learning", "neural network", "tensorflow", "pytorch"],
  "web-development": ["web development", "web design", "frontend", "front-end", "backend", "back-end", "full-stack", "fullstack", "html", "css", "website"],
  "data-analysis": ["data analysis", "data science", "analytics", "dataset", "database", "visualization"],
  robotics: ["robotics", "robot", "automation", "drone"],
  "public-speaking": ["public speaking", "debate", "speech"],
  "technical-writing": ["technical writing", "journalism", "blog", "author"],
  research: ["research", "science fair", "investigation", "study"],
  "artificial-intelligence": ["artificial intelligence", " ai ", "llm", "computer vision", "nlp"],
  "climate-science": ["climate", "sustainability", "renewable", "green energy"],
  "biomedical-engineering": ["biomedical", "bioengineering", "biotech", "medical device"],
  entrepreneurship: ["entrepreneurship", "startup", "start-up", "venture", "founder", "pitch", "business plan"],
  "social-impact": ["social impact", "nonprofit", "non-profit", "public service", "community service"],
  "space-exploration": ["space", "nasa", "aerospace", "astronomy", "rocket", "satellite"],
  "computer-science": ["computer science", "computer-science", "programming", "software", "coding"],
  engineering: ["engineering"],
  "environmental-science": ["environmental science", "ecology", "environment"],
  business: ["business", "marketing", "finance", "management"],
  medicine: ["medicine", "medical", "health"],
  math: ["math", "mathematics", "maths", "calculus", "algebra", "geometry"],
  physics: ["physics", "quantum", "mechanics", "optics"],
  chemistry: ["chemistry", "chemical"],
  biology: ["biology", "biotechnology", "genetics"],
  economics: ["economics", "economy", "financial", "finance"],
  history: ["history", "historical"],
  writing: ["writing", "essay", "poetry", "creative writing", "author"],
  debate: ["debate", "moot court", "model un", "oratory"],
  design: ["design", "ui", "ux", "graphic design", "illustration", "animation"],
  leadership: ["leadership", "student council", "community leader"],
  music: ["music", "orchestra", "choir", "instrument"],
  "art-design": ["art", "fine arts", "visual arts", "creative"],
  literature: ["literature", "literary", "novel", "book"],
  mit: ["mit", "massachusetts institute of technology"],
  stanford: ["stanford"],
  "georgia-tech": ["georgia tech", "georgia-tech"],
  "latin-america": ["latin america", "latin american"],
  "north-america": ["north america"],
  global: ["global", "worldwide", "international"],
};

// Profile goals -> graph node slugs. Goals are opportunity-category interests,
// so they resolve to the same hub nodes the TYPE_DEFAULT_NODES map to.
export const GOAL_NODE_MAP: Record<string, string[]> = {
  "Get a scholarship": ["scholarships"],
  "Join a hackathon": ["hackathons", "python", "javascript", "web-development", "computer-science"],
  "Find a summer program": ["summer-programs"],
  "Compete in an olympiad": ["olympiads", "research"],
  "Compete in a competition": ["competitions"],
  "Get an internship": ["internships"],
  "Get a fellowship": ["fellowships", "research"],
  "Find a conference": ["conferences", "research"],
  "Earn a certification": ["certifications"],
  "Get a grant": ["grants", "research"],
  "Study abroad": ["exchanges"],
  "Do research": ["research"],
  "Start a company": ["entrepreneurship", "business"],
};

function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(lower);
  });
}

export interface OpportunityLinkFields {
  title: string;
  organization: string;
  description?: string;
  opportunity_type: OpportunityType;
}

// Pure auto-link suggestions: category default nodes plus any graph nodes
// matched from the opportunity's text via NODE_KEYWORDS.
export function suggestNodeSlugs(fields: OpportunityLinkFields): string[] {
  const slugs = new Set<string>(TYPE_DEFAULT_NODES[fields.opportunity_type]);

  const text = [fields.title, fields.organization, fields.description ?? ""].join(" ");
  for (const [slug, keywords] of Object.entries(NODE_KEYWORDS)) {
    if (matchesAnyKeyword(text, keywords)) slugs.add(slug);
  }

  return [...slugs];
}

// Links an opportunity to graph nodes. When explicitSlugs is provided it is
// authoritative — the opportunity gets exactly those nodes plus its category
// hub, so admins can hand-tag. Without it, auto-link suggestions are used
// (the ingestion pipeline path). Inserts are idempotent. Returns the names
// of the linked nodes for display in UIs.
export async function linkOpportunityToNodes(
  admin: SupabaseClient,
  opportunityId: string,
  fields: OpportunityLinkFields,
  explicitSlugs?: string[]
): Promise<string[]> {
  const slugs = new Set<string>(explicitSlugs ?? suggestNodeSlugs(fields));
  slugs.add(CATEGORY_SLUG[fields.opportunity_type]);

  if (slugs.size === 0) return [];

  const { data: nodes } = await admin
    .from("graph_nodes")
    .select("id, slug, name")
    .in("slug", [...slugs]);

  if (!nodes || nodes.length === 0) return [];

  const { error } = await admin.from("opportunity_nodes").upsert(
    nodes.map((node) => ({
      opportunity_id: opportunityId,
      node_id: node.id,
      relevance: 0.8,
    })),
    { onConflict: "opportunity_id,node_id", ignoreDuplicates: true }
  );

  if (error) throw error;

  return nodes.map((node) => node.name);
}
