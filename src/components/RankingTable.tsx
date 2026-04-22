"use client";

import { useState } from "react";
import Image from "next/image";
import StarBadge from "./StarBadge";
import type { RankedMovie, UnrankedMovie } from "@/types/domain";

interface RankingTableProps {
  ranked: RankedMovie[];
  unranked: UnrankedMovie[];
}

function PosterThumb({ url, title }: { url: string | null; title: string }) {
  return (
    <div className="relative w-10 h-14 rounded overflow-hidden bg-bg-elevated flex-shrink-0">
      {url ? (
        <Image src={url} alt={title} fill className="object-cover" sizes="40px" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted text-[9px]">
          —
        </div>
      )}
    </div>
  );
}

export default function RankingTable({ ranked, unranked }: RankingTableProps) {
  const [unrankedOpen, setUnrankedOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Ranked list */}
      <div className="divide-y divide-border">
        {ranked.map((item) => (
          <div
            key={item.user_movie_id}
            className="flex items-center gap-3 py-2.5 px-1 hover:bg-bg-elevated/50 transition-colors rounded"
          >
            <span className="w-7 text-right text-sm font-semibold text-text-muted tabular-nums flex-shrink-0">
              {item.rank}
            </span>

            <PosterThumb url={item.movie.poster_url} title={item.movie.title} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {item.movie.title}
              </p>
              {item.movie.year && (
                <p className="text-xs text-text-muted">{item.movie.year}</p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {item.suggested_stars !== null && (
                <StarBadge stars={item.suggested_stars} />
              )}
              <div className="hidden sm:flex flex-col items-end gap-0.5">
                <span className="text-xs text-text-muted tabular-nums">
                  {Math.round(item.elo_score)} ELO
                </span>
                <span className="text-xs text-text-muted/60 tabular-nums">
                  {item.comparisons_count} comparisons
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unranked section */}
      {unranked.length > 0 && (
        <div className="mt-6">
          <button
            className="flex items-center gap-3 w-full group"
            onClick={() => setUnrankedOpen((o) => !o)}
          >
            <div className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-widest px-2 group-hover:text-text-primary transition-colors">
              {unranked.length} Unranked
              <span className="text-text-muted/60">{unrankedOpen ? "▴" : "▾"}</span>
            </span>
            <div className="h-px flex-1 bg-border" />
          </button>

          {unrankedOpen && (
            <div className="divide-y divide-border mt-3">
              {unranked.map((item) => (
                <div
                  key={item.user_movie_id}
                  className="flex items-center gap-3 py-2.5 px-1"
                >
                  <span className="w-7 flex-shrink-0" />
                  <PosterThumb url={item.movie.poster_url} title={item.movie.title} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-muted truncate">{item.movie.title}</p>
                    {item.movie.year && (
                      <p className="text-xs text-text-muted/60">{item.movie.year}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
