export function LandingGraph() {
  return (
    <svg
      viewBox="0 0 480 280"
      className="w-full"
      role="img"
      aria-label="Opportunity Graph illustrates student profile leading to interests and to relevant opportunity categories"
    >
      <title>
        Student matched via interests to relevant opportunities
      </title>

      {/* Connections */}
      <g strokeWidth="1.5">
        <path
          d="M240 140 140 70M240 140 340 80M240 140 240 200"
          className="stroke-accent/40"
          strokeLinecap="round"
        />
        <path
          d="M140 70 90 30M140 70 200 30M340 80 300 40M340 80 380 40M240 200 190 240M240 200 290 240"
          className="stroke-border"
          strokeLinecap="round"
        />
      </g>

      {/* Category nodes */}
      <g>
        <circle cx="90" cy="30" r="16" className="fill-accent-muted" />
        <text x="90" y="33" textAnchor="middle" fontSize="8" className="fill-accent-muted-foreground">
          Scholarships
        </text>
      </g>
      <g>
        <circle cx="200" cy="30" r="16" className="fill-accent-muted" />
        <text x="200" y="33" textAnchor="middle" fontSize="8" className="fill-accent-muted-foreground">
          Hackathons
        </text>
      </g>
      <g>
        <circle cx="300" cy="40" r="16" className="fill-accent-muted" />
        <text x="300" y="43" textAnchor="middle" fontSize="8" className="fill-accent-muted-foreground">
          Research
        </text>
      </g>
      <g>
        <circle cx="380" cy="40" r="16" className="fill-accent-muted" />
        <text x="380" y="43" textAnchor="middle" fontSize="8" className="fill-accent-muted-foreground">
          Competitions
        </text>
      </g>
      <g>
        <circle cx="190" cy="240" r="16" className="fill-accent-muted" />
        <text x="190" y="243" textAnchor="middle" fontSize="8" className="fill-accent-muted-foreground">
          Fellowships
        </text>
      </g>
      <g>
        <circle cx="290" cy="240" r="16" className="fill-accent-muted" />
        <text x="290" y="243" textAnchor="middle" fontSize="8" className="fill-accent-muted-foreground">
          Internships
        </text>
      </g>

      {/* Interest nodes */}
      <g>
        <circle cx="140" cy="70" r="18" className="fill-secondary stroke-border" strokeWidth="1.5" />
        <text x="140" y="72" textAnchor="middle" fontSize="8" className="fill-foreground">
          AI
        </text>
      </g>
      <g>
        <circle cx="340" cy="80" r="18" className="fill-secondary stroke-border" strokeWidth="1.5" />
        <text x="340" y="82" textAnchor="middle" fontSize="8" className="fill-foreground">
          Research
        </text>
      </g>
      <g>
        <circle cx="240" cy="200" r="18" className="fill-secondary stroke-border" strokeWidth="1.5" />
        <text x="240" y="202" textAnchor="middle" fontSize="8" className="fill-foreground">
          Robotics
        </text>
      </g>

      {/* You */}
      <g>
        <circle cx="240" cy="140" r="24" className="fill-accent" />
        <text x="240" y="143" textAnchor="middle" fontSize="10" className="fill-accent-foreground">
          You
        </text>
      </g>
    </svg>
  );
}