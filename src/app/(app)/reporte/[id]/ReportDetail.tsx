"use client";

import { collection, doc, onSnapshot, orderBy, query, updateDoc, serverTimestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { db, firebaseConfigured } from "@/lib/firebase/client";
import { useEvidence, useReportPhoto } from "@/lib/photos";
import { CATEGORIES, type ReportCategory, type ReportStatus } from "@/lib/types";

interface Report {
  category: ReportCategory;
  status: ReportStatus;
  description?: string;
  photos?: unknown[];
  evidenceCount?: number;
  citizenConfirmation?: "yes" | "no";
  createdAt?: Date;
}
interface Event { id: string; type: string; toStatus?: ReportStatus; publicNote?: string; createdAt?: Date }

const STEPS: { s: ReportStatus; label: string }[] = [
  { s: "pending", label: "Recibido" },
  { s: "in_progress", label: "En proceso" },
  { s: "resolved", label: "Solucionado" },
];
const fmt = (d?: Date) => d?.toLocaleString("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) ?? "";

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<Report | null | undefined>(undefined);
  const [events, setEvents] = useState<Event[]>([]);
  const before = useReportPhoto(id);
  const after = useEvidence(id, r?.evidenceCount ?? 0)[0];

  useEffect(() => {
    if (!firebaseConfigured) return;
    const a = onSnapshot(
      doc(db(), "reports", id),
      (s) => {
        const v = s.data({ serverTimestamps: "estimate" });
        setR(v ? ({ ...v, createdAt: v.createdAt?.toDate?.() } as Report) : null);
      },
      () => setR(null)
    );
    const b = onSnapshot(query(collection(db(), "reports", id, "timeline"), orderBy("createdAt", "asc")), (s) =>
      setEvents(s.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() }) as Event))
    );
    return () => { a(); b(); };
  }, [id]);

  async function confirm(v: "yes" | "no") {
    await updateDoc(doc(db(), "reports", id), { citizenConfirmation: v, updatedAt: serverTimestamp() });
  }

  if (r === undefined) return <div className="px-5 pt-20 text-center text-muted">Cargando…</div>;
  if (r === null)
    return (
      <div className="px-5 pt-5">
        <PageHeader title="Reporte" back="/mis-reportes" />
        <p className="py-16 text-center text-muted">No encontramos este reporte.</p>
      </div>
    );

  const cat = CATEGORIES.find((c) => c.id === r.category)!;
  const reached = r.status === "rejected" ? -1 : STEPS.findIndex((x) => x.s === r.status);

  return (
    <div className="px-5 pt-5 pb-nav">
      <PageHeader title="Mi reporte" back="/mis-reportes" />

      {before && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={before} alt="Foto del reporte" className="mb-4 aspect-video w-full rounded-3xl object-cover" />
      )}

      <section className="glass p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-chip"><Icon name={cat.icon} className="h-6 w-6" /></span>
            <div>
              <p className="font-bold leading-tight">{cat.label}</p>
              <p className="text-sm text-muted">{fmt(r.createdAt)}</p>
            </div>
          </div>
          <StatusPill status={r.status} />
        </div>
        {r.description && <p className="mt-3 text-sm text-muted">{r.description}</p>}

        {r.status !== "rejected" && (
          <ol className="mt-5 flex items-center">
            {STEPS.map((st, i) => (
              <li key={st.s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${i <= reached ? "bg-azul text-white" : "bg-chip text-muted"}`}>
                    {i <= reached ? <Icon name="check" className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="text-[11px] font-semibold">{st.label}</span>
                </div>
                {i < STEPS.length - 1 && <span className={`mx-1 mb-5 h-0.5 flex-1 ${i < reached ? "bg-azul" : "bg-navy/10"}`} />}
              </li>
            ))}
          </ol>
        )}
      </section>

      {r.status === "resolved" && after && (
        <section className="glass mt-4 p-4">
          <h2 className="mb-3 font-bold">Antes y después</h2>
          <div className="grid grid-cols-2 gap-2">
            {[{ u: before, l: "Antes" }, { u: after, l: "Después" }].map((x) => (
              <figure key={x.l} className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.u && <img src={x.u} alt={x.l} className="aspect-square w-full object-cover" />}
                <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/60 px-3 py-0.5 text-xs font-bold text-white">{x.l}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {r.status === "resolved" && (
        <section className="glass mt-4 p-4 text-center">
          {r.citizenConfirmation ? (
            <p className="font-bold">{r.citizenConfirmation === "yes" ? "Gracias por confirmar que quedó resuelto." : "Gracias. Reabrimos el reporte para revisarlo."}</p>
          ) : (
            <>
              <p className="font-bold">¿Quedó resuelto?</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button onClick={() => confirm("yes")} className="rounded-full bg-st-solucionado py-3 font-bold text-white">Sí</button>
                <button onClick={() => confirm("no")} className="rounded-full bg-chip py-3 font-bold">No</button>
              </div>
            </>
          )}
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 font-bold">Historial</h2>
          <ul className="space-y-3 border-l-2 border-navy/10 pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full bg-azul ring-4 ring-background" />
                <p className="text-xs text-muted">{fmt(e.createdAt)}</p>
                {e.toStatus && <p className="font-semibold">{{ pending: "Recibido", in_progress: "En proceso", resolved: "Solucionado", rejected: "Rechazado" }[e.toStatus]}</p>}
                {e.publicNote && <p className="text-sm text-muted">{e.publicNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
