"use client";

import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { useAuth } from "@/lib/firebase/auth";
import { db, firebaseConfigured } from "@/lib/firebase/client";
import { CATEGORIES, STATUS_META, type ReportCategory, type ReportStatus } from "@/lib/types";

interface Row { id: string; category: ReportCategory; status: ReportStatus; description?: string; assignedTo?: string | null; createdAt?: Date; moderation?: string; duplicateOf?: string }

export default function Bandeja() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<ReportStatus | "all">("all");
  const [cat, setCat] = useState<ReportCategory | "all">("all");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || role === "citizen" || role === "editor") return;
    // En vivo: cada reporte nuevo aparece sin recargar.
    return onSnapshot(
      query(collection(db(), "reports"), orderBy("createdAt", "desc"), limit(200)),
      (s) => setRows(s.docs.map((d) => {
        const v = d.data({ serverTimestamps: "estimate" });
        return { id: d.id, category: v.category, status: v.status, description: v.description, assignedTo: v.assignedTo, moderation: v.moderation, duplicateOf: v.duplicateOf, createdAt: v.createdAt?.toDate?.() };
      })),
      () => setErr("No se pudieron cargar los reportes. Revisa tus permisos.")
    );
  }, [role]);

  const counts = useMemo(() => {
    const c: Record<ReportStatus, number> = { pending: 0, in_progress: 0, resolved: 0, rejected: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);
  const shown = rows.filter((r) => (filter === "all" || r.status === filter) && (cat === "all" || r.category === cat));

  if (role === "editor") return <p className="glass p-6 text-center">Tu rol solo permite gestionar contenido.</p>;

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["pending", "in_progress", "resolved", "rejected"] as ReportStatus[]).map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)} aria-pressed={filter === s}
            className={`glass p-4 text-left ${filter === s ? "ring-2 ring-azul" : ""}`}>
            <p className="text-sm text-muted">{STATUS_META[s].label}</p>
            <p className="text-4xl font-extrabold">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[{ id: "all" as const, label: "Todas" }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label }))].map((o) => (
          <button key={o.id} onClick={() => setCat(o.id)} aria-pressed={cat === o.id}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${cat === o.id ? "bg-navy text-background" : "bg-chip"}`}>{o.label}</button>
        ))}
      </div>

      {err && <p role="alert" className="glass mb-4 p-4 font-semibold text-st-pendiente">{err}</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        {shown.map((r) => {
          const c = CATEGORIES.find((x) => x.id === r.category)!;
          return (
            <li key={r.id}>
              <Link href={`/admin/reportes/${r.id}`} className="glass flex items-center gap-3 p-3">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-chip"><Icon name={c.icon} className="h-7 w-7" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{c.label}</p>
                  <p className="truncate text-sm text-muted">{r.description || "Sin descripción"}</p>
                  <p className="text-xs text-muted">
                    {r.createdAt?.toLocaleString("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    {r.assignedTo ? ` · ${r.assignedTo}` : " · Sin asignar"}
                    {r.moderation === "review" ? " · Por revisar" : ""}
                    {r.duplicateOf ? " · Posible duplicado" : ""}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </Link>
            </li>
          );
        })}
      </ul>
      {!shown.length && !err && <p className="glass mt-6 p-10 text-center text-muted">No hay reportes con estos filtros.</p>}
    </>
  );
}
