import type { ConfidenceInfo } from "@/types/domain";

const K = 32;
const SPREAD = 400;
export const STARTING_ELO = 1000;

function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / SPREAD));
}

function calcNewElo(currentElo: number, actual: number, opponentElo: number, k: number): number {
  const expected = expectedScore(currentElo, opponentElo);
  return Math.round((currentElo + k * (actual - expected)) * 10) / 10;
}

export function applyComparison(
  winnerElo: number,
  loserElo: number,
  strong = false,
): [number, number] {
  const k = strong ? K * 2 : K;
  return [
    calcNewElo(winnerElo, 1, loserElo, k),
    calcNewElo(loserElo, 0, winnerElo, k),
  ];
}

export function calculateConfidence(
  totalComparisons: number,
  activeMovieCount: number
): ConfidenceInfo {
  if (activeMovieCount < 2) {
    return {
      percentage: 100,
      label: "Well ranked",
      total_comparisons: totalComparisons,
      target_comparisons: 0,
    };
  }

  const target = Math.round(activeMovieCount * Math.log2(activeMovieCount));
  const percentage = Math.min(100, Math.round((totalComparisons / target) * 100));
  const label =
    percentage < 30
      ? "Building baseline"
      : percentage < 70
        ? "Getting confident"
        : "Well ranked";

  return { percentage, label, total_comparisons: totalComparisons, target_comparisons: target };
}

interface UserMovieSlim {
  id: string;
  elo_score: number;
  comparisons_count: number;
}

export function selectNextPair(
  userMovies: UserMovieSlim[]
): [string, string] | null {
  if (userMovies.length < 2) return null;

  const sorted = [...userMovies].sort((a, b) => a.elo_score - b.elo_score);
  let bestPair: [UserMovieSlim, UserMovieSlim] | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const eloDiff = Math.abs(a.elo_score - b.elo_score);
    const minComps = Math.min(a.comparisons_count, b.comparisons_count);
    // Jitter prevents always picking the same pair when scores are equal
    const jitter = Math.random() * 20 - 10;
    const score = eloDiff + 0.5 * minComps + jitter;
    if (score < bestScore) {
      bestScore = score;
      bestPair = [a, b];
    }
  }

  if (!bestPair) return null;

  return Math.random() > 0.5
    ? [bestPair[0].id, bestPair[1].id]
    : [bestPair[1].id, bestPair[0].id];
}
