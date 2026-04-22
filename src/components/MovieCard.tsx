"use client";

import Image from "next/image";
import type { MovieSummary } from "@/types/domain";

type Variant = "comparison" | "list";

interface MovieCardProps {
  movie: MovieSummary;
  variant?: Variant;
  selected?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<Variant, { wrapper: string; title: string; year: string }> = {
  comparison: {
    wrapper: "w-48 sm:w-56",
    title: "text-sm font-semibold mt-2 leading-tight",
    year: "text-xs text-text-muted mt-0.5",
  },
  list: {
    wrapper: "w-14",
    title: "text-xs font-medium mt-1 leading-tight",
    year: "text-xs text-text-muted",
  },
};

export default function MovieCard({
  movie,
  variant = "comparison",
  selected = false,
  onClick,
}: MovieCardProps) {
  const styles = variantStyles[variant];
  const isClickable = !!onClick;

  return (
    <div
      className={[
        styles.wrapper,
        "flex-shrink-0 flex flex-col",
        isClickable ? "cursor-pointer group" : "",
      ].join(" ")}
      onClick={onClick}
    >
      <div
        className={[
          "relative aspect-[2/3] w-full rounded-md overflow-hidden bg-bg-elevated",
          "transition-all duration-200",
          isClickable
            ? "group-hover:ring-2 group-hover:ring-accent group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-black/40"
            : "",
          selected ? "ring-2 ring-accent scale-[1.02] shadow-xl shadow-black/40" : "",
        ].join(" ")}
      >
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover"
            sizes={variant === "comparison" ? "224px" : "56px"}
            priority={variant === "comparison"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs text-center px-2">
            No poster
          </div>
        )}
      </div>

      {variant === "comparison" && (
        <div className="mt-2 text-center">
          <p className={styles.title}>{movie.title}</p>
          {movie.year && <p className={styles.year}>{movie.year}</p>}
        </div>
      )}
    </div>
  );
}
