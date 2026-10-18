export function GraphMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      role="img"
      aria-label="Opportunity graph mark"
    >
      <title>Opportunity graph</title>
      <g>
        <circle cx="12" cy="12" r="2" className="fill-accent" />
        <circle cx="5" cy="6" r="1.75" className="fill-accent-muted-foreground" />
        <circle cx="19" cy="7" r="1.75" className="fill-accent-muted-foreground" />
        <circle cx="12" cy="19" r="1.75" className="fill-accent-muted-foreground" />
        <path
          d="M12 12 5 6M12 12 19 7M12 12V19"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="stroke-accent/40"
        />
      </g>
    </svg>
  );
}
