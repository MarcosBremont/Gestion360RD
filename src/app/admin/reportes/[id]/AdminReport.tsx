"use client";

import imageCompression from "browser-image-compression";
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { useAuth } from "@/lib/firebase/auth";
import { db, firebaseConfigured } from "@/lib/firebase/client";
import { blobToBytes, useEvidence, useReportPhoto } from "@/lib/photos";
import { CATEGORIES, STATUS_META, type ReportCategory, type ReportStatus } from "@/lib/types";

// Con Cloud Functions desplegadas (plan Blaze) ellas publican en el mapa y notifican.
// Sin ellas (plan gratuito) lo hace este panel al guardar.
const SERVER_FUNCTIONS = process.env.NEXT_PUBLIC_SERVER_FUNCTIONS === "true";

const NOTIFY: Partial<Record<ReportStatus, { title: string; body: string }>> = {
  in_progress: { title: "Tu reporte está en proceso", body: "El Ayuntamiento ya está trabajando en él." },
  resolved: { title: "Tu reporte fue solucionado", body: "Mira la foto del trabajo y confirma si quedó resuelto." },
  rejected: { title: "No pudimos atender tu reporte", body: "Abre el reporte para ver el motivo." },
};

interface R {
  category: ReportCategory; status: ReportStatus; description?: string; photos?: unknown[]; evidenceCount?: number;
  location?: { latitude: number; longitude: number }; assignedTo?: string | null; accuracy?: number | null; createdAt?: Date;
  citizenConfirmation?: string; reporterUid?: string; moderation?: string;
}

