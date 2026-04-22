const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getPosterUrl(posterPath: string | null, size = "w342"): string | null {
  if (!posterPath) return null;
  return `${IMAGE_BASE}/${size}${posterPath}`;
}

interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
}

interface TmdbSearchResult {
  results: TmdbMovie[];
}

export async function searchMovie(
  title: string,
  year: number | null
): Promise<{ tmdb_id: number; poster_path: string | null } | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not set");

  const params = new URLSearchParams({
    api_key: apiKey,
    query: title,
    language: "en-US",
    page: "1",
  });
  if (year) params.set("primary_release_year", String(year));

  const url = `${TMDB_BASE}/search/movie?${params}`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 86400 } });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data: TmdbSearchResult = await res.json();
  const first = data.results[0];
  if (!first) return null;

  return { tmdb_id: first.id, poster_path: first.poster_path };
}
