export type ImportStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type ReimportStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface ScannedFilm {
  slug: string;
  title: string;
  year: number | null;
}

export interface MissingMovie {
  user_movie_id: string;
  letterboxd_slug: string;
  title: string;
  year: number | null;
  poster_url: string | null;
  elo_score: number;
  is_excluded: boolean;
}

export interface MovieSummary {
  id: string;
  title: string;
  year: number | null;
  poster_url: string | null;
  letterboxd_slug: string;
}

export interface RankedMovie {
  rank: number;
  user_movie_id: string;
  movie: MovieSummary;
  elo_score: number;
  comparisons_count: number;
  wins: number;
  losses: number;
  suggested_stars: number | null;
}

export interface UnrankedMovie {
  user_movie_id: string;
  movie: MovieSummary;
}

export interface ConfidenceInfo {
  percentage: number;
  label: "Building baseline" | "Getting confident" | "Well ranked";
  total_comparisons: number;
  target_comparisons: number;
}
