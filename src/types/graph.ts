export interface GraphMovie {
  id: string;
  title: string;
  year: number | null;
  poster_url: string | null;
  elo_score: number;
  rank: number;
  x: number;
  y: number;
}

export interface GraphResponse {
  movies: GraphMovie[];
  edges: GraphEdge[];
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "direct" | "cycle";
}

// Internal use in lib/graph.ts only
export type EdgeKind = "direct" | "cycle" | "redundant";

export interface ClassifiedEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}
