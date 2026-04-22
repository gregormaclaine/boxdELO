"use client";

import Image from "next/image";
import type { RankedMovie, UnrankedMovie } from "@/types/domain";
import { starsToLabel } from "@/lib/stars";

interface ReleaseOrderGridProps {
  ranked: RankedMovie[];
  unranked: UnrankedMovie[];
}

function ReleaseOrderCell({
  url,
  title,
  year,
  stars,
  dimmed = false,
}: {
  url: string | null;
  title: string;
  year: number | null;
  stars?: number | null;
  dimmed?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className={`relative group aspect-[2/3] ${dimmed ? "opacity-40" : ""}`}>
        <div className="relative w-full h-full rounded overflow-hidden bg-bg-elevated">
          {url ? (
            <Image src={url} alt={title} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-[8px] text-center px-1 leading-tight">
              {title}
            </div>
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

      {stars !== null && stars !== undefined && (
        <p className="text-center text-[9px] text-accent mt-0.5 leading-tight tracking-tight">
          {starsToLabel(stars)}
        </p>
      )}
    </div>
  );
}

type CombinedEntry =
  | { kind: "ranked"; item: RankedMovie; release_date: string | null }
  | { kind: "unranked"; item: UnrankedMovie; release_date: string | null };

export default function ReleaseOrderGrid({ ranked, unranked }: ReleaseOrderGridProps) {
  const combined: CombinedEntry[] = [
    ...ranked.map((item): CombinedEntry => ({
      kind: "ranked",
      item,
      release_date: item.movie.release_date,
    })),
    ...unranked.map((item): CombinedEntry => ({
      kind: "unranked",
      item,
      release_date: item.movie.release_date,
    })),
  ];

  combined.sort((a, b) => {
    if (!a.release_date && !b.release_date) return 0;
    if (!a.release_date) return 1;
    if (!b.release_date) return -1;
    return a.release_date < b.release_date ? 1 : a.release_date > b.release_date ? -1 : 0;
  });

  return (
    <div className="grid grid-cols-12 gap-1.5">
      {combined.map((entry) => {
        if (entry.kind === "ranked") {
          const m = entry.item;
          return (
            <ReleaseOrderCell
              key={m.user_movie_id}
              url={m.movie.poster_url}
              title={m.movie.title}
              year={m.movie.year}
              stars={m.suggested_stars}
            />
          );
        } else {
          const m = entry.item;
          return (
            <ReleaseOrderCell
              key={m.user_movie_id}
              url={m.movie.poster_url}
              title={m.movie.title}
              year={m.movie.year}
              dimmed
            />
          );
        }
      })}
    </div>
  );
}
