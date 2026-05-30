"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation";
import RankingTable from "@/components/RankingTable";
import RankingGrid from "@/components/RankingGrid";
import ReleaseOrderGrid from "@/components/ReleaseOrderGrid";
import BoundaryEditor from "@/components/BoundaryEditor";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import Spinner from "@/components/ui/Spinner";
import Link from "next/link";
import ManualComparisonModal from "@/components/ManualComparisonModal";
import type { RankingResponse } from "@/types/api";
import { type StarBoundaries, initBoundariesFromSuggested } from "@/lib/stars";

type View = "table" | "grid" | "release";

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

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <line x1="5" y1="1.5" x2="5" y2="4.5" />
      <line x1="11" y1="1.5" x2="11" y2="4.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
    </svg>
  );
}

function storageKey(username: string) {
  return `star-boundaries:${username}`;
}

export default function ResultsPage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawView = searchParams.get("view");
  const view: View = rawView === "grid" || rawView === "release" ? rawView : "table";

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "table") {
      params.delete("view");
    } else {
      params.set("view", next);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [boundaries, setBoundaries] = useState<StarBoundaries>([]);
  const [editingBoundaries, setEditingBoundaries] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Track whether we've initialized boundaries so we don't overwrite user customizations on data refresh
  const boundariesInitialized = useRef(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    const handler = (e: MouseEvent) => {
      if (!actionsRef.current?.contains(e.target as Node)) setActionsOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [actionsOpen]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey(username));
    if (!stored) return;
    try {
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (item): item is StarBoundaries[number] =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).movieId === "string" &&
          typeof (item as Record<string, unknown>).stars === "number"
      );
      if (valid.length > 0) {
        setBoundaries(valid);
        boundariesInitialized.current = true;
      }
    } catch {
      // Ignore malformed stored data
    }
  }, [username]);

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
  }, [username, refreshKey]);

  // Initialize boundaries from suggested_stars once data loads (only if no stored boundaries)
  useEffect(() => {
    if (!data || boundariesInitialized.current) return;
    const hasSuggested = data.ranked.some(m => m.suggested_stars !== null);
    if (!hasSuggested) return;
    const initial = initBoundariesFromSuggested(data.ranked);
    setBoundaries(initial);
    boundariesInitialized.current = true;
  }, [data]);

  // Persist to localStorage whenever boundaries change
  useEffect(() => {
    if (boundaries.length === 0) return;
    localStorage.setItem(storageKey(username), JSON.stringify(boundaries));
  }, [boundaries, username]);

  const handleResetBoundaries = useCallback(() => {
    if (!data) return;
    const initial = initBoundariesFromSuggested(data.ranked);
    setBoundaries(initial);
  }, [data]);

  const isCustomized = useMemo(() => {
    if (!data) return false;
    const suggested = initBoundariesFromSuggested(data.ranked);
    return JSON.stringify(boundaries) !== JSON.stringify(suggested);
  }, [boundaries, data]);

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
          <h1 className="text-xl font-bold tracking-tight">
            {editingBoundaries ? "Edit Star Boundaries" : "Your Ranking"}
          </h1>
          <div className="flex items-center gap-2">
            {!editingBoundaries && (
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
                <button
                  className={`px-2.5 py-1.5 transition-colors border-l border-border ${view === "release" ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-primary"}`}
                  onClick={() => setView("release")}
                  title="Release order"
                >
                  <CalendarIcon />
                </button>
              </div>
            )}
            {!editingBoundaries && (
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => setActionsOpen(o => !o)}
                  className={`px-2 py-1.5 border border-border rounded-md transition-colors ${actionsOpen ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-primary"}`}
                  title="Actions"
                >
                  <DotsIcon />
                </button>
                {actionsOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-bg-surface border border-border rounded-md shadow-xl py-1 min-w-45 z-20">
                    <Link
                      href={`/${username}/reimport`}
                      className="block w-full px-3 py-1.5 text-xs text-left text-text-primary hover:bg-bg-elevated transition-colors"
                      onClick={() => setActionsOpen(false)}
                    >
                      Check for new films
                    </Link>
                    {data && data.ranked.length >= 2 && (
                      <button
                        className="block w-full px-3 py-1.5 text-xs text-left text-text-primary hover:bg-bg-elevated transition-colors"
                        onClick={() => { setManualModalOpen(true); setActionsOpen(false); }}
                      >
                        Add manual comparison
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
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
                <Link
                  href={`/${username}/import`}
                  className="text-xs px-3 py-1.5 border border-border rounded-md text-text-muted hover:text-text-primary transition-colors"
                >
                  Import films
                </Link>
              </div>
            ) : (
              <>
                {data.confidence.percentage < 30 && !editingBoundaries && (
                  <div className="mb-4 px-3 py-2.5 bg-bg-surface border border-border rounded-md">
                    <p className="text-xs text-text-muted">
                      Star ratings will appear once you&apos;ve done enough comparisons. Keep ranking!
                    </p>
                  </div>
                )}
                {editingBoundaries ? (
                  <BoundaryEditor
                    ranked={data.ranked}
                    boundaries={boundaries}
                    onChange={setBoundaries}
                    onReset={handleResetBoundaries}
                    onDone={() => setEditingBoundaries(false)}
                  />
                ) : view === "table" ? (
                  <RankingTable ranked={data.ranked} unranked={data.unranked} />
                ) : view === "grid" ? (
                  <RankingGrid
                    ranked={data.ranked}
                    unranked={data.unranked}
                    boundaries={boundaries}
                    onEditBoundaries={() => setEditingBoundaries(true)}
                    onResetBoundaries={handleResetBoundaries}
                    isCustomized={isCustomized}
                  />
                ) : (
                  <ReleaseOrderGrid ranked={data.ranked} unranked={data.unranked} />
                )}
              </>
            )}
          </>
        )}
      </div>
      {manualModalOpen && data && (
        <ManualComparisonModal
          username={username}
          ranked={data.ranked}
          onClose={() => setManualModalOpen(false)}
          onCompared={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
