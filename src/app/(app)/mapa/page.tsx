"use client";

import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import type { MapPoint } from "@/components/ReportMap";
import { useAuth } from "@/lib/firebase/auth";
import { useEvidence, useReportPhoto } from "@/lib/photos";
import { db, firebaseConfigured } from "@/lib/firebase/client";
import { CATEGORIES, STATUS_META, type ReportCategory, type ReportStatus } from "@/lib/types";

const ReportMap = dynamic(() => import("@/components/ReportMap"), { ssr: false });

interface Pub extends MapPoint {
  category: ReportCategory;
  hasPhoto?: boolean;
  hasEvidence?: boolean;
  createdAt?: Date;
}

const FILTERS: ReportStatus[] = ["pending", "in_progress", "resolved"];

export default function MapaPage() {
  const [all, setAll] = useState<Pub[]>([]);
  const [active, setActive] = useState<Set<ReportStatus>>(new Set(FILTERS));
  const [selected, setSelected] = useState<string | null>(null);
  const [locate, setLocate] = useState(0);
  const [err, setErr] = useState(false);
  const { user } = useAuth();
  const uid = user?.uid;
  // Solo el dueño ve la foto de SU reporte; el resto ve un icono.
  const [mine, setMine] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!firebaseConfigured || !uid) return;
    return onSnapshot(
      query(collection(db(), "reports"), where("reporterUid", "==", uid)),
      (s) => setMine(new Set(s.docs.map((d) => d.id))),
      () => {}
    );
  }, [uid]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onSnapshot(
      query(collection(db(), "publicReports"), orderBy("createdAt", "desc"), limit(300)),
      (s) =>
        setAll(
          s.docs.map((d) => {
            const v = d.data({ serverTimestamps: "estimate" });
            return {
              id: d.id, category: v.category, status: v.status,
              lat: v.location.latitude, lng: v.location.longitude,
              hasPhoto: Boolean(v.hasPhoto), hasEvidence: Boolean(v.hasEvidence),
              createdAt: v.createdAt?.toDate?.(),
            } as Pub;
          })
        ),
      () => setErr(true)
    );
  }, []);

  const shown = useMemo(() => all.filter((p) => active.has(p.status)), [all, active]);
  const sel = all.find((p) => p.id === selected);
  const myPhoto = useReportPhoto(sel && mine.has(sel.id) ? sel.id : null);
  const evidenceUrl = useEvidence(sel?.hasEvidence ? sel.id : null, 1)[0];
  const count = (s: ReportStatus) => all.filter((p) => p.status === s).length;
  const toggle = (s: ReportStatus) =>
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });

  return (
    <div className="fixed inset-0 z-0">
      <ReportMap points={shown} onSelect={setSelected} locateSignal={locate} />

      <div className="pointer-events-none relative mx-auto h-full max-w-md px-5 pt-5">
        <Link href="/" aria-label="Volver" className="glass pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full!">
          <Icon name="back" className="h-5 w-5" />
        </Link>
        <button onClick={() => setLocate((n) => n + 1)} aria-label="Mi ubicación" className="glass pointer-events-auto absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full!">
          <Icon name="locate" className="h-5 w-5" />
        </button>

        <div className="pointer-events-auto absolute inset-x-5 bottom-28">
          <div className="glass p-4">
            {sel ? (
              <div className="flex items-center gap-3">
                {(() => {
                  const url = myPhoto ?? evidenceUrl;
                  return url ? (
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={myPhoto ? "Tu foto" : "Trabajo realizado"} className="h-16 w-16 rounded-2xl object-cover" />
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-background">
                        {myPhoto ? "Tu reporte" : "Después"}
                      </span>
                    </div>
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-chip text-muted">
                      <Icon name={sel.hasPhoto ? "camera" : CATEGORIES.find((c) => c.id === sel.category)!.icon} className="h-6 w-6" />
                      {sel.hasPhoto && <span className="text-[10px] font-bold">Con foto</span>}
                    </span>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{CATEGORIES.find((c) => c.id === sel.category)?.label}</p>
                  <p className="text-sm text-muted">{sel.createdAt?.toLocaleDateString("es-DO", { day: "numeric", month: "long" })}</p>
                  <div className="mt-1"><StatusPill status={sel.status} /></div>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Cerrar" className="self-start p-1 text-muted">✕</button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {FILTERS.map((s) => (
                    <button key={s} onClick={() => toggle(s)} aria-pressed={active.has(s)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${active.has(s) ? "bg-chip" : "bg-chip opacity-40"}`}>
                      <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--st-${{ pending: "pendiente", in_progress: "proceso", resolved: "solucionado", rejected: "rechazado" }[s]})` }} />
                      {STATUS_META[s].label} · {count(s)}
                    </button>
                  ))}
                </div>
                {!firebaseConfigured || err ? (
                  <p className="mt-3 text-sm text-muted">No se pudo cargar el mapa de reportes.</p>
                ) : !all.length ? (
                  <p className="mt-3 text-sm text-muted">Aún no hay reportes públicos en Jarabacoa.</p>
                ) : null}
                <Link href="/reportar" className="mt-3 block rounded-full bg-azul py-4 text-center font-bold text-white shadow-lg">Reportar un problema</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
