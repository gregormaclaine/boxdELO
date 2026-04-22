import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { selectNextPair, calculateConfidence } from "@/lib/elo";
import { getPosterUrl } from "@/lib/tmdb";
import type { PairResponse } from "@/types/api";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { letterboxd_username: username },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const activeMovies = await prisma.userMovie.findMany({
    where: { user_id: user.id, is_excluded: false },
    include: { movie: true },
  });

  if (activeMovies.length < 2) {
    return new NextResponse(null, { status: 204 });
  }

  const slimMovies = activeMovies.map((um) => ({
    id: um.id,
    elo_score: um.elo_score,
    comparisons_count: um.comparisons_count,
  }));

  const pairIds = selectNextPair(slimMovies);
  if (!pairIds) return new NextResponse(null, { status: 204 });

  const [umA, umB] = pairIds.map((id) => activeMovies.find((m) => m.id === id)!);

  const totalComparisons = await prisma.comparison.count({
    where: { user_id: user.id, was_skipped: false },
  });

  const confidence = calculateConfidence(totalComparisons, activeMovies.length);

  const toMovieSummary = (um: typeof activeMovies[0]) => ({
    user_movie_id: um.id,
    id: um.movie.id,
    title: um.movie.title,
    year: um.movie.year,
    poster_url: getPosterUrl(um.movie.poster_path ?? null),
    letterboxd_slug: um.movie.letterboxd_slug,
    elo_score: um.elo_score,
  });

  const res: PairResponse = {
    movieA: toMovieSummary(umA),
    movieB: toMovieSummary(umB),
    confidence,
  };

  return NextResponse.json(res);
}
