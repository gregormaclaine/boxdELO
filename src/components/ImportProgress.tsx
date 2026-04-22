"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./ui/Spinner";
import type { ImportStatusResponse } from "@/types/api";

interface ImportProgressProps {
  username: string;
}

export default function ImportProgress({ username }: ImportProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportStatusResponse | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    async function triggerImport() {
      await fetch(`/api/${username}/import`, { method: "POST" });
      setStarted(true);
    }
    triggerImport();
  }, [username]);

  useEffect(() => {
    if (!started) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/${username}/import`);
      if (!res.ok) return;
      const data: ImportStatusResponse = await res.json();
      setStatus(data);

      if (data.import_status === "COMPLETED") {
        clearInterval(interval);
        router.push(`/${username}/rank`);
      } else if (data.import_status === "FAILED") {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [started, username, router]);

  if (status?.import_status === "FAILED") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-3xl">⚠</div>
        <div>
          <p className="text-text-primary font-semibold">Import failed</p>
          <p className="text-text-muted text-sm mt-1">
            Could not find that Letterboxd username or the profile is private.
          </p>
        </div>
      </div>
    );
  }

  const pages = status?.pages_scraped ?? 0;
  const totalFilms = status?.total_films ?? 0;
  const enriched = status?.films_enriched ?? 0;
  const errors = status?.import_errors ?? 0;
  const enrichProgress = totalFilms > 0 ? Math.min(100, Math.round((enriched / totalFilms) * 100)) : 0;

  return (
    <div className="flex flex-col items-center gap-8 text-center max-w-xs w-full">
      <Spinner size="lg" />

      {/* Phase 1 — scraping pages */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex justify-between items-baseline text-xs mb-0.5">
          <span className="text-text-muted font-medium uppercase tracking-widest">Pages scanned</span>
          <span className="text-text-primary font-semibold tabular-nums text-base">
            {pages > 0 ? pages : "—"}
          </span>
        </div>

        {/* Indeterminate bar — we don't know total pages upfront */}
        <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
          {pages > 0 ? (
            <div className="h-full w-full bg-accent/30 rounded-full relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-accent rounded-full animate-[shimmer_1.4s_ease-in-out_infinite]" />
            </div>
          ) : (
            <div className="h-full w-0" />
          )}
        </div>

        <p className="text-xs text-text-muted text-left mt-0.5">
          {totalFilms > 0
            ? `${totalFilms.toLocaleString()} films found`
            : "Scanning Letterboxd…"}
        </p>
      </div>

      {/* Phase 2 — TMDB enrichment */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex justify-between items-baseline text-xs mb-0.5">
          <span className="text-text-muted font-medium uppercase tracking-widest">Posters fetched</span>
          <span className="text-text-primary font-semibold tabular-nums text-base">
            {totalFilms > 0 ? `${enriched}/${totalFilms}` : "—"}
          </span>
        </div>

        <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${enrichProgress}%` }}
          />
        </div>

        <p className="text-xs text-text-muted text-left mt-0.5">
          {enrichProgress > 0 ? `${enrichProgress}% complete` : "Waiting to start…"}
        </p>
      </div>

      <p className="text-xs text-text-muted">
        Large watchlists can take several minutes.
      </p>

      {errors > 0 && (
        <p className="text-xs text-warning">
          {errors} film{errors === 1 ? "" : "s"} skipped due to errors
        </p>
      )}
    </div>
  );
}
