"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import Gallery from "@/components/Gallery";
import PageHeader from "@/components/PageHeader";
import Reviews from "@/components/Reviews";
import { PLACE_META, photosOf, SEED_PLACES, SampleNote, useContent, type Place } from "@/lib/content";

const KEY = "offline-places";
const read = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};

export default function PlaceDetail() {
  const { id } = useParams<{ id: string }>();
  const { items, sample } = useContent<Place>("places", SEED_PLACES);
  const place = items.find((p) => p.id === id);
  const [saved, setSaved] = useState(() => (typeof window === "undefined" ? false : read().includes(id)));
  const [busy, setBusy] = useState(false);

  async function saveOffline() {
    setBusy(true);
    try {
      // Guarda esta página (y la foto) en la caché del service worker.
      const c = await caches.open("jarabacoa-v1");
      await c.add(location.pathname);
            localStorage.setItem(KEY, JSON.stringify([...new Set([...read(), id])]));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (!place)
    return (
      <div className="px-5 pt-5">
        <PageHeader title="Lugar" back="/explorar" />
        <p className="py-16 text-center text-muted">No encontramos este lugar.</p>
      </div>
    );

  const m = PLACE_META[place.category];
  return (
    <div className="pb-nav">
      <div className="relative">
        {photosOf(place).length ? (
          <Gallery photos={photosOf(place)} alt={place.name} className="h-72" />
        ) : (
          <div className={`flex h-72 w-full items-center justify-center bg-linear-to-br text-white/90 ${m.grad}`}><Icon name={m.icon} className="h-20 w-20" /></div>
        )}
        <div className="absolute inset-x-5 top-5"><PageHeader title="" back="/explorar" /></div>
      </div>

      <div className="glass -mt-8 mx-4 p-5">
        <p className="text-xs font-bold text-azul">{m.label}</p>
        <h1 className="text-2xl font-extrabold leading-tight">{place.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {place.difficulty && <span className="rounded-full bg-chip px-3 py-1">Dificultad: {place.difficulty}</span>}
          {place.durationMin && <span className="rounded-full bg-chip px-3 py-1">~{Math.round(place.durationMin / 60 * 10) / 10} h</span>}
        </div>
        <p className="mt-4 text-muted">{place.description}</p>

        {place.tips?.length ? (
          <div className="mt-5 rounded-2xl bg-st-pendiente/15 p-4">
            <p className="mb-2 flex items-center gap-2 font-bold"><Icon name="alert" className="h-5 w-5" />Consejos de seguridad</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">{place.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapQuery)}`}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-azul py-3.5 font-bold text-white shadow-lg"
          ><Icon name="pin" className="h-5 w-5" />Cómo llegar</a>
          <button
            onClick={saveOffline} disabled={busy || saved}
            className="flex items-center justify-center gap-2 rounded-full bg-azul-suave py-3.5 font-bold text-azul disabled:opacity-70"
          ><Icon name={saved ? "check" : "download"} className="h-5 w-5" />{saved ? "Guardado" : busy ? "Guardando…" : "Guardar offline"}</button>
        </div>
        <div className="mt-4"><SampleNote show={sample} /></div>
      </div>

      <div className="mx-4 mt-4"><Reviews placeId={id} enabled={!sample} /></div>
    </div>
  );
}
