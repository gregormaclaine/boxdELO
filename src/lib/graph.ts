import type { ClassifiedEdge } from "@/types/graph";

interface RawComparison {
  winner_movie_id: string;
  loser_movie_id: string;
  created_at: string;
}

interface DeduplicatedEdge {
  from: string;
  to: string;
}

export function deduplicateComparisons(comparisons: RawComparison[]): DeduplicatedEdge[] {
  const pairData = new Map<string, { aBeatsB: number; bBeatsA: number; latestIsAB: boolean }>();

  for (const c of comparisons) {
    const a = c.winner_movie_id;
    const b = c.loser_movie_id;
    const key = [a < b ? a : b, a < b ? b : a].join(":");
    const isAB = a < b;

    const existing = pairData.get(key) ?? { aBeatsB: 0, bBeatsA: 0, latestIsAB: isAB };
    if (isAB) {
      existing.aBeatsB++;
    } else {
      existing.bBeatsA++;
    }
    existing.latestIsAB = isAB;
    pairData.set(key, existing);
  }

  const edges: DeduplicatedEdge[] = [];
  for (const [key, data] of pairData) {
    const [a, b] = key.split(":");
    const aWins = data.aBeatsB > data.bBeatsA || (data.aBeatsB === data.bBeatsA && data.latestIsAB);
    edges.push(aWins ? { from: a, to: b } : { from: b, to: a });
  }
  return edges;
}

function buildAdjacency(edges: DeduplicatedEdge[], allNodes: string[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const id of allNodes) adj.set(id, new Set());
  for (const { from, to } of edges) {
    adj.get(from)!.add(to);
  }
  return adj;
}

function reverseAdj(adj: Map<string, Set<string>>): Map<string, Set<string>> {
  const rev = new Map<string, Set<string>>();
  for (const id of adj.keys()) rev.set(id, new Set());
  for (const [from, tos] of adj) {
    for (const to of tos) {
      rev.get(to)!.add(from);
    }
  }
  return rev;
}

// Kosaraju's SCC algorithm. Returns array of SCCs, each SCC is an array of node IDs.
function findSCCs(adj: Map<string, Set<string>>): string[][] {
  const nodes = Array.from(adj.keys());
  const visited = new Set<string>();
  const finishOrder: string[] = [];

  function dfs1(node: string) {
    const stack: Array<{ node: string; iter: Iterator<string> }> = [
      { node, iter: adj.get(node)![Symbol.iterator]() },
    ];
    visited.add(node);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const next = top.iter.next();
      if (next.done) {
        stack.pop();
        finishOrder.push(top.node);
      } else {
        const neighbour = next.value;
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          stack.push({ node: neighbour, iter: adj.get(neighbour)![Symbol.iterator]() });
        }
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node)) dfs1(node);
  }

  const rev = reverseAdj(adj);
  const visited2 = new Set<string>();
  const sccs: string[][] = [];

  function dfs2(start: string): string[] {
    const component: string[] = [];
    const stack = [start];
    visited2.add(start);
    while (stack.length) {
      const node = stack.pop()!;
      component.push(node);
      for (const neighbour of rev.get(node) ?? []) {
        if (!visited2.has(neighbour)) {
          visited2.add(neighbour);
          stack.push(neighbour);
        }
      }
    }
    return component;
  }

  for (let i = finishOrder.length - 1; i >= 0; i--) {
    const node = finishOrder[i];
    if (!visited2.has(node)) {
      sccs.push(dfs2(node));
    }
  }

  return sccs;
}

export function classifyEdges(
  comparisons: RawComparison[],
  allMovieIds: string[],
): ClassifiedEdge[] {
  const movieIdSet = new Set(allMovieIds);
  const deduped = deduplicateComparisons(comparisons).filter(
    ({ from, to }) => movieIdSet.has(from) && movieIdSet.has(to),
  );
  if (deduped.length === 0) return [];

  const adj = buildAdjacency(deduped, allMovieIds);
  const sccs = findSCCs(adj);

  // Map each node to its SCC index
  const sccOf = new Map<string, number>();
  for (let i = 0; i < sccs.length; i++) {
    for (const node of sccs[i]) sccOf.set(node, i);
  }

  const result: ClassifiedEdge[] = [];

  // Edges within the same SCC (cycle size >= 2) are cycle edges
  const cycleEdges = new Set<string>();
  for (const { from, to } of deduped) {
    if (sccOf.get(from) === sccOf.get(to) && sccs[sccOf.get(from)!].length >= 2) {
      cycleEdges.add(`${from}:${to}`);
      result.push({ from, to, kind: "cycle" });
    }
  }

  // Build condensed DAG (super-node adjacency)
  const condensedAdj = new Map<number, Set<number>>();
  for (let i = 0; i < sccs.length; i++) condensedAdj.set(i, new Set());

  for (const { from, to } of deduped) {
    const su = sccOf.get(from)!;
    const sv = sccOf.get(to)!;
    if (su !== sv) condensedAdj.get(su)!.add(sv);
  }

  // Topological sort of condensed DAG (Kahn's algorithm)
  const inDegree = new Map<number, number>();
  for (const i of condensedAdj.keys()) inDegree.set(i, 0);
  for (const [, neighbours] of condensedAdj) {
    for (const v of neighbours) inDegree.set(v, (inDegree.get(v) ?? 0) + 1);
  }

  const topoOrder: number[] = [];
  const queue = Array.from(inDegree.entries())
    .filter(([, d]) => d === 0)
    .map(([i]) => i);

  while (queue.length) {
    const u = queue.shift()!;
    topoOrder.push(u);
    for (const v of condensedAdj.get(u) ?? []) {
      const d = inDegree.get(v)! - 1;
      inDegree.set(v, d);
      if (d === 0) queue.push(v);
    }
  }

  // Transitive reduction on condensed DAG (process in reverse topo order)
  const reachable = new Map<number, Set<number>>();
  for (const i of condensedAdj.keys()) reachable.set(i, new Set());

  const directCondensedEdges = new Set<string>();

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const u = topoOrder[i];
    for (const v of condensedAdj.get(u) ?? []) {
      if (reachable.get(u)!.has(v)) {
        // redundant — v is reachable via another child
      } else {
        directCondensedEdges.add(`${u}:${v}`);
        // Add v and everything reachable from v into reachable[u]
        reachable.get(u)!.add(v);
        for (const r of reachable.get(v) ?? []) reachable.get(u)!.add(r);
      }
    }
  }

  // Map condensed edges back to original movie edges
  for (const { from, to } of deduped) {
    if (cycleEdges.has(`${from}:${to}`)) continue; // already classified
    const su = sccOf.get(from)!;
    const sv = sccOf.get(to)!;
    const kind = directCondensedEdges.has(`${su}:${sv}`) ? "direct" : "redundant";
    result.push({ from, to, kind });
  }

  return result;
}
