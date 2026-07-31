import { z } from "zod";

export const ExtractedOpportunity = z.object({
  title: z.string().min(3),
  organization: z.string().min(2),
  description: z.string().optional(),
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

const GEMINI_MODEL = "gemini-2.5-flash";

function buildPrompt(pageTitle: string, pageContent: string): string {
  return `You are an extraction assistant for an educational opportunity database.
Given the content of a web page, extract ALL educational opportunities listed on it.

For each opportunity, return a JSON object with these fields:
- title (string, min 3 chars): the name of the opportunity
- organization (string, min 2 chars): the organization offering it
- description (string, optional): a short summary of what the opportunity is about
- opportunity_type: one of "scholarship", "hackathon", "olympiad", "internship", "summer_program", "conference", "fellowship", "competition", "exchange", "certification", "grant"
- application_deadline (ISO date string or null): the deadline in YYYY-MM-DD format, or null if unknown
- eligibility (object with): min_grade (string or null), max_grade (string or null), countries (array of strings, use ["*"] if global), age_min (number or null), age_max (number or null)
- country (string or null): where the opportunity takes place
- delivery_mode: "online", "in_person", "hybrid", or null
- application_url (string, valid URL): the direct link to apply

Return a JSON array of opportunities. If none are found, return an empty array.
Only include real, verifiable opportunities. Do not invent data.

Page title: ${pageTitle}

Page content:
${pageContent.slice(0, 30000)}`;
}

export async function extractFromUrl(url: string): Promise<ExtractedOpportunity[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OpportunityGraph/1.0)" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  return extractFromHtml(url, html);
}

export async function extractFromHtml(
  pageTitle: string,
  html: string
): Promise<ExtractedOpportunity[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = buildPrompt(pageTitle, html);

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text().catch(() => "unknown");
    throw new Error(`Gemini API error ${geminiRes.status}: ${errBody}`);
  }

  const data = await geminiRes.json();

  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${rawText.slice(0, 200)}`);
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const results: ExtractedOpportunity[] = [];

  for (const item of arr) {
    const result = ExtractedOpportunity.safeParse(item);
    if (result.success) {
      results.push(result.data);
    }
  }

  return results;
}
