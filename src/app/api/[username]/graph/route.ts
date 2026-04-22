import { NextRequest, NextResponse } from "next/server";
import dagre from "@dagrejs/dagre";
import { prisma } from "@/lib/prisma";
import { getPosterUrl } from "@/lib/tmdb";
import { classifyEdges } from "@/lib/graph";
import type { GraphResponse } from "@/types/graph";

const NODE_WIDTH = 90;
const NODE_HEIGHT = 145;

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { letterboxd_username: username },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [allUserMovies, comparisons] = await Promise.all([
    prisma.userMovie.findMany({
      where: { user_id: user.id, is_excluded: false },
      include: { movie: true },
      orderBy: { elo_score: "desc" },
    }),
    prisma.comparison.findMany({
      where: {
        user_id: user.id,
        was_skipped: false,
        winner_movie_id: { not: null },
        loser_movie_id: { not: null },
      },
      orderBy: { created_at: "asc" },
      select: { winner_movie_id: true, loser_movie_id: true, created_at: true },
    }),
  ]);

  const movieMeta = allUserMovies.map((um, index) => ({
    id: um.movie.id,
    title: um.movie.title,
    year: um.movie.year,
    poster_url: getPosterUrl(um.movie.poster_path ?? null),
    elo_score: um.elo_score,
    rank: index + 1,
  }));

  const rawComparisons = comparisons.map((c) => ({
    winner_movie_id: c.winner_movie_id!,
    loser_movie_id: c.loser_movie_id!,
    created_at: c.created_at.toISOString(),
  }));

  const allEdges = classifyEdges(rawComparisons, movieMeta.map((m) => m.id));
  const edges = allEdges
    .filter((e) => e.kind !== "redundant")
    .map(({ from, to, kind }) => ({ from, to, kind: kind as "direct" | "cycle" }));

  // Compute dagre layout server-side
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 120, nodesep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const movie of movieMeta) {
    g.setNode(movie.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const { from, to } of edges.filter((e) => e.kind === "direct")) {
    g.setEdge(from, to);
  }
  dagre.layout(g);

  const movies = movieMeta.map((movie) => {
    const node = g.node(movie.id);
    return {
      ...movie,
      x: node.x - NODE_WIDTH / 2,
      y: node.y - NODE_HEIGHT / 2,
    };
  });

  const res: GraphResponse = { movies, edges };
  return NextResponse.json(res);
}
