import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeFilmsPage } from "@/lib/letterboxd";
import { getPosterUrl } from "@/lib/tmdb";
import { Prisma } from "@/generated/prisma/client";
import type { ReimportStatusResponse } from "@/types/api";
import type { ScrapedFilm } from "@/lib/letterboxd";

function toJson(films: ScrapedFilm[]): Prisma.InputJsonValue {
  return films as unknown as Prisma.InputJsonValue;
}

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { letterboxd_username: username } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const session = await prisma.reimportSession.findUnique({ where: { user_id: user.id } });
  if (!session) return NextResponse.json({ error: "No reimport session" }, { status: 404 });

  if (session.status === "IN_PROGRESS") {
    const res: ReimportStatusResponse = {
      status: "IN_PROGRESS",
      pages_scraped: session.pages_scraped,
      total_pages: session.total_pages,
    };
    return NextResponse.json(res);
  }

  if (session.status === "FAILED") {
    const res: ReimportStatusResponse = {
      status: "FAILED",
      error: session.error ?? "Unknown error",
    };
    return NextResponse.json(res);
  }

  // COMPLETED — compute the diff
  const scrapedFilms = session.scraped_films as unknown as ScrapedFilm[];
  const scrapedSlugs = new Set(scrapedFilms.map((f) => f.slug));

  const userMovies = await prisma.userMovie.findMany({
    where: { user_id: user.id },
    include: { movie: true },
  });

  const userSlugSet = new Set(userMovies.map((um) => um.movie.letterboxd_slug));

  const newFilms = scrapedFilms.filter((f) => !userSlugSet.has(f.slug));

  const missingMovies = userMovies
    .filter((um) => !scrapedSlugs.has(um.movie.letterboxd_slug))
    .map((um) => ({
      user_movie_id: um.id,
      letterboxd_slug: um.movie.letterboxd_slug,
      title: um.movie.title,
      year: um.movie.year,
      poster_url: getPosterUrl(um.movie.poster_path ?? null),
      elo_score: um.elo_score,
      is_excluded: um.is_excluded,
    }));

  const res: ReimportStatusResponse = {
    status: "COMPLETED",
    new_films: newFilms,
    missing_movies: missingMovies,
  };
  return NextResponse.json(res);
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { letterboxd_username: username } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.reimportSession.findUnique({ where: { user_id: user.id } });
  if (existing?.status === "IN_PROGRESS") {
    return NextResponse.json({ status: "already_running" }, { status: 202 });
  }

  await prisma.reimportSession.upsert({
    where: { user_id: user.id },
    create: { user_id: user.id, status: "IN_PROGRESS", scraped_films: [], pages_scraped: 0, total_pages: 0 },
    update: { status: "IN_PROGRESS", scraped_films: [], pages_scraped: 0, total_pages: 0, error: null },
  });

  void runReimportScan(user.id, username);

  return NextResponse.json({ status: "started" }, { status: 202 });
}

async function scrapePage(username: string, pageNum: number) {
  const result = await scrapeFilmsPage(username, pageNum);
  if (result.films.length === 0 && result.totalPages >= pageNum) {
    console.warn(`[reimport] Page ${pageNum} returned 0 films, retrying…`);
    return scrapeFilmsPage(username, pageNum);
  }
  return result;
}

async function runReimportScan(userId: string, username: string) {
  const allFilms: ScrapedFilm[] = [];

  try {
    const firstPage = await scrapePage(username, 1);

    if (firstPage.films.length === 0) {
      await prisma.reimportSession.update({
        where: { user_id: userId },
        data: { status: "FAILED", error: "No films found — profile may be private or empty" },
      });
      return;
    }

    const totalPages = firstPage.totalPages;
    allFilms.push(...firstPage.films);

    await prisma.reimportSession.update({
      where: { user_id: userId },
      data: { pages_scraped: 1, total_pages: totalPages, scraped_films: toJson(allFilms) },
    });

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      const { films } = await scrapePage(username, pageNum);

      if (films.length === 0) {
        console.warn(`[reimport] Page ${pageNum} still empty after retry — skipping`);
        continue;
      }

      allFilms.push(...films);

      await prisma.reimportSession.update({
        where: { user_id: userId },
        data: { pages_scraped: pageNum, scraped_films: toJson(allFilms) },
      });
    }

    await prisma.reimportSession.update({
      where: { user_id: userId },
      data: { status: "COMPLETED", scraped_films: toJson(allFilms) },
    });
  } catch (err) {
    console.error("[reimport] Scan failed:", err);
    await prisma.reimportSession.update({
      where: { user_id: userId },
      data: { status: "FAILED", error: String(err) },
    });
  }
}
