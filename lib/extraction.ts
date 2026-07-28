import { z } from "zod";

export const ExtractedOpportunity = z.object({
  title: z.string().min(3),
  organization: z.string().min(2),
  opportunity_type: z.enum([
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
  ]),
  application_deadline: z.string().date().nullable(),
  eligibility: z.object({
    min_grade: z.string().nullable(),
    max_grade: z.string().nullable(),
    countries: z.array(z.string()),
    age_min: z.number().nullable(),
    age_max: z.number().nullable(),
  }),
  country: z.string().nullable(),
  delivery_mode: z.enum(["online", "in_person", "hybrid"]).nullable(),
  application_url: z.string().url(),
});

export type ExtractedOpportunity = z.infer<typeof ExtractedOpportunity>;
