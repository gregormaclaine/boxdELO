"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import type { RankedMovie } from "@/types/domain";
import { starsToLabel, type StarBoundaries } from "@/lib/stars";

const STAR_TIERS: number[] = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];

interface BoundaryEditorProps {
  ranked: RankedMovie[];
  boundaries: StarBoundaries;
  onChange: (boundaries: StarBoundaries) => void;
  onReset: () => void;
  onDone: () => void;
}

type ContextMenuState = {
  movieId: string;
  x: number;
  y: number;
} | null;

type DragState = {
  dividerIndex: number;
  targetRank: number | null;
} | null;

type FlatItem =
  | { type: "movie"; movie: RankedMovie }
  | { type: "divider"; stars: number; dividerIndex: number };

function buildFlatList(ranked: RankedMovie[], boundaries: StarBoundaries): FlatItem[] {
  const rankMap = new Map(ranked.map(m => [m.user_movie_id, m.rank]));

  const resolved = boundaries
    .map((b, i) => ({ stars: b.stars, resolvedRank: rankMap.get(b.movieId) ?? -1, index: i }))
    .filter(b => b.resolvedRank > 0)
    .sort((a, b) => a.resolvedRank - b.resolvedRank);

  const items: FlatItem[] = [];
  let bPtr = 0;

  for (const movie of ranked) {
    items.push({ type: "movie", movie });
    while (bPtr < resolved.length && resolved[bPtr].resolvedRank === movie.rank) {
      items.push({ type: "divider", stars: resolved[bPtr].stars, dividerIndex: resolved[bPtr].index });
      bPtr++;
    }
  }

  return items;
}

function getValidRange(
  dividerIndex: number,
  boundaries: StarBoundaries,
  ranked: RankedMovie[]
): { min: number; max: number } {
  const rankMap = new Map(ranked.map(m => [m.user_movie_id, m.rank]));

  const sorted = boundaries
    .map((b, i) => ({ rank: rankMap.get(b.movieId) ?? -1, index: i }))
    .filter(b => b.rank > 0)
    .sort((a, b) => a.rank - b.rank);

  const myPos = sorted.findIndex(b => b.index === dividerIndex);
  const prevRank = myPos > 0 ? sorted[myPos - 1].rank : 0;
  const nextRank = myPos < sorted.length - 1 ? sorted[myPos + 1].rank : ranked.length + 1;

  return { min: prevRank + 1, max: nextRank - 1 };
}

function cascadeAndSetBoundary(
  boundaries: StarBoundaries,
  stars: number,
  movieId: string,
  ranked: RankedMovie[]
): StarBoundaries {
  const rankMap = new Map(ranked.map(m => [m.user_movie_id, m.rank]));

  const existingIndex = boundaries.findIndex(b => b.stars === stars);
  let updated: StarBoundaries;

  if (existingIndex >= 0) {
    updated = boundaries.map((b, i) => (i === existingIndex ? { ...b, movieId } : b));
  } else {
    updated = [...boundaries, { movieId, stars }].sort((a, b) => b.stars - a.stars);
  }

  // Cascade: ensure rank ordering (higher stars tier must have lower/equal rank)
  for (let i = 1; i < updated.length; i++) {
    const prevRank = rankMap.get(updated[i - 1].movieId) ?? 0;
    const currRank = rankMap.get(updated[i].movieId) ?? 0;
    if (currRank <= prevRank) {
      const nextMovie = ranked.find(m => m.rank === prevRank + 1);
      if (nextMovie) {
        updated[i] = { ...updated[i], movieId: nextMovie.user_movie_id };
      } else {
        updated.splice(i, 1);
        i--;
      }
    }
  }

  return updated;
}

