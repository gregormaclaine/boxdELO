"use client";

import { useState } from "react";
import Image from "next/image";
import MovieCard from "./MovieCard";
import Button from "./ui/Button";
import type { RankedMovie } from "@/types/domain";

type Step = "disclaimer" | "select" | "compare" | "done";

interface Props {
  username: string;
  ranked: RankedMovie[];
  onClose: () => void;
  onCompared: () => void;
}

export default function ManualComparisonModal({ username, ranked, onClose, onCompared }: Props) {
  const [step, setStep] = useState<Step>("disclaimer");
  const [selected, setSelected] = useState<RankedMovie[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleSelect(movie: RankedMovie) {
    setSelected((prev) => {
      if (prev.some((m) => m.user_movie_id === movie.user_movie_id)) {
        return prev.filter((m) => m.user_movie_id !== movie.user_movie_id);
      }
      if (prev.length >= 2) return prev;
      return [...prev, movie];
    });
  }

  async function submitComparison(winnerId: string, loserId: string, strong: boolean) {
    setSubmitting(true);
    await fetch(`/api/${username}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner_movie_id: winnerId,
        loser_movie_id: loserId,
        was_skipped: false,
        strong,
        is_manual: true,
      }),
    });
    setSubmitting(false);
    onCompared();
    setStep("done");
  }

  const [movieA, movieB] = selected;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="relative z-10 bg-bg-surface border border-border rounded-lg shadow-2xl shadow-black/60 w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Manual Comparison</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === "disclaimer" && (
            <DisclaimerStep onContinue={() => setStep("select")} onCancel={onClose} />
          )}
          {step === "select" && (
            <SelectStep
              ranked={ranked}
              selected={selected}
              onToggle={toggleSelect}
              onCompare={() => setStep("compare")}
              onBack={onClose}
            />
          )}
          {step === "compare" && movieA && movieB && (
            <CompareStep
              movieA={movieA}
              movieB={movieB}
              submitting={submitting}
              onPick={submitComparison}
              onBack={() => setStep("select")}
            />
          )}
          {step === "done" && (
            <DoneStep
              onClose={onClose}
              onAnother={() => {
                setSelected([]);
                setStep("select");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DisclaimerStep({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  return (
    <div className="px-5 py-6 flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-primary leading-relaxed">
          Manually picking which movies to compare introduces <span className="text-text-primary font-medium">selection bias</span> — you&apos;ll
          naturally choose matchups you already have opinions on, which can over-represent certain
          films and subtly skew the overall ranking.
        </p>
        <p className="text-sm text-text-muted leading-relaxed">
          The random matchup system avoids this by design. Use manual comparisons sparingly,
          for cases where you&apos;re confident a specific pair is obviously wrong.
        </p>
        <p className="text-sm text-text-muted leading-relaxed">
          Manual comparisons are tagged as such in the database.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onContinue}>I understand, continue →</Button>
      </div>
    </div>
  );
}

function SelectStep({
  ranked,
  selected,
  onToggle,
  onCompare,
  onBack,
}: {
  ranked: RankedMovie[];
  selected: RankedMovie[];
  onToggle: (m: RankedMovie) => void;
  onCompare: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {selected.length === 0 && "Select 2 movies to compare"}
          {selected.length === 1 && "Select 1 more movie"}
          {selected.length === 2 && "Ready to compare"}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>Cancel</Button>
          <Button size="sm" disabled={selected.length < 2} onClick={onCompare}>
            Compare →
          </Button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1.5">
          {ranked.map((item) => {
            const selIdx = selected.findIndex((m) => m.user_movie_id === item.user_movie_id);
            const isSelected = selIdx !== -1;
            const isDisabled = !isSelected && selected.length >= 2;

            return (
              <button
                key={item.user_movie_id}
                onClick={() => onToggle(item)}
                disabled={isDisabled}
                className={[
                  "relative aspect-2/3 rounded overflow-hidden bg-bg-elevated transition-opacity",
                  isDisabled ? "opacity-25 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                {item.movie.poster_url ? (
                  <Image
                    src={item.movie.poster_url}
                    alt={item.movie.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-muted text-[8px] text-center px-1 leading-tight">
                    {item.movie.title}
                  </div>
                )}

                {/* Hover overlay */}
                {!isSelected && !isDisabled && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[9px] font-medium text-center px-1 leading-tight">
                      {item.movie.title}
                    </span>
                  </div>
                )}

                {/* Selection badge */}
                {isSelected && (
                  <div className="absolute inset-0 ring-2 ring-accent rounded">
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{selIdx + 1}</span>
                    </div>
                    <div className="absolute inset-0 bg-accent/20" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompareStep({
  movieA,
  movieB,
  submitting,
  onPick,
  onBack,
}: {
  movieA: RankedMovie;
  movieB: RankedMovie;
  submitting: boolean;
  onPick: (winnerId: string, loserId: string, strong: boolean) => void;
  onBack: () => void;
}) {
  const a = { ...movieA.movie, user_movie_id: movieA.user_movie_id, elo_score: movieA.elo_score };
  const b = { ...movieB.movie, user_movie_id: movieB.user_movie_id, elo_score: movieB.elo_score };

  return (
    <div className="px-5 py-6 flex flex-col items-center gap-6">
      <p className="text-xs text-text-muted">Which is better?</p>

      <div className="flex items-center gap-6 sm:gap-10">
        <div className="flex flex-col items-center gap-2">
          <MovieCard
            movie={a}
            variant="comparison"
            onClick={submitting ? undefined : () => onPick(a.user_movie_id, b.user_movie_id, false)}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={submitting}
            onClick={() => onPick(a.user_movie_id, b.user_movie_id, true)}
          >
            Way better
          </Button>
        </div>

        <div className="shrink-0 w-10 h-10 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
          <span className="text-xs font-bold text-text-muted tracking-widest">VS</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <MovieCard
            movie={b}
            variant="comparison"
            onClick={submitting ? undefined : () => onPick(b.user_movie_id, a.user_movie_id, false)}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={submitting}
            onClick={() => onPick(b.user_movie_id, a.user_movie_id, true)}
          >
            Way better
          </Button>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onBack} disabled={submitting}>
        ← Back to selection
      </Button>
    </div>
  );
}

function DoneStep({ onClose, onAnother }: { onClose: () => void; onAnother: () => void }) {
  return (
    <div className="px-5 py-10 flex flex-col items-center gap-4 text-center">
      <p className="text-sm font-medium text-text-primary">Comparison added</p>
      <p className="text-xs text-text-muted">The ranking has been updated with your manual comparison.</p>
      <div className="flex items-center gap-3 mt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        <Button size="sm" onClick={onAnother}>Compare another pair →</Button>
      </div>
    </div>
  );
}
