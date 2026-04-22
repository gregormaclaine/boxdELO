import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateConfidence } from "@/lib/elo";
import { getPosterUrl } from "@/lib/tmdb";
import { suggestStars } from "@/lib/stars";
import type { RankingResponse } from "@/types/api";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { letterboxd_username: username },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [allUserMovies, totalComparisons] = await Promise.all([
    prisma.userMovie.findMany({
      where: { user_id: user.id },
      include: { movie: true },
      orderBy: { elo_score: "desc" },
    }),
    prisma.comparison.count({ where: { user_id: user.id, was_skipped: false } }),
  ]);

  const active = allUserMovies.filter((um) => !um.is_excluded);
  const excluded = allUserMovies.filter((um) => um.is_excluded);
  const confidence = calculateConfidence(totalComparisons, active.length);

  const toMovieSummary = (um: typeof allUserMovies[0]) => ({
    id: um.movie.id,
    title: um.movie.title,
    year: um.movie.year,
    poster_url: getPosterUrl(um.movie.poster_path ?? null),
    letterboxd_slug: um.movie.letterboxd_slug,
  });

  const ranked = active.map((um, index) => ({
    rank: index + 1,
    user_movie_id: um.id,
    movie: toMovieSummary(um),
    elo_score: um.elo_score,
    comparisons_count: um.comparisons_count,
    wins: um.wins,
    losses: um.losses,
    suggested_stars: suggestStars(index + 1, active.length, confidence.percentage),
  }));

  const unranked = excluded.map((um) => ({
    user_movie_id: um.id,
    movie: toMovieSummary(um),
  }));

  const res: RankingResponse = { ranked, unranked, confidence };
  return NextResponse.json(res);
}
