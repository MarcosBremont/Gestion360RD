"use client";

import imageCompression from "browser-image-compression";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useAuth } from "@/lib/firebase/auth";
import { db, firebaseConfigured } from "@/lib/firebase/client";

type Field = {
  key: string; label: string; type: "text" | "textarea" | "select" | "lines" | "datetime" | "number" | "images";
  options?: { v: string; l: string }[]; required?: boolean; hint?: string;
};
const MAX_PHOTOS = 3;
type Doc = { id: string; status?: string; [k: string]: unknown };

const STATUS_FIELD: Field = { key: "status", label: "Estado", type: "select", options: [{ v: "draft", l: "Borrador (oculto)" }, { v: "published", l: "Publicado" }] };

const COLLECTIONS: Record<string, { label: string; title: string; fields: Field[] }> = {
  places: {
    label: "Lugares", title: "name",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "category", label: "Categoría", type: "select", required: true, options: [{ v: "salto", l: "Salto" }, { v: "rio", l: "Río" }, { v: "sendero", l: "Sendero" }, { v: "restaurante", l: "Restaurante" }, { v: "mirador", l: "Mirador" }] },
      { key: "description", label: "Descripción", type: "textarea", required: true },
      { key: "difficulty", label: "Dificultad", type: "select", options: [{ v: "", l: "—" }, { v: "Fácil", l: "Fácil" }, { v: "Media", l: "Media" }, { v: "Difícil", l: "Difícil" }] },
      { key: "durationMin", label: "Duración (minutos)", type: "number" },
      { key: "tips", label: "Consejos de seguridad", type: "lines", hint: "Uno por línea" },
      { key: "mapQuery", label: "Búsqueda en el mapa", type: "text", required: true, hint: "Ej. Salto de Baiguate Jarabacoa" },
      { key: "photos", label: "Fotos (hasta 3)", type: "images" },
      STATUS_FIELD,
    ],
  },
  events: {
    label: "Eventos", title: "title",
    fields: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "startsAt", label: "Fecha y hora", type: "datetime", required: true },
      { key: "venue", label: "Lugar", type: "text", required: true },
      { key: "price", label: "Precio", type: "text", hint: "Ej. Gratis, RD$ 300" },
      { key: "photos", label: "Fotos (hasta 3)", type: "images" },
      STATUS_FIELD,
    ],
  },
  businesses: {
    label: "Comercios", title: "name",
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "category", label: "Categoría", type: "select", required: true, options: [{ v: "comida", l: "Comida" }, { v: "hospedaje", l: "Hospedaje" }, { v: "tours", l: "Tours" }, { v: "artesania", l: "Artesanía" }, { v: "servicios", l: "Servicios" }] },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "address", label: "Dirección", type: "text" },
      { key: "phone", label: "Teléfono", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text", hint: "Solo números con código de país, ej. 18095550100" },
      { key: "photos", label: "Fotos (hasta 3)", type: "images" },
      STATUS_FIELD,
    ],
  },
  alerts: {
    label: "Avisos", title: "title",
    fields: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "body", label: "Mensaje", type: "textarea", required: true },
      { key: "severity", label: "Gravedad", type: "select", required: true, options: [{ v: "info", l: "Información" }, { v: "warning", l: "Precaución" }, { v: "danger", l: "Urgente" }] },
      STATUS_FIELD,
    ],
  },
  surveys: {
    label: "Encuestas", title: "question",
    fields: [
      { key: "question", label: "Pregunta", type: "text", required: true },
      { key: "options", label: "Opciones", type: "lines", required: true, hint: "Una por línea (mínimo 2)" },
      STATUS_FIELD,
    ],
  },
};

export default function Contenido() {
  const { role } = useAuth();
  const [col, setCol] = useState("places");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [editing, setEditing] = useState<Doc | "new" | null>(null);
  const cfg = COLLECTIONS[col];
  const allowed = role === "admin" || role === "editor";

  useEffect(() => {
    if (!firebaseConfigured || !allowed) return;
    return onSnapshot(collection(db(), col), (s) => setDocs(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc)), () => setDocs([]));
  }, [col, allowed]);

  if (!allowed) return <p className="glass p-6 text-center">Tu rol no permite editar contenido.</p>;

  return (
    <>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {Object.entries(COLLECTIONS).map(([k, c]) => (
          <button key={k} onClick={() => { setCol(k); setEditing(null); setDocs([]); }} aria-pressed={col === k}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${col === k ? "bg-azul text-white" : "bg-chip"}`}>{c.label}</button>
        ))}
      </div>

      {editing ? (
        <Editor key={col + (editing === "new" ? "new" : editing.id)} col={col} fields={cfg.fields} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : (
        <>
          <button onClick={() => setEditing("new")} className="mb-4 flex items-center gap-2 rounded-full bg-azul px-5 py-3 font-bold text-white shadow-lg">
            <Icon name="plus" className="h-5 w-5" />Nuevo
          </button>
          <ul className="grid gap-3 md:grid-cols-2">
            {docs.map((d) => (
              <li key={d.id}>
                <button onClick={() => setEditing(d)} className="glass flex w-full items-center gap-3 p-4 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{String(d[cfg.title] ?? "(sin título)")}</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${d.status === "published" ? "bg-st-solucionado/15 text-st-solucionado" : "bg-chip text-muted"}`}>
                      {d.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                    {d.source === "auto" && <span className="ml-2 inline-block rounded-full bg-st-proceso/15 px-3 py-0.5 text-xs font-bold text-st-proceso">Automático · revisar</span>}
                  </div>
                  <Icon name="edit" className="h-5 w-5 text-muted" />
                </button>
              </li>
            ))}
          </ul>
          {!docs.length && <p className="glass p-10 text-center text-muted">Aún no hay {cfg.label.toLowerCase()}. Pulsa «Nuevo».</p>}
        </>
      )}
    </>
  );
}

