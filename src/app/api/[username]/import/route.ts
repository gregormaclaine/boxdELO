import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeFilmsPage, type ScrapedFilm } from "@/lib/letterboxd";
import { searchMovie } from "@/lib/tmdb";
import { STARTING_ELO } from "@/lib/elo";
import type { ImportStatusResponse } from "@/types/api";

type Params = { params: Promise<{ username: string }> };

const MAX_IMPORT_ERRORS = 20;

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { letterboxd_username: username },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const enrichedCount = await prisma.userMovie.count({
    where: {
      user_id: user.id,
      movie: { poster_path: { not: null } },
    },
  });

  const res: ImportStatusResponse = {
    import_status: user.import_status,
    total_films: user.total_films,
    pages_scraped: user.pages_scraped,
    import_errors: user.import_errors,
    films_enriched: enrichedCount,
    import_completed_at: user.import_completed_at?.toISOString() ?? null,
  };
  return NextResponse.json(res);
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { letterboxd_username: username },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.import_status === "IN_PROGRESS") {
    return NextResponse.json({ error: "Import already running" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      import_status: "IN_PROGRESS",
      import_started_at: new Date(),
      pages_scraped: 0,
      total_films: 0,
      import_errors: 0,
    },
  });

  void runImport(user.id, username);

  return NextResponse.json({ status: "started" }, { status: 202 });
}

// Returns the number of films that failed to save on this page.
async function saveFilms(
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
                ? { tmdb_id: tmdbData.tmdb_id, poster_path: tmdbData.poster_path }
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
        // Unique constraint: film already linked to this user (race condition or
        // duplicate slug resolving to same TMDB movie). Safe to skip, not a
        // real error — don't count against the abort threshold.
        console.warn(`[import] Skipped duplicate film "${film.title}" (${film.slug})`);
      } else {
        errorCount++;
        console.error(`[import] Failed to save film "${film.title}" (${film.slug}):`, err);
      }
    }
  }

  return errorCount;
}

async function scrapePage(username: string, pageNum: number) {
  const result = await scrapeFilmsPage(username, pageNum);
  // Retry once if a page we expect to have films comes back empty.
  if (result.films.length === 0 && result.totalPages >= pageNum) {
    console.warn(`[import] Page ${pageNum} returned 0 films, retrying…`);
    return scrapeFilmsPage(username, pageNum);
  }
  return result;
}

async function runImport(userId: string, username: string) {
  try {
    let totalFilms = 0;
    let totalErrors = 0;

    // Pre-populate with movies already linked to this user so re-imports
    // don't attempt to re-create existing UserMovie rows.
    const existing = await prisma.userMovie.findMany({
      where: { user_id: userId },
      select: { movie_id: true },
    });
    const seenMovieIds = new Set<string>(existing.map((um) => um.movie_id));

    // Scrape page 1 first to discover totalPages from the pagination widget.
    const firstPage = await scrapePage(username, 1);

    if (firstPage.films.length === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { import_status: "FAILED", total_films: 0, pages_scraped: 0 },
      });
      return;
    }

    const totalPages = firstPage.totalPages;
    console.log(`[import] ${username}: ${totalPages} page(s) to scrape`);

    // Process page 1
    totalFilms += firstPage.films.length;
    await prisma.user.update({
      where: { id: userId },
      data: { pages_scraped: 1, total_films: totalFilms, import_errors: totalErrors },
    });
    totalErrors += await saveFilms(userId, firstPage.films, seenMovieIds);

    // Process remaining pages, using totalPages as the definitive stop condition.
    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      if (totalErrors > MAX_IMPORT_ERRORS) {
        console.error(`[import] Aborting: ${totalErrors} errors exceeded threshold of ${MAX_IMPORT_ERRORS}`);
        await prisma.user.update({
          where: { id: userId },
          data: { import_status: "FAILED", import_errors: totalErrors },
        });
        return;
      }

      const { films } = await scrapePage(username, pageNum);

      if (films.length === 0) {
        console.warn(`[import] Page ${pageNum} still empty after retry — skipping`);
        continue;
      }

      totalFilms += films.length;
      await prisma.user.update({
        where: { id: userId },
        data: { pages_scraped: pageNum, total_films: totalFilms, import_errors: totalErrors },
      });
      totalErrors += await saveFilms(userId, films, seenMovieIds);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { import_status: "COMPLETED", import_completed_at: new Date(), import_errors: totalErrors },
    });
  } catch (err) {
    console.error("Import failed:", err);
    await prisma.user.update({
      where: { id: userId },
      data: { import_status: "FAILED" },
    });
  }
}
