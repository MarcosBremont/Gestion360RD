"use client";

import {
  average, collection, count, deleteDoc, doc, getAggregateFromServer, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { db, firebaseConfigured } from "@/lib/firebase/client";

const STAR = "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z";

export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex text-st-pendiente" role="img" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className={className} fill={n <= Math.round(value) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

/** Nota media + nº de reseñas de un lugar (consulta agregada: no descarga las reseñas). */
export type ReviewCol = "places" | "businesses";
const cache = new Map<string, { n: number; avg: number }>();
export function RatingBadge({ placeId, col = "places" }: { placeId: string; col?: ReviewCol }) {
  const key = `${col}/${placeId}`;
  const [r, setR] = useState<{ n: number; avg: number } | null>(cache.get(key) ?? null);
  useEffect(() => {
    if (!firebaseConfigured || cache.has(key)) return;
    let alive = true;
    getAggregateFromServer(query(collection(db(), col, placeId, "reviews")), { n: count(), avg: average("rating") })
      .then((s) => {
        const v = { n: s.data().n, avg: s.data().avg ?? 0 };
        cache.set(key, v);
        if (alive) setR(v);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [placeId, col, key]);
  if (!r || !r.n) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs font-bold text-foreground">
      <Stars value={1} className="h-3.5 w-3.5" />{r.avg.toFixed(1)} <span className="font-semibold text-muted">({r.n})</span>
    </span>
  );
}

interface Review { id: string; rating: number; comment: string; authorName: string; createdAt?: Date }

export default function Reviews({ placeId, enabled, col = "places" }: { placeId: string; enabled: boolean; col?: ReviewCol }) {
  const { user, role } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [draft, setDraft] = useState<{ rating: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !enabled) return;
    return onSnapshot(
      query(collection(db(), col, placeId, "reviews"), orderBy("createdAt", "desc"), limit(50)),
      (s) => setReviews(s.docs.map((d) => {
        const v = d.data({ serverTimestamps: "estimate" });
        return { id: d.id, rating: v.rating, comment: v.comment, authorName: v.authorName, createdAt: v.createdAt?.toDate?.() } as Review;
      })),
      () => {}
    );
  }, [placeId, enabled, col]);

  const uid = user?.uid;
  const real = Boolean(user && !user.isAnonymous);
  const mine = reviews.find((r) => r.id === uid);
  const form = draft ?? { rating: mine?.rating ?? 0, text: mine?.comment ?? "" };
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const staff = role === "admin" || role === "editor";

  async function publish() {
    if (!uid || !form.rating) return;
    setBusy(true);
    setErr(null);
    try {
      await setDoc(doc(db(), col, placeId, "reviews", uid), {
        rating: form.rating,
        comment: form.text.trim().slice(0, 500),
        authorName: (user?.displayName?.split(" ")[0] ?? "Visitante").slice(0, 40), // solo el nombre de pila
        authorUid: uid,
        createdAt: serverTimestamp(),
      });
      setDraft(null);
    } catch {
      setErr("No se pudo publicar tu reseña. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const remove = (id: string) => confirm("¿Eliminar esta reseña?") && deleteDoc(doc(db(), col, placeId, "reviews", id));

  if (!enabled)
    return <p className="glass p-4 text-center text-sm text-muted">Las reseñas se activan cuando esté publicado.</p>;

  return (
    <section className="glass p-5" aria-labelledby="rev-title">
      <h2 id="rev-title" className="text-lg font-bold">Reseñas</h2>
      {reviews.length > 0 ? (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-4xl font-extrabold">{avg.toFixed(1)}</span>
          <div><Stars value={avg} className="h-5 w-5" /><p className="text-sm text-muted">{reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"}</p></div>
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
      )}

      {real ? (
        <div className="mt-4 rounded-2xl bg-chip p-4">
          <p className="font-semibold">{mine ? "Tu reseña" : "Deja tu opinión"}</p>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={form.rating === n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
                onClick={() => setDraft({ ...form, rating: n })} className="p-1">
                <svg viewBox="0 0 24 24" className={`h-8 w-8 ${n <= form.rating ? "text-st-pendiente" : "text-muted/50"}`} fill={n <= form.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d={STAR} /></svg>
              </button>
            ))}
          </div>
          <textarea value={form.text} onChange={(e) => setDraft({ ...form, text: e.target.value })} maxLength={500} rows={3}
            placeholder="Cuenta tu experiencia (opcional)" className="mt-2 w-full rounded-2xl bg-card-solid p-3 placeholder:text-muted focus:outline-2 focus:outline-azul" />
          {err && <p role="alert" className="mt-1 text-sm font-semibold text-st-pendiente">{err}</p>}
          <div className="mt-2 flex gap-2">
            <button onClick={publish} disabled={busy || !form.rating} className="flex-1 rounded-full bg-azul py-3 font-bold text-white shadow disabled:opacity-40">
              {busy ? "Publicando…" : mine ? "Guardar cambios" : "Publicar reseña"}
            </button>
            {mine && <button onClick={() => remove(mine.id)} className="rounded-full bg-card-solid px-4 text-sm font-bold text-st-pendiente">Eliminar</button>}
          </div>
        </div>
      ) : (
        <Link href="/perfil" className="mt-4 block rounded-2xl bg-azul-suave p-4 text-center font-bold text-azul">
          Inicia sesión para dejar tu reseña
        </Link>
      )}

      <ul className="mt-4 space-y-3">
        {reviews.filter((r) => r.id !== uid).map((r) => (
          <li key={r.id} className="rounded-2xl bg-chip p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{r.authorName}</p>
              <Stars value={r.rating} />
            </div>
            <p className="text-xs text-muted">{r.createdAt?.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" })}</p>
            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
            {staff && <button onClick={() => remove(r.id)} className="mt-2 text-xs font-bold text-st-pendiente">Eliminar (personal)</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
