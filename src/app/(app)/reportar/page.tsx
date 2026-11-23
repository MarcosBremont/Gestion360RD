"use client";

import imageCompression from "browser-image-compression";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { enqueueReport } from "@/lib/offline/outbox";
import { syncOutbox } from "@/lib/offline/sync";
import { CATEGORIES, type ReportCategory } from "@/lib/types";

type Fix = { lat: number; lng: number; accuracy: number };

export default function ReportarPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [fix, setFix] = useState<Fix | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [state, setState] = useState<"edit" | "saving" | "done">("edit");
  const [sentNow, setSentNow] = useState(false);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function locate() {
    setGeoError(null);
    if (!("geolocation" in navigator)) return setGeoError("Tu dispositivo no ofrece ubicación.");
    const ok = (p: GeolocationPosition) =>
      setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
    const fail = (e: GeolocationPositionError) =>
      setGeoError(
        e.code === e.PERMISSION_DENIED
          ? "Bloqueaste la ubicación. Toca el icono de ubicación junto a la dirección del navegador y permítela. En Mac: Ajustes del Sistema → Privacidad → Servicios de ubicación."
          : e.code === e.TIMEOUT
            ? "Tardó demasiado en obtener la ubicación. Sal a un lugar abierto y toca el botón de actualizar."
            : "No hay señal de ubicación disponible. Activa el GPS o los servicios de ubicación del dispositivo."
      );
    // 1) GPS preciso; 2) si falla por señal (no por permiso), ubicación aproximada por red/Wi-Fi.
    navigator.geolocation.getCurrentPosition(
      ok,
      (e) => {
        if (e.code === e.PERMISSION_DENIED) return fail(e);
        navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    locate(); // el GPS arranca en cuanto se toma la foto
    const small = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  }

  const ready = Boolean(photo && category && fix);
  const steps = [Boolean(photo), Boolean(category), Boolean(fix)];

  async function submit() {
    if (!photo || !category || !fix) return;
    setState("saving");
    try {
      await enqueueReport({
        clientId: crypto.randomUUID(),
        category,
        description: description.trim().slice(0, 500),
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
        photo,
        createdAt: Date.now(),
        attempts: 0,
      });
    } catch {
      setState("edit");
      return setGeoError("No se pudo guardar el reporte en tu teléfono. Libera espacio e inténtalo de nuevo.");
    }
    // El reporte ya está a salvo en el teléfono. Se intenta enviar, pero sin bloquear más de 8 s:
    // si tarda (sin señal, servidor lento), se sigue en segundo plano.
    const sent = await Promise.race([
      syncOutbox().catch(() => 0),
      new Promise<number>((r) => setTimeout(() => r(0), 8000)),
    ]);
    setSentNow(sent > 0);
    setState("done");
  }

  if (state === "done")
    return (
      <div className="px-5 pt-16 pb-nav text-center">
        <span
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg ${
            sentNow ? "bg-st-solucionado" : "bg-azul"
          }`}
        >
          <Icon name={sentNow ? "check" : "clock"} className="h-12 w-12" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold">{sentNow ? "Reporte recibido" : "Guardado en tu teléfono"}</h1>
        <p className="mt-2 text-muted">
          {sentNow
            ? "Te avisaremos cuando el Ayuntamiento lo atienda."
            : "Se enviará automáticamente cuando tengas conexión."}
        </p>
        <Link href="/mis-reportes" className="mt-8 inline-block rounded-full bg-azul px-8 py-4 font-bold text-white shadow-lg">
          Ver mis reportes
        </Link>
      </div>
    );

  return (
    <div className="px-5 pt-5 pb-nav">
      <PageHeader title="Nuevo reporte" back="/" />

      <ol className="mb-5 flex gap-2" aria-label="Progreso">
        {steps.map((ok, i) => (
          <li key={i} className={`h-1.5 flex-1 rounded-full ${ok ? "bg-azul" : "bg-navy/10"}`} />
        ))}
      </ol>

      <section className="glass p-4" aria-labelledby="p1">
        <h2 id="p1" className="mb-3 font-bold">1 · Toma una foto</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto del problema" className="mb-3 aspect-video w-full rounded-2xl object-cover" />
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-azul-suave font-bold text-azul"
        >
          <Icon name="camera" className="h-5 w-5" />
          {preview ? "Cambiar foto" : "Abrir cámara"}
        </button>
      </section>

      <section className="glass mt-4 p-4" aria-labelledby="p2">
        <h2 id="p2" className="mb-3 font-bold">2 · ¿Qué es?</h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(c.id)}
                className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl p-3 text-sm font-bold transition ${
                  on ? "bg-azul text-white shadow-md" : "bg-chip"
                }`}
              >
                <Icon name={c.icon} className="h-7 w-7" />
                {c.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Detalles (opcional)"
          className="mt-3 w-full rounded-2xl bg-chip p-3 placeholder:text-muted focus:outline-2 focus:outline-azul"
        />
      </section>

      <section className="glass mt-4 p-4" aria-labelledby="p3">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="p3" className="font-bold">3 · Ubicación</h2>
          <button type="button" onClick={locate} aria-label="Actualizar ubicación" className="flex h-10 w-10 items-center justify-center rounded-full bg-chip">
            <Icon name="locate" className="h-5 w-5" />
          </button>
        </div>
        {fix ? (
          <div className="flex items-center gap-3 rounded-2xl bg-chip p-3">
            <Icon name="pin" className="h-6 w-6 text-azul" />
            <div className="text-sm">
              <p className="font-semibold">{fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}</p>
              <p className={fix.accuracy > 50 ? "font-bold text-st-pendiente" : "text-muted"}>
                Precisión ±{Math.round(fix.accuracy)} m
                {fix.accuracy > 50 && " · muévete a un lugar abierto y actualiza"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Se detecta al tomar la foto.</p>
        )}
        {geoError && <p role="alert" className="mt-2 text-sm font-semibold text-st-pendiente">{geoError}</p>}
      </section>

      <button
        type="button"
        disabled={!ready || state === "saving"}
        onClick={submit}
        className="mt-5 min-h-14 w-full rounded-full bg-azul px-6 text-lg font-bold text-white shadow-lg disabled:opacity-40"
      >
        {state === "saving" ? "Guardando…" : "Enviar reporte"}
      </button>
    </div>
  );
}
