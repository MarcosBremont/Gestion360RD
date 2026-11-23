"use client";

import { signInAnonymously } from "firebase/auth";
import { doc, GeoPoint, serverTimestamp, writeBatch } from "firebase/firestore";
import { blobToBytes } from "../photos";
import { auth, db, firebaseConfigured } from "../firebase/client";
import { listOutbox, markAttempt, removeFromOutbox } from "./outbox";

let running = false;

/**
 * Envía los reportes guardados localmente. Es idempotente: el ID del
 * documento es el clientId, así que un reintento nunca duplica el reporte.
 * Se llama al abrir la app, al recuperar conexión y al volver el foco
 * (iOS no soporta Background Sync).
 */
export async function syncOutbox(): Promise<number> {
  if (running || !firebaseConfigured || !navigator.onLine) return 0;
  running = true;
  let sent = 0;
  try {
    const pending = await listOutbox();
    if (!pending.length) return 0;

    const a = auth();
    let user = a.currentUser;
    try {
      user ??= (await signInAnonymously(a)).user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (const r of pending) await markAttempt(r.clientId, msg);
      return 0;
    }

    for (const r of pending) {
      try {
        // Reporte + foto en un lote atómico. El ID es el clientId: reintentar nunca duplica.
        const batch = writeBatch(db());
        batch.set(doc(db(), "reports", r.clientId), {
          category: r.category,
          description: r.description,
          location: new GeoPoint(r.lat, r.lng),
          accuracy: r.accuracy,
          photos: [{ inline: true }],
          photoStatus: "ready",
          status: "pending",
          moderation: "ok",
          reporterUid: user.uid,
          clientId: r.clientId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          capturedAt: new Date(r.createdAt),
        });
        batch.set(doc(db(), "reports", r.clientId, "private", "photo"), {
          data: await blobToBytes(r.photo),
          contentType: "image/jpeg",
          createdAt: serverTimestamp(),
        });
        // Si la red cae a medias, el lote queda pendiente: no se espera más de 25 s.
        await Promise.race([
          batch.commit(),
          new Promise((_, rej) => setTimeout(() => rej(new Error("Tiempo de espera agotado")), 25000)),
        ]);
        await removeFromOutbox(r.clientId);
        sent++;
      } catch (e) {
        await markAttempt(r.clientId, e instanceof Error ? e.message : String(e));
      }
    }
  } finally {
    running = false;
  }
  return sent;
}