export default function BoundaryEditor({
  ranked,
  boundaries,
  onChange,
  onReset,
  onDone,
}: BoundaryEditorProps) {
  const [dragState, setDragState] = useState<DragState>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const flatItems = useMemo(() => buildFlatList(ranked, boundaries), [ranked, boundaries]);

  const commitDrag = useCallback(
    (dividerIndex: number, targetRank: number) => {
      const movie = ranked.find(m => m.rank === targetRank);
      if (!movie) return;
      onChange(boundaries.map((b, i) => (i === dividerIndex ? { ...b, movieId: movie.user_movie_id } : b)));
    },
    [boundaries, onChange, ranked]
  );

  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const row = el?.closest("[data-rank]") as HTMLElement | null;
      if (!row?.dataset.rank) return;

      const rank = parseInt(row.dataset.rank);
      const { min, max } = getValidRange(dragState.dividerIndex, boundaries, ranked);
      setDragState(prev => (prev ? { ...prev, targetRank: Math.max(min, Math.min(max, rank)) } : null));
    };

    const onUp = () => {
      if (dragState.targetRank !== null) commitDrag(dragState.dividerIndex, dragState.targetRank);
      setDragState(null);
      document.body.style.cursor = "";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragState, boundaries, ranked, commitDrag]);

  // Close context menu on next click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler, { once: true });
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleSetAsBoundary = useCallback(
    (stars: number) => {
      if (!contextMenu) return;
      onChange(cascadeAndSetBoundary(boundaries, stars, contextMenu.movieId, ranked));
      setContextMenu(null);
    },
    [contextMenu, boundaries, onChange, ranked]
  );

  const dropTargetRank = dragState?.targetRank;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-text-muted">
          Drag dividers or right-click any film to set a boundary
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-xs px-2.5 py-1.5 text-text-muted hover:text-text-primary border border-border rounded-md transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onDone}
            className="text-xs px-3 py-1.5 bg-accent text-white rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>

      <div className={dragState ? "select-none" : ""}>
        {flatItems.map((item) => {
          if (item.type === "movie") {
            const isDropTarget = dropTargetRank === item.movie.rank;
            return (
              <div key={item.movie.user_movie_id}>
                <div
                  data-rank={item.movie.rank}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ movieId: item.movie.user_movie_id, x: e.clientX, y: e.clientY });
                  }}
                  className="flex items-center gap-2.5 px-2 py-1 rounded hover:bg-bg-elevated cursor-context-menu"
                >
                  <span className="text-[10px] font-bold text-text-muted tabular-nums w-7 text-right shrink-0">
                    {item.movie.rank}
                  </span>
                  <div className="relative shrink-0 w-6 h-9 rounded overflow-hidden bg-bg-elevated">
                    {item.movie.movie.poster_url && (
                      <Image
                        src={item.movie.movie.poster_url}
                        alt={item.movie.movie.title}
                        fill
                        className="object-cover"
                        sizes="24px"
                      />
                    )}
                  </div>
                  <span className="text-xs text-text-primary truncate flex-1">
                    {item.movie.movie.title}
                    {item.movie.movie.year && (
                      <span className="text-text-muted ml-1.5">({item.movie.movie.year})</span>
                    )}
                  </span>
                </div>
                {isDropTarget && dragState && (
                  <DropIndicator stars={boundaries[dragState.dividerIndex].stars} />
                )}
              </div>
            );
          }

          const isDraggingThis = dragState?.dividerIndex === item.dividerIndex;
          return (
            <DividerRow
              key={`divider-${item.stars}`}
              stars={item.stars}
              isDragging={isDraggingThis}
              onPointerDown={(e) => {
                e.preventDefault();
                document.body.style.cursor = "grabbing";
                setDragState({ dividerIndex: item.dividerIndex, targetRank: null });
              }}
              onRemove={() => onChange(boundaries.filter((_, i) => i !== item.dividerIndex))}
            />
          );
        })}
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          {STAR_TIERS.map((stars) => (
            <button
              key={stars}
              onClick={() => handleSetAsBoundary(stars)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-text-primary hover:bg-bg-elevated transition-colors"
            >
              Set as bottom of {starsToLabel(stars)}
            </button>
          ))}
        </ContextMenu>
      )}
    </div>
  );
}

function DividerRow({
  stars,
  isDragging,
  onPointerDown,
  onRemove,
}: {
  stars: number;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 my-1 group/divider ${isDragging ? "opacity-30" : ""}`}
      style={isDragging ? { pointerEvents: "none" } : undefined}
    >
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-1">
        <button
          className="opacity-0 group-hover/divider:opacity-100 transition-opacity p-0.5 rounded hover:bg-bg-elevated text-text-muted hover:text-danger"
          onClick={onRemove}
          title="Remove boundary"
        >
          <RemoveIcon />
        </button>
        <div
          className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing touch-none px-1"
          onPointerDown={onPointerDown}
        >
          <GrabHandle />
          <span className="text-sm font-semibold text-accent tracking-tight select-none">
            {starsToLabel(stars)}
          </span>
          <GrabHandle />
        </div>
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function DropIndicator({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-3 my-1 pointer-events-none">
      <div className="h-0.5 flex-1 bg-accent rounded" />
      <span className="text-sm font-semibold text-accent tracking-tight select-none px-0.5">
        {starsToLabel(stars)}
      </span>
      <div className="h-0.5 flex-1 bg-accent rounded" />
    </div>
  );
}

function GrabHandle() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" className="text-text-muted">
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="6" cy="2" r="1.2" />
      <circle cx="2" cy="6" r="1.2" />
      <circle cx="6" cy="6" r="1.2" />
      <circle cx="2" cy="10" r="1.2" />
      <circle cx="6" cy="10" r="1.2" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="1" y1="1" x2="9" y2="9" />
      <line x1="9" y1="1" x2="1" y2="9" />
    </svg>
  );
}

function ContextMenu({
  x,
  y,
  children,
  onClose,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-bg-surface border border-border rounded-md shadow-xl py-1 min-w-[200px]"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
