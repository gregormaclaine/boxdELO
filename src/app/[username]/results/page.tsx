"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import RankingTable from "@/components/RankingTable";
import RankingGrid from "@/components/RankingGrid";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Link from "next/link";
import ReimportButton from "@/components/ReimportButton";
import type { RankingResponse } from "@/types/api";

type View = "table" | "grid";

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const username = params.username as string;

  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<View>("table");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/${username}/ranking`);
        if (!res.ok) { setError(true); return; }
        setData(await res.json());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  return (
    <div className="flex flex-col flex-1">
      {data?.confidence && (
        <div className="border-b border-border px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <ConfidenceMeter confidence={data.confidence} />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold tracking-tight">Your Ranking</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                className={`px-2.5 py-1.5 transition-colors ${view === "table" ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-primary"}`}
                onClick={() => setView("table")}
                title="Table view"
              >
                <TableIcon />
              </button>
              <button
                className={`px-2.5 py-1.5 transition-colors border-l border-border ${view === "grid" ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-primary"}`}
                onClick={() => setView("grid")}
                title="Grid view"
              >
                <GridIcon />
              </button>
            </div>
            <ReimportButton username={username} />
            <Link href={`/${username}/graph`}>
              <Button variant="ghost" size="sm">View graph</Button>
            </Link>
            <Link href={`/${username}/rank`}>
              <Button variant="ghost" size="sm">Continue ranking →</Button>
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="md" />
          </div>
        )}

        {error && (
          <p className="text-text-muted text-sm text-center py-16">
            Could not load ranking. Make sure you have imported your films first.
          </p>
        )}

        {!loading && !error && data && (
          <>
            {data.ranked.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <p className="text-text-muted text-sm max-w-xs">
                  No films ranked yet. Import your Letterboxd watchlist and start comparing.
                </p>
                <Link href={`/${username}/import`}>
                  <Button variant="ghost" size="sm">Import films</Button>
                </Link>
              </div>
            ) : (
              <>
                {data.confidence.percentage < 30 && (
                  <div className="mb-4 px-3 py-2.5 bg-bg-surface border border-border rounded-md">
                    <p className="text-xs text-text-muted">
                      Star ratings will appear once you&apos;ve done enough comparisons. Keep ranking!
                    </p>
                  </div>
                )}
                {view === "table" ? (
                  <RankingTable ranked={data.ranked} unranked={data.unranked} />
                ) : (
                  <RankingGrid ranked={data.ranked} unranked={data.unranked} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
