import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyComparison, calculateConfidence } from "@/lib/elo";
import type { CompareRequest, CompareResponse } from "@/types/api";

type Params = { params: Promise<{ username: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const body: CompareRequest = await req.json();

  const user = await prisma.user.findUnique({
    where: { letterboxd_username: username },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let winnerNewElo: number | null = null;
  let loserNewElo: number | null = null;
  let winnerMovieId: string | null = null;
  let loserMovieId: string | null = null;

  if (body.exclude_movie_id) {
    await prisma.userMovie.update({
      where: { id: body.exclude_movie_id, user_id: user.id },
      data: { is_excluded: true, excluded_at: new Date() },
    });
  }

  if (!body.was_skipped && body.winner_movie_id && body.loser_movie_id) {
    const [winner, loser] = await Promise.all([
      prisma.userMovie.findFirst({
        where: { id: body.winner_movie_id, user_id: user.id },
      }),
      prisma.userMovie.findFirst({
        where: { id: body.loser_movie_id, user_id: user.id },
      }),
    ]);

    if (!winner || !loser) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // The Comparison FK references Movie.id, not UserMovie.id.
    winnerMovieId = winner.movie_id;
    loserMovieId = loser.movie_id;

    const [newWinnerElo, newLoserElo] = applyComparison(
      winner.elo_score,
      loser.elo_score
    );
    winnerNewElo = newWinnerElo;
    loserNewElo = newLoserElo;

    await Promise.all([
      prisma.userMovie.update({
        where: { id: winner.id },
        data: {
          elo_score: newWinnerElo,
          comparisons_count: { increment: 1 },
          wins: { increment: 1 },
        },
      }),
      prisma.userMovie.update({
        where: { id: loser.id },
        data: {
          elo_score: newLoserElo,
          comparisons_count: { increment: 1 },
          losses: { increment: 1 },
        },
      }),
    ]);
  }

  await prisma.comparison.create({
    data: {
      user_id: user.id,
      winner_movie_id: winnerMovieId,
      loser_movie_id: loserMovieId,
      was_skipped: body.was_skipped,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { last_active_at: new Date() },
  });

  const [totalComparisons, activeCount] = await Promise.all([
    prisma.comparison.count({ where: { user_id: user.id, was_skipped: false } }),
    prisma.userMovie.count({ where: { user_id: user.id, is_excluded: false } }),
  ]);

  const confidence = calculateConfidence(totalComparisons, activeCount);

  const res: CompareResponse = {
    winner_new_elo: winnerNewElo,
    loser_new_elo: loserNewElo,
    confidence,
  };

  return NextResponse.json(res);
}
