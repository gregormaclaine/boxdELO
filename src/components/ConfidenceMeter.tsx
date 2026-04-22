import type { ConfidenceInfo } from "@/types/domain";

interface ConfidenceMeterProps {
  confidence: ConfidenceInfo;
}

function barColorClass(pct: number): string {
  if (pct < 30) return "bg-text-muted";
  if (pct < 70) return "bg-warning";
  return "bg-success";
}

export default function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const { percentage, label, total_comparisons, target_comparisons } = confidence;
  const barColor = barColorClass(percentage);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-text-muted">
          {label} &middot;{" "}
          <span className="text-text-primary font-medium">{total_comparisons}</span>
          {target_comparisons > 0 && (
            <span className="text-text-muted">/{target_comparisons} comparisons</span>
          )}
        </span>
        <span className="text-text-primary font-semibold tabular-nums">
          {percentage}%
        </span>
      </div>
      <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
