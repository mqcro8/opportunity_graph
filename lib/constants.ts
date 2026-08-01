import type { ScoreBreakdown } from "./types";

export const SCORE_MAX: ScoreBreakdown = {
  interest: 100,
  eligibility: 100,
  deadline: 100,
  experience: 100,
  popularity: 100,
};

export const OPPORTUNITY_TYPES = [
  "scholarship",
  "hackathon",
  "olympiad",
  "internship",
  "summer_program",
  "conference",
  "fellowship",
  "competition",
  "exchange",
  "certification",
  "grant",
] as const;

export const SOURCE_TIERS = [1, 2, 3] as const;

export const PAGE_SIZE = 10;