function Editor({ col, fields, initial, onClose }: { col: string; fields: Field[]; initial: Doc | null; onClose: () => void }) {
  const init = () => {
    const v: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "images") {
        const arr = Array.isArray(initial?.photos) ? initial.photos : initial?.coverUrl ? [initial.coverUrl] : [];
        v[f.key] = JSON.stringify(arr);
        continue;
      }
      const raw = initial?.[f.key];
      v[f.key] = f.type === "lines" ? (Array.isArray(raw) ? raw.join("\n") : "") : raw == null ? (f.key === "status" ? "draft" : "") : String(raw);
    }
    return v;
  };
  const [v, setV] = useState(init);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, x: string) => setV((p) => ({ ...p, [k]: x }));

  const imgs = (k: string): string[] => JSON.parse(v[k] || "[]");

  async function addImgs(files: FileList | null, key: string) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      const out = imgs(key);
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - out.length)) {
        // Se guardan dentro del documento (límite 1 MiB): se comprimen fuerte.
        const small = await imageCompression(file, { maxSizeMB: 0.15, maxWidthOrHeight: 900, fileType: "image/jpeg" });
        out.push(await imageCompression.getDataUrlFromFile(small));
      }
      set(key, JSON.stringify(out));
    } catch { setErr("No se pudo procesar la foto."); } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const removeImg = (key: string, i: number) => set(key, JSON.stringify(imgs(key).filter((_, k) => k !== i)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "images") {
        const arr = imgs(f.key);
        data.photos = arr;
        data.coverUrl = arr[0] ?? null; // portada: compatibilidad con datos antiguos
        continue;
      }
      const raw = v[f.key].trim();
      if (f.required && !raw) return setErr(`Falta: ${f.label}`);
      if (f.type === "lines") data[f.key] = raw ? raw.split("\n").map((s) => s.trim()).filter(Boolean) : [];
      else if (f.type === "number") data[f.key] = raw ? Number(raw) : null;
      else if (raw || f.key === "status") data[f.key] = raw;
    }
    if (JSON.stringify(data).length > 950_000) return setErr("Las fotos pesan demasiado: quita una.");
    if (col === "surveys" && (data.options as string[]).length < 2) return setErr("Una encuesta necesita al menos 2 opciones.");
    setBusy(true);
    try {
      data.updatedAt = serverTimestamp();
      if (initial) await setDoc(doc(db(), col, initial.id), data, { merge: true });
      else await addDoc(collection(db(), col), { ...data, createdAt: serverTimestamp() });
      onClose();
    } catch { setErr("No se pudo guardar. Revisa tu conexión y permisos."); setBusy(false); }
  }

  async function remove() {
    if (!initial || !confirm("¿Eliminar definitivamente?")) return;
    await deleteDoc(doc(db(), col, initial.id));
    onClose();
  }

  const cls = "mt-1 w-full rounded-2xl bg-chip p-3 focus:outline-2 focus:outline-azul";
  return (
    <form onSubmit={save} className="glass mx-auto max-w-xl space-y-4 p-5">
      <h2 className="text-lg font-bold">{initial ? "Editar" : "Nuevo"}</h2>
      {fields.map((f) => f.type === "images" ? (
        <div key={f.key}>
          <span className="text-sm font-semibold">{f.label}</span>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {imgs(f.key).map((u, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-2xl object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-navy/80 px-2 text-[10px] font-bold text-background">Portada</span>}
                <button type="button" onClick={() => removeImg(f.key, i)} aria-label={`Quitar foto ${i + 1}`}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold text-background">✕</button>
              </div>
            ))}
            {imgs(f.key).length < MAX_PHOTOS && (
              <>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImgs(e.target.files, f.key)} />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl bg-azul-suave text-xs font-bold text-azul disabled:opacity-50">
                  <Icon name="plus" className="h-5 w-5" />Añadir
                </button>
              </>
            )}
          </div>
          <span className="text-xs text-muted">Hasta {MAX_PHOTOS} fotos; la primera es la portada.</span>
        </div>
      ) : (
        <label key={f.key} className="block">
          <span className="text-sm font-semibold">{f.label}{f.required && " *"}</span>
          {f.type === "textarea" || f.type === "lines" ? (
            <textarea value={v[f.key]} onChange={(e) => set(f.key, e.target.value)} rows={f.type === "lines" ? 4 : 3} className={cls} />
          ) : f.type === "select" ? (
            <select value={v[f.key]} onChange={(e) => set(f.key, e.target.value)} className={cls}>
              {!f.options!.some((o) => o.v === "") && <option value="">Elegir…</option>}
              {f.options!.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ) : (
            <input type={f.type === "datetime" ? "datetime-local" : f.type === "number" ? "number" : "text"} value={v[f.key]} onChange={(e) => set(f.key, e.target.value)} className={cls} />
          )}
          {f.hint && <span className="text-xs text-muted">{f.hint}</span>}
        </label>
      ))}
      {err && <p role="alert" className="text-sm font-semibold text-st-pendiente">{err}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="flex-1 rounded-full bg-azul py-3.5 font-bold text-white shadow-lg disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button>
        <button type="button" onClick={onClose} className="rounded-full bg-chip px-6 font-bold">Cancelar</button>
      </div>
      {initial && <button type="button" onClick={remove} className="w-full text-sm font-bold text-st-pendiente">Eliminar</button>}
    </form>
  );
}
