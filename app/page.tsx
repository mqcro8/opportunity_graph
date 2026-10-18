import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LandingGraph } from "@/components/landing-graph";

export default function HomePage() {
  return (
    <div className="py-8 md:py-14">
      <div className="mx-auto flex flex-col gap-10 md:flex-row md:items-center md:gap-12">
        <div className="text-center md:flex-1 md:text-left">
          <h1 className="page-title-xl">Every match has a reason.</h1>
          <p className="page-lede mt-3 max-w-md">
            Opportunity graph ranks scholarships, hackathons, and research programs against your
            actual profile — and shows you exactly why each one matches.
          </p>
          <p className="page-lede mt-2 max-w-md">
            Find opportunities that fit your interests and skills without sorting through endless lists.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 md:justify-start">
            <Link href="/dashboard" className={buttonVariants({ variant: "accent", size: "lg" })}>
              See your matches →
            </Link>
          </div>
        </div>
        <div className="md:flex-1">
          <LandingGraph />
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-center font-display text-xl font-medium md:text-left">
          How it works
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">1. Profile</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us about your interests, skills, and goals.
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">2. Match</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Get ranked matches with scores against your profile.
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">3. Reason</p>
            <p className="mt-1 text-sm text-muted-foreground">
              See why each opportunity matches — no opaque AI ranking.
            </p>
          </div>
        </div>
      </section>

      <p className="mx-auto mt-10 max-w-md text-center text-xs leading-5 text-muted-foreground">
        Opportunity listings are gathered from public sources and may change.
        Always verify deadlines, eligibility, and application details on the
        official organizer&apos;s website before applying.
      </p>
    </div>
  );
}
