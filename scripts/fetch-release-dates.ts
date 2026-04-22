import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();
const TMDB_BASE = "https://api.themoviedb.org/3";

async function fetchDetailsById(tmdbId: number): Promise<Date | null> {
  const apiKey = process.env.TMDB_API_KEY;
  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { release_date?: string };
  return data.release_date ? new Date(data.release_date) : null;
}

async function searchForDetails(
  title: string,
  year: number | null
): Promise<{ tmdb_id: number; poster_path: string | null; release_date: Date | null } | null> {
  const apiKey = process.env.TMDB_API_KEY;
  const params = new URLSearchParams({ api_key: apiKey!, query: title, language: "en-US", page: "1" });
  if (year) params.set("primary_release_year", String(year));
  const res = await fetch(`${TMDB_BASE}/search/movie?${params}`);
  if (!res.ok) return null;
  const data = await res.json() as { results: { id: number; poster_path: string | null; release_date: string }[] };
  const first = data.results[0];
  if (!first) return null;
  return {
    tmdb_id: first.id,
    poster_path: first.poster_path,
    release_date: first.release_date ? new Date(first.release_date) : null,
  };
}

async function main() {
  if (!process.env.TMDB_API_KEY) {
    console.error("TMDB_API_KEY is not set");
    process.exit(1);
  }

  const movies = await prisma.movie.findMany({
    where: { release_date: null },
    select: { id: true, tmdb_id: true, title: true, year: true },
  });

  console.log(`Found ${movies.length} movies without a release date.`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    process.stdout.write(`[${i + 1}/${movies.length}] ${movie.title} ... `);

    let release_date: Date | null = null;
    const updateData: { release_date?: Date; tmdb_id?: number; poster_path?: string | null } = {};

    if (movie.tmdb_id !== null) {
      release_date = await fetchDetailsById(movie.tmdb_id);
      if (release_date) updateData.release_date = release_date;
    } else {
      const result = await searchForDetails(movie.title, movie.year);
      if (result) {
        updateData.tmdb_id = result.tmdb_id;
        if (result.poster_path) updateData.poster_path = result.poster_path;
        if (result.release_date) updateData.release_date = result.release_date;
        release_date = result.release_date;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.movie.update({ where: { id: movie.id }, data: updateData });
      console.log(release_date ? release_date.toISOString().slice(0, 10) : "no date (other fields updated)");
      updated++;
    } else {
      console.log("skipped (no data found)");
      skipped++;
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main().finally(() => prisma.$disconnect());
