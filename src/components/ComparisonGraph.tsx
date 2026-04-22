"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import axios from "axios";
import "@xyflow/react/dist/style.css";

import Spinner from "@/components/ui/Spinner";
import MovieNode from "@/components/graph/MovieNode";
import CycleEdge from "@/components/graph/CycleEdge";
import type { GraphResponse } from "@/types/graph";

const nodeTypes = { movie: MovieNode };
const edgeTypes = { cycle: CycleEdge };

interface ComparisonGraphProps {
  username: string;
}

export default function ComparisonGraph({ username }: ComparisonGraphProps) {
  const [data, setData] = useState<GraphResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios
      .get<GraphResponse>(`/api/${username}/graph`)
      .then((res) => setData(res.data))
      .catch(() => setError(true));
  }, [username]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const nodes: Node[] = data.movies.map((movie) => ({
      id: movie.id,
      type: "movie",
      position: { x: movie.x, y: movie.y },
      data: { ...movie },
      draggable: false,
      width: 90,
      height: 145,
    }));

    const edges: Edge[] = data.edges.map((e) => ({
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      type: e.kind === "cycle" ? "cycle" : "default",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: e.kind === "cycle" ? "#f97316" : "#6b6b80",
      },
      style: e.kind === "cycle" ? undefined : { stroke: "#3e3e48", strokeWidth: 1 },
    }));

    return { nodes, edges };
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-muted text-sm">
        Failed to load graph data.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (data.movies.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-muted text-sm">
        No films to display.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "calc(100vh - 3rem)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="#2e2e35" gap={20} size={1} />
        <Controls className="[&>button]:bg-bg-surface [&>button]:border-border [&>button]:text-text-muted [&>button:hover]:bg-bg-elevated" />
      </ReactFlow>
    </div>
  );
}
