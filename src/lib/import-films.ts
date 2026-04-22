import { prisma } from "@/lib/prisma";
import { searchMovie } from "@/lib/tmdb";
import { STARTING_ELO } from "@/lib/elo";
import type { ScrapedFilm } from "@/lib/letterboxd";

export async function saveFilms(
  userId: string,
  films: ScrapedFilm[],
  seenMovieIds: Set<string>
): Promise<number> {
  let errorCount = 0;

  for (const film of films) {
    try {
      let movie = await prisma.movie.findUnique({
        where: { letterboxd_slug: film.slug },
      });

      if (!movie) {
        const tmdbData = await searchMovie(film.title, film.year);

        if (tmdbData?.tmdb_id) {
          movie = await prisma.movie.findUnique({ where: { tmdb_id: tmdbData.tmdb_id } });
        }

        if (!movie) {
          movie = await prisma.movie.create({
            data: {
              letterboxd_slug: film.slug,
              title: film.title,
              year: film.year,
              ...(tmdbData
                ? { tmdb_id: tmdbData.tmdb_id, poster_path: tmdbData.poster_path, release_date: tmdbData.release_date }
                : {}),
            },
          });
        }
      }

      // Two slugs can resolve to the same movie (e.g. via shared TMDB ID).
      // Skip the second occurrence so we don't hit the (user_id, movie_id) unique constraint.
      if (seenMovieIds.has(movie.id)) continue;
      seenMovieIds.add(movie.id);

      await prisma.userMovie.create({
        data: { user_id: userId, movie_id: movie.id, elo_score: STARTING_ELO },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        console.warn(`[import] Skipped duplicate film "${film.title}" (${film.slug})`);
      } else {
        errorCount++;
        console.error(`[import] Failed to save film "${film.title}" (${film.slug}):`, err);
      }
    }
  }

  return errorCount;
}
