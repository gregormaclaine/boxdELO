import type { ConfidenceInfo, MovieSummary, RankedMovie, UnrankedMovie, ImportStatus } from "./domain";

export interface CreateUserRequest {
  username: string;
}

export interface CreateUserResponse {
  user: {
    id: string;
    letterboxd_username: string;
    import_status: ImportStatus;
    total_films: number;
  };
  isNew: boolean;
}

export interface ImportStatusResponse {
  import_status: ImportStatus;
  total_films: number;
  pages_scraped: number;
  import_errors: number;
  films_enriched: number;
  import_completed_at: string | null;
  error?: string;
}

export interface PairResponse {
  movieA: MovieSummary & { elo_score: number; user_movie_id: string };
  movieB: MovieSummary & { elo_score: number; user_movie_id: string };
  confidence: ConfidenceInfo;
}

export interface CompareRequest {
  winner_movie_id: string | null;
  loser_movie_id: string | null;
  was_skipped: boolean;
  exclude_movie_id?: string;
}

export interface CompareResponse {
  winner_new_elo: number | null;
  loser_new_elo: number | null;
  confidence: ConfidenceInfo;
}

export interface RankingResponse {
  ranked: RankedMovie[];
  unranked: UnrankedMovie[];
  confidence: ConfidenceInfo;
}
