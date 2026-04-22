import { Handle, Position, type NodeProps } from "@xyflow/react";
import Image from "next/image";
import type { GraphMovie } from "@/types/graph";

export type MovieNodeData = GraphMovie;

export default function MovieNode({ data }: NodeProps) {
  const movie = data as unknown as MovieNodeData;
  return (
    <div className="relative flex flex-col items-center w-[90px]">
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />

      <div className="relative w-[70px] aspect-[2/3] rounded overflow-hidden bg-bg-elevated">
        {movie.poster_url ? (
          <Image src={movie.poster_url} alt={movie.title} fill className="object-cover" sizes="70px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-[7px] text-center px-1 leading-tight">
            {movie.title}
          </div>
        )}
        <span className="absolute top-0.5 left-0.5 text-[9px] font-bold bg-black/70 text-white px-1 rounded leading-tight tabular-nums">
          {movie.rank}
        </span>
      </div>

      <p className="mt-1 text-[9px] text-text-primary text-center leading-tight line-clamp-2 w-full px-0.5">
        {movie.title}
      </p>
      {movie.year && (
        <p className="text-[8px] text-text-muted text-center">{movie.year}</p>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}