export default function AdminReport() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const [r, setR] = useState<R | null | undefined>(undefined);
  const [status, setStatus] = useState<ReportStatus>("pending");
  const [assigned, setAssigned] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);
  const photo = useReportPhoto(id);
  const evidence = useEvidence(id, r?.evidenceCount ?? 0);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onSnapshot(doc(db(), "reports", id), (s) => {
      const v = s.data({ serverTimestamps: "estimate" });
      if (!v) return setR(null);
      setR({ ...v, createdAt: v.createdAt?.toDate?.() } as R);
      if (!seeded.current) { seeded.current = true; setStatus(v.status); setAssigned(v.assignedTo ?? ""); }
    }, () => setR(null));
  }, [id]);

  async function save() {
    if (!r || !user) return;
    if (status === "resolved" && !files.length && !r.evidenceCount)
      return setMsg({ ok: false, t: "Sube al menos una foto de evidencia para marcar como solucionado." });
    setBusy(true);
    setMsg(null);
    try {
      let added = 0;
      for (const f of files) {
        const small = await imageCompression(f, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, fileType: "image/jpeg" });
        await addDoc(collection(db(), "reports", id, "evidence"), {
          data: await blobToBytes(small), contentType: "image/jpeg", by: user.uid, createdAt: serverTimestamp(),
        });
        added++;
      }
      const patch: Record<string, unknown> = { status, assignedTo: assigned.trim() || null, updatedAt: serverTimestamp() };
      if (added) patch.evidenceCount = increment(added);
      if (status === "resolved" && r.status !== "resolved") patch.resolvedAt = serverTimestamp();
      await updateDoc(doc(db(), "reports", id), patch);
      await addDoc(collection(db(), "reports", id, "timeline"), {
        type: status !== r.status ? "status_changed" : "note", fromStatus: r.status, toStatus: status,
        by: user.uid, publicNote: note.trim() || null, evidenceCount: added, createdAt: serverTimestamp(),
      });

      if (!SERVER_FUNCTIONS) {
        const pub = doc(db(), "publicReports", id);
        if (status === "rejected" || r.moderation === "review") await deleteDoc(pub).catch(() => {});
        else
          await setDoc(pub, {
            category: r.category, status, location: r.location, barrio: null,
            hasPhoto: Boolean(r.photos?.length), hasEvidence: (r.evidenceCount ?? 0) + added > 0,
            createdAt: r.createdAt ?? serverTimestamp(), resolvedAt: status === "resolved" ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
          });
        const n = NOTIFY[status];
        if (n && status !== r.status && r.reporterUid)
          await addDoc(collection(db(), "notifications", r.reporterUid, "items"), { ...n, reportId: id, read: false, createdAt: serverTimestamp() });
      }

      setNote(""); setFiles([]);
      setMsg({ ok: true, t: "Cambios guardados." });
    } catch (e) {
      setMsg({ ok: false, t: `No se pudo guardar: ${e instanceof Error ? e.message.slice(0, 120) : "error"}` });
    } finally {
      setBusy(false);
    }
  }

  if (r === undefined) return <p className="py-20 text-center text-muted">Cargando…</p>;
  if (r === null) return <p className="glass p-10 text-center">No se encontró el reporte.</p>;

  const cat = CATEGORIES.find((c) => c.id === r.category)!;
  const loc = r.location;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="space-y-4">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-azul"><Icon name="back" className="h-4 w-4" />Bandeja</Link>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Foto del ciudadano" className="aspect-video w-full rounded-3xl object-cover" />
        )}
        <div className="glass p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-lg font-bold"><Icon name={cat.icon} className="h-6 w-6" />{cat.label}</p>
            <StatusPill status={r.status} />
          </div>
          <p className="mt-1 text-sm text-muted">{r.createdAt?.toLocaleString("es-DO")}</p>
          {r.description && <p className="mt-3">{r.description}</p>}
          {loc && (
            <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
              className="mt-4 flex items-center gap-2 rounded-2xl bg-chip p-3 text-sm font-semibold">
              <Icon name="pin" className="h-5 w-5 text-azul" />{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
              {r.accuracy != null && <span className="text-muted">±{Math.round(r.accuracy)} m</span>}
              <Icon name="arrow" className="ml-auto h-4 w-4" />
            </a>
          )}
          {r.citizenConfirmation && (
            <p className={`mt-3 rounded-2xl p-3 text-sm font-bold ${r.citizenConfirmation === "yes" ? "bg-st-solucionado/15 text-st-solucionado" : "bg-st-pendiente/20 text-st-pendiente"}`}>
              Ciudadano: {r.citizenConfirmation === "yes" ? "confirmó que quedó resuelto" : "indica que NO quedó resuelto"}
            </p>
          )}
        </div>
        {!!evidence.length && (
          <div className="glass p-4">
            <p className="mb-2 font-bold">Evidencia subida</p>
            <div className="grid grid-cols-3 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {evidence.map((u) => <img key={u} src={u} alt="Evidencia" className="aspect-square rounded-xl object-cover" />)}
            </div>
          </div>
        )}
      </section>

      <section className="glass h-fit space-y-4 p-5">
        <h2 className="text-lg font-bold">Gestionar</h2>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Estado</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STATUS_META) as ReportStatus[]).map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
                className={`rounded-2xl py-3 text-sm font-bold ${status === s ? "bg-azul text-white shadow" : "bg-chip"}`}>{STATUS_META[s].label}</button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-semibold">Brigada asignada</span>
          <input value={assigned} onChange={(e) => setAssigned(e.target.value)} placeholder="Ej. Brigada de bacheo"
            className="mt-1 w-full rounded-2xl bg-chip p-3 focus:outline-2 focus:outline-azul" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Nota pública (la ve el ciudadano)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300}
            className="mt-1 w-full rounded-2xl bg-chip p-3 focus:outline-2 focus:outline-azul" />
        </label>

        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-azul-suave py-3 font-bold text-azul">
            <Icon name="camera" className="h-5 w-5" />{files.length ? `${files.length} foto(s) de evidencia` : "Foto de evidencia del trabajo"}
          </button>
        </div>

        {msg && <p role="alert" className={`text-sm font-semibold ${msg.ok ? "text-st-solucionado" : "text-st-pendiente"}`}>{msg.t}</p>}
        <button onClick={save} disabled={busy || (role !== "admin" && role !== "brigade")}
          className="w-full rounded-full bg-azul py-4 font-bold text-white shadow-lg disabled:opacity-40">
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      </section>
    </div>
  );
}
