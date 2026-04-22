import { starsToLabel } from "@/lib/stars";

interface StarBadgeProps {
  stars: number;
  className?: string;
}

export default function StarBadge({ stars, className = "" }: StarBadgeProps) {
  return (
    <span
      className={`text-accent font-medium tracking-tight tabular-nums ${className}`}
      title={`${stars} stars`}
    >
      {starsToLabel(stars)}
    </span>
  );
}
