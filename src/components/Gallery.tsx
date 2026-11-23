"use client";

import { useState } from "react";

/** Galería deslizable (scroll-snap) con indicador de puntos. */
export default function Gallery({ photos, alt, className = "h-36" }: { photos: string[]; alt: string; className?: string }) {
  const [i, setI] = useState(0);
  if (!photos.length) return null;
  return (
    <div className="relative">
      <div
        className={`flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photos.map((u, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={u} alt={photos.length > 1 ? `${alt} (${k + 1} de ${photos.length})` : alt} className="h-full w-full shrink-0 snap-center object-cover" />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {photos.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
