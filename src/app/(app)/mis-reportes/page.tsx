"use client";

import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { auth, db, firebaseConfigured } from "@/lib/firebase/client";
import { useOutbox } from "@/lib/offline/useOutbox";
import { syncOutbox } from "@/lib/offline/sync";
import { CATEGORIES, type ReportCategory, type ReportStatus } from "@/lib/types";

interface Row {
  id: string;
  category: ReportCategory;
  status: ReportStatus;
  createdAt?: Date;
}

const cat = (c: ReportCategory) => CATEGORIES.find((x) => x.id === c)!;

function Item({ category, sub, right, href }: { category: ReportCategory; sub: string; right: React.ReactNode; href?: string }) {
  const c = cat(category);
  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chip">
        <Icon name={c.icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight">{c.label}</p>
        <p className="text-sm text-muted">{sub}</p>
      </div>
      {right}
    </>
  );
  const cls = "glass flex items-center gap-3 p-4";
  return (
    <li>{href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>
  );
}

export default function MisReportes() {
  const { items } = useOutbox();
  const [rows, setRows] = useState<Row[]>([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) return;
    let unsub = () => {};
    const off = onAuthStateChanged(auth(), (u) => {
      unsub();
      if (!u) return setRows([]);
      unsub = onSnapshot(
        query(collection(db(), "reports"), where("reporterUid", "==", u.uid), orderBy("createdAt", "desc")),
        (snap) =>
          setRows(
            snap.docs.map((d) => {
              const v = d.data({ serverTimestamps: "estimate" });
              return { id: d.id, category: v.category, status: v.status, createdAt: v.createdAt?.toDate?.() };
            })
          )
      );
    });
    return () => {
      off();
      unsub();
    };
  }, []);

  return (
    <div className="px-5 pt-5 pb-nav">
      <PageHeader title="Mis reportes" back="/" />

      {!firebaseConfigured && (
        <p className="glass mb-4 p-4 text-sm">Firebase no está configurado. Revisa <code>.env.local</code>.</p>
      )}

      {items.length > 0 && (
        <button
          onClick={async () => { setRetrying(true); await syncOutbox(); setRetrying(false); }}
          disabled={retrying}
          className="glass mb-4 flex w-full items-center justify-center gap-2 py-3 font-bold text-azul disabled:opacity-60"
        >
          {retrying ? "Enviando…" : `Reintentar envío (${items.length})`}
        </button>
      )}

      <ul className="space-y-3">
        {items.map((r) => (
          <Item
            key={r.clientId}
            category={r.category}
            sub={r.attempts ? `No se pudo enviar (se reintentará): ${(r.lastError ?? "").slice(0, 90)}` : "Se enviará al tener conexión"}
            right={<span className="rounded-full bg-chip px-3 py-1 text-xs font-bold">Por enviar</span>}
          />
        ))}
        {rows.map((r) => (
          <Item
            key={r.id}
            href={`/reporte/${r.id}`}
            category={r.category}
            sub={r.createdAt?.toLocaleDateString("es-DO", { day: "numeric", month: "short" }) ?? ""}
            right={<StatusPill status={r.status} />}
          />
        ))}
      </ul>

      {!items.length && !rows.length && (
        <div className="glass mt-10 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-azul-suave text-azul">
            <Icon name="list" className="h-7 w-7" />
          </span>
          <p className="mt-3 font-bold">Aún no has enviado reportes</p>
          <p className="mt-1 text-sm text-muted">Toca el botón de la cámara para empezar.</p>
        </div>
      )}
    </div>
  );
}
