const CONFIDENCE_THRESHOLD = 30;

export function suggestStars(
  rank: number,
  totalRanked: number,
  confidencePercent: number
): number | null {
  if (confidencePercent < CONFIDENCE_THRESHOLD || totalRanked < 2) return null;
  // rank 1 = best (5 stars), rank N = worst (0.5 stars)
  const percentile = 1 - (rank - 1) / (totalRanked - 1);
  const raw = percentile * 4.5 + 0.5;
  return Math.round(raw * 2) / 2;
}

export function starsToLabel(stars: number): string {
  const labels: Record<number, string> = {
    0.5: "½",
    1: "★",
    1.5: "★½",
    2: "★★",
    2.5: "★★½",
    3: "★★★",
    3.5: "★★★½",
    4: "★★★★",
    4.5: "★★★★½",
    5: "★★★★★",
  };
  return labels[stars] ?? `${stars}`;
}
