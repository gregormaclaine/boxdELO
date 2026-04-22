"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import ComparisonArena from "@/components/ComparisonArena";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Link from "next/link";
import ReimportButton from "@/components/ReimportButton";
import type { PairResponse, CompareRequest, ImportStatusResponse } from "@/types/api";
import type { ConfidenceInfo } from "@/types/domain";

type State = "loading" | "comparing" | "done" | "error";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RankPage() {
  const params = useParams();
  const username = params.username as string;

  const [state, setState] = useState<State>("loading");
  const [pair, setPair] = useState<PairResponse | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importInfo, setImportInfo] = useState<{ total: number; completedAt: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/${username}/import`)
      .then((r) => r.ok ? r.json() as Promise<ImportStatusResponse> : null)
      .then((data) => {
        if (data) setImportInfo({ total: data.total_films, completedAt: data.import_completed_at });
      })
      .catch(() => null);
  }, [username]);

  const fetchPair = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/${username}/pair`);
      if (res.status === 204) {
        setState("done");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data: PairResponse = await res.json();
      setPair(data);
      setConfidence(data.confidence);
      setState("comparing");
    } catch {
      setState("error");
    }
  }, [username]);

  useEffect(() => {
    fetchPair();
  }, [fetchPair]);

  async function submitComparison(body: CompareRequest) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/${username}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setConfidence(data.confidence);
      }
    } finally {
      setSubmitting(false);
      fetchPair();
    }
  }

  function handlePick(winnerId: string, loserId: string) {
    submitComparison({
      winner_movie_id: winnerId,
      loser_movie_id: loserId,
      was_skipped: false,
    });
  }

  function handleSkip() {
    submitComparison({
      winner_movie_id: null,
      loser_movie_id: null,
      was_skipped: true,
    });
  }

  function handleExclude(userMovieId: string) {
    submitComparison({
      winner_movie_id: null,
      loser_movie_id: null,
      was_skipped: true,
      exclude_movie_id: userMovieId,
    });
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Confidence strip */}
      {confidence && (
        <div className="border-b border-border px-4 py-3">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            <ConfidenceMeter confidence={confidence} />
            {importInfo && importInfo.total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  {importInfo.total} films scanned
                  {importInfo.completedAt && (
                    <> &middot; imported {formatDate(importInfo.completedAt)}</>
                  )}
                </p>
                <ReimportButton username={username} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 items-center justify-center px-4 py-12">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <Spinner size="md" />
            <span className="text-sm">Loading next matchup…</span>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-text-muted text-sm">Something went wrong.</p>
            <Button variant="ghost" size="sm" onClick={fetchPair}>
              Try again
            </Button>
          </div>
        )}

        {state === "done" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-semibold">Not enough films to compare</p>
            <p className="text-text-muted text-sm max-w-xs">
              Import your Letterboxd watchlist to start ranking.
            </p>
            <Link href={`/${username}/import`}>
              <Button variant="ghost" size="sm">Import films</Button>
            </Link>
          </div>
        )}

        {state === "comparing" && pair && (
          <div className="flex flex-col items-center gap-6 w-full max-w-lg">
            <p className="text-xs text-text-muted uppercase tracking-widest font-medium">
              Which do you prefer?
            </p>
            <ComparisonArena
              pair={pair}
              onPick={handlePick}
              onSkip={handleSkip}
              onExclude={handleExclude}
              disabled={submitting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
