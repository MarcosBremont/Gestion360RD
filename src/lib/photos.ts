"use client";

import { Bytes, collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, firebaseConfigured } from "./firebase/client";

/** Las fotos se guardan como bytes dentro de Firestore (plan gratuito, sin Storage). */
export async function blobToBytes(b: Blob) {
  return Bytes.fromUint8Array(new Uint8Array(await b.arrayBuffer()));
}

const toUrl = (bytes: Bytes, type = "image/jpeg") =>
  URL.createObjectURL(new Blob([bytes.toUint8Array() as BlobPart], { type }));

/** Foto privada de un reporte: reports/{id}/private/photo (solo dueño y personal por reglas). */
export function useReportPhoto(reportId: string | null) {
  const [state, setState] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!firebaseConfigured || !reportId) return;
    let url: string | null = null;
    let alive = true;
    getDoc(doc(db(), "reports", reportId, "private", "photo"))
      .then((s) => {
        const d = s.data();
        if (alive && d?.data) {
          url = toUrl(d.data, d.contentType);
          setState({ id: reportId, url });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [reportId]);
  return state && state.id === reportId ? state.url : null;
}

/** Fotos de evidencia del trabajo terminado (públicas por transparencia). */
export function useEvidence(reportId: string | null, count: number) {
  const [state, setState] = useState<{ key: string; urls: string[] } | null>(null);
  const key = `${reportId}:${count}`;
  useEffect(() => {
    if (!firebaseConfigured || !reportId || !count) return;
    let urls: string[] = [];
    let alive = true;
    getDocs(query(collection(db(), "reports", reportId, "evidence"), orderBy("createdAt", "asc")))
      .then((s) => {
        urls = s.docs.map((d) => toUrl(d.data().data, d.data().contentType));
        if (alive) setState({ key, urls });
        else urls.forEach(URL.revokeObjectURL);
      })
      .catch(() => {});
    return () => {
      alive = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [reportId, count, key]);
  return state && state.key === key ? state.urls : [];
}
