"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MLMap, MapLayerMouseEvent, MapMouseEvent, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  status: "pending" | "in_progress" | "resolved" | "rejected";
}

const JARABACOA: [number, number] = [-70.6364, 19.1175]; // [lng, lat]
const COLORS = { pending: "#e0a100", in_progress: "#2f74e8", resolved: "#2e9d5b", rejected: "#7a857f" };

const toGeoJSON = (pts: MapPoint[]) => ({
  type: "FeatureCollection" as const,
  features: pts.map((p) => ({
    type: "Feature" as const,
    id: p.id,
    properties: { id: p.id, status: p.status },
    geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
  })),
});

export default function ReportMap({
  points,
  onSelect,
  locateSignal,
}: {
  points: MapPoint[];
  onSelect: (id: string | null) => void;
  locateSignal: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const me = useRef<Marker | null>(null);
  const latest = useRef(points);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    latest.current = points;
    const src = map.current?.getSource("reports") as GeoJSONSource | undefined;
    src?.setData(toGeoJSON(points));
  }, [points, ready]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
      const canvas = document.createElement("canvas");
      if (!(canvas.getContext("webgl2") || canvas.getContext("webgl"))) {
        setProblem("Tu navegador tiene WebGL desactivado. En Brave: baja el nivel de «Escudos» para este sitio (icono del león) o prueba en Chrome/Safari.");
        return;
      }
      const ml = await import("maplibre-gl");
      if (dead || !box.current) return;
      // El empaquetador de Next rompe la ruta automática del worker: se sirve desde /public.
      ml.setWorkerUrl("/maplibre-gl-worker.mjs");
      const m = new ml.Map({
        container: box.current,
        center: JARABACOA,
        zoom: 13,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 19,
              attribution: "© OpenStreetMap",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
      });
      map.current = m;
      m.on("error", (e: unknown) => {
        const err = (e as { error?: { status?: number; message?: string } }).error;
        console.error("[mapa] error", err);
        if (err?.status === undefined) return setProblem(err?.message ?? "Error desconocido del mapa");
        setFailed(true); // mosaicos sin conexión
      });
      m.on("load", () => {
        m.addSource("reports", { type: "geojson", data: toGeoJSON(latest.current) });
        const color: unknown = ["match", ["get", "status"], "pending", COLORS.pending, "in_progress", COLORS.in_progress, "resolved", COLORS.resolved, COLORS.rejected];
        m.addLayer({ id: "halo", type: "circle", source: "reports", paint: { "circle-radius": 18, "circle-color": color as string, "circle-opacity": 0.25 } });
        m.addLayer({ id: "dots", type: "circle", source: "reports", paint: { "circle-radius": 8, "circle-color": color as string, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
        m.on("click", "dots", (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) onSelect(id);
        });
        m.on("click", (e: MapMouseEvent) => {
          if (!m.queryRenderedFeatures(e.point, { layers: ["dots"] }).length) onSelect(null);
        });
        m.on("mouseenter", "dots", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "dots", () => (m.getCanvas().style.cursor = ""));
        setReady(true);
      });
      } catch (e) {
        console.error("[mapa]", e);
        setProblem(`No se pudo iniciar el mapa: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => {
      dead = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Botón "mi ubicación"
  useEffect(() => {
    if (!locateSignal || !map.current || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(async (p) => {
      const ml = await import("maplibre-gl");
      const pos: [number, number] = [p.coords.longitude, p.coords.latitude];
      if (!me.current) {
        const el = document.createElement("div");
        el.style.cssText = "width:18px;height:18px;border-radius:50%;background:#2f74e8;border:3px solid #fff;box-shadow:0 0 0 8px rgba(47,116,232,.25)";
        me.current = new ml.Marker({ element: el }).setLngLat(pos).addTo(map.current!);
      } else me.current.setLngLat(pos);
      map.current?.flyTo({ center: pos, zoom: 16 });
    });
  }, [locateSignal]);

  return (
    <>
      {/* Capa exterior fija el tamaño; MapLibre pone `position: relative` en su propio contenedor, que si
          fuera el mismo elemento anularía el `absolute inset-0` y lo dejaría con altura 0. */}
      <div className="absolute inset-0">
        <div ref={box} style={{ width: "100%", height: "100%" }} role="application" aria-label="Mapa de reportes" />
      </div>
      {problem && (
        <div className="absolute inset-x-6 top-1/3 z-10 mx-auto max-w-sm rounded-3xl bg-card-solid p-5 text-center text-sm shadow-xl">
          <p className="font-bold">El mapa no se pudo mostrar</p>
          <p className="mt-2 text-muted">{problem}</p>
        </div>
      )}
      {failed && (
        <p className="absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-background shadow-lg">
          Sin conexión · el mapa puede verse incompleto
        </p>
      )}
    </>
  );
}
