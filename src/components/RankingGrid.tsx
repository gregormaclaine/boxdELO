"use client";

import { useState } from "react";
import Image from "next/image";
import type { RankedMovie, UnrankedMovie } from "@/types/domain";

interface RankingGridProps {
  ranked: RankedMovie[];
  unranked: UnrankedMovie[];
}

function PosterCell({
  url,
  title,
  year,
  rank,
  dimmed = false,
}: {
  url: string | null;
  title: string;
  year: number | null;
  rank?: number;
  dimmed?: boolean;
}) {
  return (
    <div className={`relative group aspect-[2/3] ${dimmed ? "opacity-40" : ""}`}>
      <div className="relative w-full h-full rounded overflow-hidden bg-bg-elevated">
        {url ? (
          <Image src={url} alt={title} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-[8px] text-center px-1 leading-tight">
            {title}
          </div>
        )}

        {rank !== undefined && (
          <span className="absolute top-0.5 left-0.5 text-[9px] font-bold bg-black/70 text-white px-1 rounded leading-tight tabular-nums">
            {rank}
          </span>
        )}

        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
          <p className="text-white text-[9px] font-medium text-center leading-tight line-clamp-4">
            {title}
          </p>
          {year && (
            <p className="text-white/60 text-[8px] mt-0.5">{year}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RankingGrid({ ranked, unranked }: RankingGridProps) {
  const [unrankedOpen, setUnrankedOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-1.5">
        {ranked.map((item) => (
          <PosterCell
            key={item.user_movie_id}
            url={item.movie.poster_url}
            title={item.movie.title}
            year={item.movie.year}
            rank={item.rank}
          />
        ))}
      </div>

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
            <div className="grid grid-cols-12 gap-1.5 mt-3">
              {unranked.map((item) => (
                <PosterCell
                  key={item.user_movie_id}
                  url={item.movie.poster_url}
                  title={item.movie.title}
                  year={item.movie.year}
                  dimmed
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
