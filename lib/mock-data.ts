// Stand-in for a Supabase-backed getRecommendations(profileId) call.
// Swap this module out once Section 3 of the architecture plan is wired up —
// nothing in app/ should need to change shape when that happens.

import { ScoredOpportunity } from "./types";

export const mockRecommendations: ScoredOpportunity[] = [
  {
    opportunity: {
      id: "1",
      slug: "first-robotics-world-championship",
      title: "First robotics world championship",
      organization: "FIRST",
      description:
        "An international robotics competition for high school teams, culminating in a world championship event.",
      opportunityType: "competition",
      applicationDeadline: "2026-07-25",
      country: "United States",
      deliveryMode: "in_person",
      sourceUrl: "https://firstinspires.org",
      applicationUrl: "https://firstinspires.org/apply",
      status: "verified",
    },
    score: 92,
    breakdown: { interest: 36, eligibility: 25, deadline: 12, experience: 9, popularity: 10 },
    matchedNodes: ["Robotics", "Engineering"],
    explanation:
      "Because you have FTC robotics experience and this competition accepts applicants from Mexico.",
  },
  {
    opportunity: {
      id: "2",
      slug: "fulbright-garcia-robles-scholarship",
      title: "Fulbright-García Robles scholarship",
      organization: "Fulbright",
      description: "A binational scholarship funding graduate study and research in the United States.",
      opportunityType: "scholarship",
      applicationDeadline: "2026-08-27",
      country: "Mexico",
      deliveryMode: "hybrid",
      sourceUrl: "https://fulbright-garciarobles.org.mx",
      applicationUrl: "https://fulbright-garciarobles.org.mx/apply",
      status: "verified",
    },
    score: 78,
    breakdown: { interest: 28, eligibility: 25, deadline: 10, experience: 7, popularity: 8 },
    matchedNodes: ["Study abroad", "Research"],
    explanation: "Because you're interested in research and speak English and Spanish.",
  },
  {
    opportunity: {
      id: "3",
      slug: "mit-beaver-works-summer-institute",
      title: "MIT Beaver Works summer institute",
      organization: "MIT",
      description: "A residential summer program in applied engineering and AI for high school students.",
      opportunityType: "summer_program",
      applicationDeadline: "2026-10-13",
      country: "United States",
      deliveryMode: "in_person",
      sourceUrl: "https://beaverworks.ll.mit.edu",
      applicationUrl: "https://beaverworks.ll.mit.edu/apply",
      status: "verified",
    },
    score: 71,
    breakdown: { interest: 30, eligibility: 20, deadline: 6, experience: 6, popularity: 9 },
    matchedNodes: ["AI", "Computer science"],
    explanation: "Because you're interested in AI and this program accepts high school applicants.",
  },
];

export function getRecommendationBySlug(slug: string): ScoredOpportunity | undefined {
  return mockRecommendations.find((r) => r.opportunity.slug === slug);
}
