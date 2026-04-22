"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import type { ReimportStatusResponse, MissingMovie, ScannedFilm } from "@/types/api";

type Phase =
  | { name: "scanning"; pagesScraped: number; totalPages: number }
  | { name: "failed"; error: string }
  | { name: "review"; newFilms: ScannedFilm[]; missingMovies: MissingMovie[] }
  | { name: "applying" }
  | { name: "done" };

export default function ReimportPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [phase, setPhase] = useState<Phase>({ name: "scanning", pagesScraped: 0, totalPages: 0 });
  const [toRemove, setToRemove] = useState<Set<string>>(new Set());

  const startScan = useCallback(async () => {
    setPhase({ name: "scanning", pagesScraped: 0, totalPages: 0 });
    await fetch(`/api/${username}/reimport`, { method: "POST" });
  }, [username]);

  // Kick off the scan on mount
  useEffect(() => {
    startScan();
  }, [startScan]);

  // Poll while scanning
  useEffect(() => {
    if (phase.name !== "scanning") return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/${username}/reimport`);
      if (!res.ok) return;
      const data: ReimportStatusResponse = await res.json();

      if (data.status === "IN_PROGRESS") {
        setPhase({ name: "scanning", pagesScraped: data.pages_scraped, totalPages: data.total_pages });
      } else if (data.status === "COMPLETED") {
        clearInterval(interval);
        setToRemove(new Set());
        setPhase({ name: "review", newFilms: data.new_films, missingMovies: data.missing_movies });
      } else if (data.status === "FAILED") {
        clearInterval(interval);
        setPhase({ name: "failed", error: data.error });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [phase.name, username]);

  async function handleConfirm() {
    setPhase({ name: "applying" });
    await fetch(`/api/${username}/reimport/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugsToRemove: Array.from(toRemove) }),
    });
    router.push(`/${username}/results`);
  }

  function toggleRemove(slug: string) {
    setToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectAll(movies: MissingMovie[]) {
    setToRemove(new Set(movies.map((m) => m.letterboxd_slug)));
  }

  function deselectAll() {
    setToRemove(new Set());
  }

  if (phase.name === "scanning") {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-2 mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Scanning your Letterboxd</h1>
          <p className="text-sm text-text-muted">
            Checking <span className="text-text-primary">@{username}</span> for changes
          </p>
        </div>
        <div className="flex flex-col items-center gap-6 max-w-xs w-full text-center">
          <Spinner size="lg" />
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline text-xs mb-0.5">
              <span className="text-text-muted font-medium uppercase tracking-widest">Pages scanned</span>
              <span className="text-text-primary font-semibold tabular-nums text-base">
                {phase.pagesScraped > 0
                  ? phase.totalPages > 0
                    ? `${phase.pagesScraped} / ${phase.totalPages}`
                    : phase.pagesScraped
                  : "—"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
              {phase.pagesScraped > 0 && phase.totalPages > 0 ? (
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((phase.pagesScraped / phase.totalPages) * 100)}%` }}
                />
              ) : (
                <div className="h-full w-full bg-bg-elevated rounded-full relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-1/3 bg-accent/40 rounded-full animate-[shimmer_1.4s_ease-in-out_infinite]" />
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-text-muted">Large watchlists can take a few minutes.</p>
        </div>
      </div>
    );
  }

  if (phase.name === "failed") {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-4 py-16 text-center">
        <div className="text-3xl mb-4">⚠</div>
        <p className="text-text-primary font-semibold mb-1">Scan failed</p>
        <p className="text-text-muted text-sm mb-6 max-w-xs">{phase.error}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => startScan()}>Retry</Button>
          <Link href={`/${username}/results`}>
            <Button variant="ghost" size="sm">Back to results</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (phase.name === "applying") {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-text-muted text-sm">Applying changes…</p>
      </div>
    );
  }

  if (phase.name === "review") {
    const { newFilms, missingMovies } = phase;
    const upToDate = newFilms.length === 0 && missingMovies.length === 0;

    const confirmLabel = () => {
      const adding = newFilms.length;
      const removing = toRemove.size;
      if (adding === 0 && removing === 0) return "Confirm (no changes)";
      const parts: string[] = [];
      if (adding > 0) parts.push(`Add ${adding} film${adding === 1 ? "" : "s"}`);
      if (removing > 0) parts.push(`remove ${removing}`);
      return parts.join(", ");
    };

    return (
      <div className="flex flex-col flex-1">
        <div className="max-w-3xl mx-auto w-full px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Review Import</h1>
              <p className="text-sm text-text-muted mt-0.5">
                {upToDate
                  ? "Your library is already up to date."
                  : `${newFilms.length} new · ${missingMovies.length} not found`}
              </p>
            </div>
            <Link href={`/${username}/results`}>
              <Button variant="ghost" size="sm">Cancel</Button>
            </Link>
          </div>

          {upToDate ? (
            <div className="flex flex-col items-center py-16 gap-4 text-center">
              <p className="text-text-muted text-sm">
                No new films found, and all tracked films are still on your Letterboxd.
              </p>
              <Link href={`/${username}/results`}>
                <Button variant="ghost" size="sm">Back to results</Button>
              </Link>
            </div>
          ) : (
            <>
              {newFilms.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-3">
                    New films ({newFilms.length})
                  </h2>
                  <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
                    {newFilms.map((film) => (
                      <div key={film.slug} className="flex items-center gap-3 px-4 py-2.5 bg-bg-surface">
                        <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                        <span className="text-sm text-text-primary">
                          {film.title}
                          {film.year && <span className="text-text-muted ml-1.5">({film.year})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    These films will be added to your library with a starting ELO of 1000.
                  </p>
                </section>
              )}

              {missingMovies.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-1">
                    No longer on your Letterboxd ({missingMovies.length})
                  </h2>
                  <p className="text-xs text-text-muted mb-3">
                    These films are in your library but weren&apos;t found in your current watchlist.
                    Check the ones you want to remove.
                  </p>

                  <div className="border border-border rounded-md divide-y divide-border overflow-hidden mb-2">
                    {missingMovies.map((movie) => {
                      const checked = toRemove.has(movie.letterboxd_slug);
                      return (
                        <label
                          key={movie.user_movie_id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            checked ? "bg-danger/5" : "bg-bg-surface hover:bg-bg-elevated"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRemove(movie.letterboxd_slug)}
                            className="w-4 h-4 accent-danger cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-text-primary">
                              {movie.title}
                              {movie.year && <span className="text-text-muted ml-1.5">({movie.year})</span>}
                              {movie.is_excluded && (
                                <span className="ml-2 text-xs text-text-muted">(excluded)</span>
                              )}
                            </span>
                          </div>
                          <span className="text-xs text-text-muted tabular-nums flex-shrink-0">
                            ELO {Math.round(movie.elo_score)}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="text-xs text-text-muted hover:text-text-primary transition-colors underline underline-offset-2"
                      onClick={() => selectAll(missingMovies)}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs text-text-muted hover:text-text-primary transition-colors underline underline-offset-2"
                      onClick={deselectAll}
                    >
                      Deselect all
                    </button>
                  </div>
                </section>
              )}

              <div className="flex justify-end">
                <Button onClick={handleConfirm}>
                  {confirmLabel()}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
