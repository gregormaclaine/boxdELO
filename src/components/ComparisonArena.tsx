"use client";

import { useState } from "react";
import MovieCard from "./MovieCard";
import Button from "./ui/Button";
import type { PairResponse } from "@/types/api";

interface ComparisonArenaProps {
  pair: PairResponse;
  onPick: (winnerId: string, loserId: string) => void;
  onSkip: () => void;
  onExclude: (userMovieId: string) => void;
  disabled?: boolean;
}

export default function ComparisonArena({
  pair,
  onPick,
  onSkip,
  onExclude,
  disabled = false,
}: ComparisonArenaProps) {
  const [excludeOpen, setExcludeOpen] = useState(false);
  const { movieA, movieB } = pair;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Movie cards */}
      <div className="flex items-center gap-6 sm:gap-10">
        <MovieCard
          movie={movieA}
          variant="comparison"
          onClick={disabled ? undefined : () => onPick(movieA.user_movie_id, movieB.user_movie_id)}
        />

        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
          <span className="text-xs font-bold text-text-muted tracking-widest">VS</span>
        </div>

        <MovieCard
          movie={movieB}
          variant="comparison"
          onClick={disabled ? undefined : () => onPick(movieB.user_movie_id, movieA.user_movie_id)}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onSkip} disabled={disabled}>
          Skip this matchup
        </Button>

        <div className="relative">
          <button
            className="text-xs text-danger/70 hover:text-danger transition-colors"
            onClick={() => setExcludeOpen((o) => !o)}
            disabled={disabled}
          >
            Exclude a movie from ranking
          </button>

          {excludeOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-bg-surface border border-border rounded-md shadow-xl shadow-black/40 min-w-[200px] overflow-hidden z-10">
              <p className="px-3 py-2 text-xs text-text-muted border-b border-border">
                Move to unranked:
              </p>
              {[movieA, movieB].map((m) => (
                <button
                  key={m.user_movie_id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-bg-elevated transition-colors text-text-primary"
                  onClick={() => {
                    setExcludeOpen(false);
                    onExclude(m.user_movie_id);
                  }}
                >
                  {m.title}
                  {m.year && (
                    <span className="text-text-muted ml-1 text-xs">({m.year})</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
