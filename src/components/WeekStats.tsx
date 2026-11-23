"use client";

import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, firebaseConfigured } from "@/lib/firebase/client";
import WeekChart from "./WeekChart";

const DAY = 86_400_000;
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

interface Stats {
  labels: string[];
  received: number[];
  resolved: number[];
  inProgress: number[];
  total: number;
  prev: number;
}

interface Row { status: string; createdAt?: Date; resolvedAt?: Date; updatedAt?: Date }

/** Cifras de los últimos 7 días a partir de los reportes públicos (publicReports). */
function compute(rows: Row[]): Stats {
  const first = startOfDay(new Date()) - 6 * DAY;
  const bucket = (d?: Date) => {
    if (!d) return -1;
    const i = Math.floor((startOfDay(d) - first) / DAY);
    return i >= 0 && i <= 6 ? i : -1;
  };
  const received = Array(7).fill(0);
  const resolved = Array(7).fill(0);
  const inProgress = Array(7).fill(0);
  let prev = 0;
  for (const r of rows) {
    const c = bucket(r.createdAt);
    if (c >= 0) received[c]++;
    if (r.status === "resolved") {
      const k = bucket(r.resolvedAt);
      if (k >= 0) resolved[k]++;
      else if (r.resolvedAt && startOfDay(r.resolvedAt) >= first - 7 * DAY && startOfDay(r.resolvedAt) < first) prev++;
    }
    if (r.status === "in_progress") {
      const k = bucket(r.updatedAt);
      if (k >= 0) inProgress[k]++;
    }
  }
  const labels = Array.from({ length: 7 }, (_, i) => {
    const w = new Date(first + i * DAY).toLocaleDateString("es-DO", { weekday: "short" }).replace(".", "");
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  return { labels, received, resolved, inProgress, total: resolved.reduce((a, b) => a + b, 0), prev };
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function WeekStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onSnapshot(
      query(collection(db(), "publicReports"), orderBy("updatedAt", "desc"), limit(500)),
      (s) =>
        setStats(
          compute(
            s.docs.map((d) => {
              const v = d.data({ serverTimestamps: "estimate" });
              return {
                status: v.status,
                createdAt: v.createdAt?.toDate?.(),
                resolvedAt: v.resolvedAt?.toDate?.(),
                updatedAt: v.updatedAt?.toDate?.(),
              };
            })
          )
        ),
      () => {}
    );
  }, []);

  const delta = stats && stats.prev > 0 ? Math.round(((stats.total - stats.prev) / stats.prev) * 100) : null;
  const empty = stats && stats.received.every((n) => !n) && stats.total === 0;

  return (
    <>
      <section className="mt-8 text-center">
        <p className="text-muted">Problemas resueltos · últimos 7 días</p>
        <p className="mt-1 text-6xl font-extrabold tracking-tight">{stats ? stats.total : "–"}</p>
        {delta !== null && (
          <span className={`mt-2 inline-flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-sm font-bold ${delta >= 0 ? "text-st-solucionado" : "text-st-pendiente"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs. la semana anterior
          </span>
        )}
      </section>

      <section className="mt-5">
        {stats ? (
          <WeekChart received={stats.received} resolved={stats.resolved} inProgress={stats.inProgress} labels={stats.labels} />
        ) : (
          <div className="h-[190px] animate-pulse rounded-3xl bg-chip" aria-hidden />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
          <Legend color="#2f74e8" label="Resueltos" />
          <Legend color="#f2c230" label="En proceso" />
          <Legend color="rgba(15,42,67,.25)" label="Recibidos" />
        </div>
        <p className="mt-1 text-center text-[11px] text-muted/80">
          {empty ? "Aún no hay reportes públicos esta semana." : "Datos de los reportes publicados por el Ayuntamiento."}
        </p>
      </section>
    </>
  );
}
