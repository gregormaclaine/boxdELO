"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import RankingTable from "@/components/RankingTable";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Link from "next/link";
import ReimportButton from "@/components/ReimportButton";
import type { RankingResponse } from "@/types/api";

export default function ResultsPage() {
  const params = useParams();
  const username = params.username as string;

  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
            <ReimportButton username={username} />
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
                <RankingTable ranked={data.ranked} unranked={data.unranked} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
