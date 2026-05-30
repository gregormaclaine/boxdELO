const CONFIDENCE_THRESHOLD = 30;

export type StarDivider = {
  movieId: string; // user_movie_id of the LAST movie in this tier
  stars: number;   // star rating for this tier (0.5–5)
};

// Sorted by stars DESCENDING (highest tier first = lowest rank first)
export type StarBoundaries = StarDivider[];

// Cumulative thresholds from the top (percentile = 1 means rank 1 = best).
// Bell curve centred at 3★: most films land at 2.5–3★, fewest at 0.5★ and 5★.
// Distribution: 5★=3%, 4.5★=5%, 4★=9%, 3.5★=14%, 3★=19%, 2.5★=19%, 2★=14%, 1.5★=9%, 1★=5%, 0.5★=3%
const STAR_THRESHOLDS: [number, number][] = [
  [0.97, 5],
  [0.92, 4.5],
  [0.83, 4],
  [0.69, 3.5],
  [0.50, 3],
  [0.31, 2.5],
  [0.17, 2],
  [0.08, 1.5],
  [0.03, 1],
];

export function suggestStars(
  rank: number,
  totalRanked: number,
  confidencePercent: number
): number | null {
  if (confidencePercent < CONFIDENCE_THRESHOLD || totalRanked < 2) return null;
  // percentile 1 = best (rank 1), percentile 0 = worst (rank N)
  const percentile = 1 - (rank - 1) / (totalRanked - 1);
  for (const [threshold, stars] of STAR_THRESHOLDS) {
    if (percentile >= threshold) return stars;
  }
  return 0.5;
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

interface MinimalRankedMovie {
  user_movie_id: string;
  rank: number;
  suggested_stars: number | null;
}

// Given a ranked movie list and custom boundaries, returns a map of movieId → star rating.
// Movies below all boundaries default to 0.5.
export function applyBoundaries(
  ranked: MinimalRankedMovie[],
  boundaries: StarBoundaries
): Map<string, number> {
  const rankMap = new Map(ranked.map(m => [m.user_movie_id, m.rank]));

  const resolved = boundaries
    .map(d => ({ stars: d.stars, rank: rankMap.get(d.movieId) }))
    .filter((d): d is { stars: number; rank: number } => d.rank !== undefined)
    .sort((a, b) => a.rank - b.rank);

  const result = new Map<string, number>();
  for (const movie of ranked) {
    const divider = resolved.find(d => d.rank >= movie.rank);
    result.set(movie.user_movie_id, divider?.stars ?? 0.5);
  }
  return result;
}

// Derives initial boundaries from the auto-calculated suggested_stars on each movie.
export function initBoundariesFromSuggested(
  ranked: MinimalRankedMovie[]
): StarBoundaries {
  const lastInTier = new Map<number, MinimalRankedMovie>();

  for (const movie of ranked) {
    if (movie.suggested_stars === null) continue;
    const current = lastInTier.get(movie.suggested_stars);
    if (!current || movie.rank > current.rank) {
      lastInTier.set(movie.suggested_stars, movie);
    }
  }

  return Array.from(lastInTier.entries())
    .sort(([, a], [, b]) => a.rank - b.rank)
    .map(([stars, movie]) => ({ movieId: movie.user_movie_id, stars }));
}
