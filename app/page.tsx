import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="py-12">
      <div className="mx-auto mb-10 max-w-xs">
        <svg viewBox="0 0 320 200" className="w-full" aria-hidden="true">
          <line x1="160" y1="100" x2="60" y2="40" stroke="#bfdbfe" strokeWidth="1.5" />
          <line x1="160" y1="100" x2="280" y2="50" stroke="#bfdbfe" strokeWidth="1.5" />
          <line x1="160" y1="100" x2="160" y2="180" stroke="#bfdbfe" strokeWidth="1.5" />
          <circle cx="60" cy="40" r="26" fill="#eff6ff" stroke="#93c5fd" />
          <text x="60" y="44" textAnchor="middle" fontSize="10" fill="#1d4ed8">
            Robotics
          </text>
          <circle cx="280" cy="50" r="26" fill="#eff6ff" stroke="#93c5fd" />
          <text x="280" y="54" textAnchor="middle" fontSize="10" fill="#1d4ed8">
            Research
          </text>
          <circle cx="160" cy="180" r="30" fill="#eff6ff" stroke="#93c5fd" />
          <text x="160" y="184" textAnchor="middle" fontSize="10" fill="#1d4ed8">
            Scholarships
          </text>
          <circle cx="160" cy="100" r="30" fill="#2563eb" />
          <text x="160" y="104" textAnchor="middle" fontSize="11" fill="white">
            You
          </text>
        </svg>
      </div>
      <div className="text-center">
        <h1 className="mx-auto mb-3 max-w-lg font-display text-4xl font-normal leading-tight">
          Every match has a reason.
        </h1>
        <p className="mx-auto mb-8 max-w-md text-muted-foreground">
          Opportunity graph ranks scholarships, hackathons, and research programs against your
          actual profile — and shows you exactly why each one made the list.
        </p>
        <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
          See your matches →
        </Link>
      </div>
    </div>
  );
}
