import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFilms } from "@/lib/import-films";
import type { ScrapedFilm } from "@/lib/letterboxd";
import type { ReimportConfirmRequest, ReimportConfirmResponse } from "@/types/api";

type Params = { params: Promise<{ username: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { letterboxd_username: username } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const session = await prisma.reimportSession.findUnique({ where: { user_id: user.id } });
  if (!session) return NextResponse.json({ error: "No reimport session found" }, { status: 404 });
  if (session.status !== "COMPLETED") {
    return NextResponse.json({ error: "Scan not complete" }, { status: 409 });
  }

  const body: ReimportConfirmRequest = await req.json();
  const slugsToRemove = new Set(body.slugsToRemove ?? []);

  const scrapedFilms = session.scraped_films as unknown as ScrapedFilm[];
  const scrapedSlugs = new Set(scrapedFilms.map((f) => f.slug));

  const userMovies = await prisma.userMovie.findMany({
    where: { user_id: user.id },
    select: { id: true, movie_id: true, movie: { select: { letterboxd_slug: true } } },
  });

  const userSlugSet = new Set(userMovies.map((um) => um.movie.letterboxd_slug));

  // Add new films not yet in the user's library
  const newFilms = scrapedFilms.filter((f) => !userSlugSet.has(f.slug));
  const existingMovieIds = new Set(userMovies.map((um) => um.movie_id));
  await saveFilms(user.id, newFilms, existingMovieIds);

  // Remove movies the user selected to remove
  const moviesToRemove = userMovies.filter(
    (um) => slugsToRemove.has(um.movie.letterboxd_slug) && !scrapedSlugs.has(um.movie.letterboxd_slug)
  );
  if (moviesToRemove.length > 0) {
    await prisma.userMovie.deleteMany({
      where: { id: { in: moviesToRemove.map((um) => um.id) } },
    });
  }

  await prisma.reimportSession.delete({ where: { user_id: user.id } });

  const res: ReimportConfirmResponse = {
    added: newFilms.length,
    removed: moviesToRemove.length,
  };
  return NextResponse.json(res);
}
