"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { RankedMovie, UnrankedMovie } from "@/types/domain";
import { starsToLabel, applyBoundaries, type StarBoundaries } from "@/lib/stars";

interface RankingGridProps {
  ranked: RankedMovie[];
  unranked: UnrankedMovie[];
  boundaries?: StarBoundaries;
  onEditBoundaries?: () => void;
  onResetBoundaries?: () => void;
  isCustomized?: boolean;
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
    <div className={`relative group aspect-2/3 ${dimmed ? "opacity-40" : ""}`}>
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

function SectionDivider({ label, onEdit, onReset }: { label: string; onEdit?: () => void; onReset?: () => void }) {
  return (
    <div className="flex items-center gap-3 w-full group/section">
      <div className="h-px flex-1 bg-border" />
      <span className="text-sm font-semibold text-accent tracking-tight px-2">{label}</span>
      <div className="h-px flex-1 bg-border" />
      {onReset && (
        <button
          onClick={onReset}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity text-[10px] text-text-muted hover:text-text-primary shrink-0"
          title="Reset to auto boundaries"
        >
          reset
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 shrink-0"
          title="Edit star boundaries"
        >
          <PencilIcon />
          edit
        </button>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" />
    </svg>
  );
}

export default function RankingGrid({ ranked, unranked, boundaries, onEditBoundaries, onResetBoundaries, isCustomized }: RankingGridProps) {
  const [unrankedOpen, setUnrankedOpen] = useState(false);

  const effectiveStars = useMemo(() => {
    if (!boundaries || boundaries.length === 0) return null;
    return applyBoundaries(ranked, boundaries);
  }, [ranked, boundaries]);

  const getStars = (movie: RankedMovie): number | null => {
    if (effectiveStars) return effectiveStars.get(movie.user_movie_id) ?? null;
    return movie.suggested_stars;
  };

  const hasStarRatings = effectiveStars
    ? true
    : ranked.some((m) => m.suggested_stars !== null);

  const groupedByStars = hasStarRatings
    ? (() => {
        const map = new Map<number, RankedMovie[]>();
        for (const movie of ranked) {
          const stars = getStars(movie);
          if (stars !== null) {
            const group = map.get(stars) ?? [];
            group.push(movie);
            map.set(stars, group);
          }
        }
        return Array.from(map.entries()).sort(([a], [b]) => b - a);
      })()
    : null;

  return (
    <div className="w-full space-y-4">
      {groupedByStars ? (
        groupedByStars.map(([stars, movies], i) => (
          <div key={stars}>
            <SectionDivider
              label={starsToLabel(stars)}
              onEdit={i === 0 ? onEditBoundaries : undefined}
              onReset={i === 0 && isCustomized ? onResetBoundaries : undefined}
            />
            <div className="grid grid-cols-12 gap-1.5 mt-3">
              {movies.map((item) => (
                <PosterCell
                  key={item.user_movie_id}
                  url={item.movie.poster_url}
                  title={item.movie.title}
                  year={item.movie.year}
                  rank={item.rank}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
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
      )}

      {unranked.length > 0 && (
        <div>
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
