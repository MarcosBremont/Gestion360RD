"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { enablePush, pushState, type PushState } from "@/lib/push";

const ERRORS: Record<string, string> = {
  "no-vapid": "Falta configurar la clave de notificaciones (VAPID).",
  "no-sw": "Disponible en la versión publicada de la app, no en modo desarrollo.",
  denied: "Bloqueaste las notificaciones. Actívalas en los ajustes del navegador.",
};

/** Traduce el error real de Firebase/navegador a algo accionable. */
function explain(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  if (ERRORS[m]) return ERRORS[m];
  const text = `${(e as { name?: string })?.name ?? ""} ${(e as { code?: string })?.code ?? ""} ${m}`;
  if (/AbortError|push service error|messaging\/token-subscribe-failed|registration failed/i.test(text)) {
    return /Brave/i.test(navigator.userAgent) || (navigator as { brave?: unknown }).brave
      ? "Brave bloquea las notificaciones push. Activa «Usar servicios de Google para mensajería push» en brave://settings/privacy y recarga."
      : "El navegador no pudo registrarse en el servicio de notificaciones. Revisa que la API de Firebase Cloud Messaging esté habilitada.";
  }
  if (/permission-denied|insufficient permissions/i.test(text)) return "Firestore rechazó guardar el dispositivo: publica las reglas de seguridad.";
  if (/operation-not-allowed/i.test(text)) return "Activa el acceso Anónimo en Firebase → Authentication.";
  return `No se pudieron activar las notificaciones (${text.trim().slice(0, 90)}).`;
}

export default function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    pushState().then((s) => alive && setState(s));
    return () => { alive = false; };
  }, []);

  if (!state || state === "unsupported") return null;

  async function turnOn() {
    setBusy(true);
    setErr(null);
    try {
      await enablePush();
      setState("granted");
    } catch (e) {
      console.error("[push]", e);
      setErr(explain(e));
      setState(await pushState());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass flex items-center gap-3 p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-azul-suave text-azul"><Icon name="bell" className="h-6 w-6" /></span>
      <div className="min-w-0 flex-1">
        {state === "granted" ? (
          <p className="font-bold">Notificaciones activadas en este dispositivo</p>
        ) : state === "ios-install" ? (
          <>
            <p className="font-bold">Recibe avisos en tu iPhone</p>
            <p className="text-sm text-muted">Toca Compartir y «Añadir a pantalla de inicio»; luego actívalas desde la app instalada.</p>
          </>
        ) : (
          <>
            <p className="font-bold">Recibe avisos de tus reportes</p>
            <p className="text-sm text-muted">Te avisamos cuando se atienda y alertas importantes.</p>
          </>
        )}
        {err && <p role="alert" className="mt-1 text-sm font-semibold text-st-pendiente">{err}</p>}
      </div>
      {(state === "default" || state === "denied") && (
        <button onClick={turnOn} disabled={busy} className="shrink-0 rounded-full bg-azul px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "…" : "Activar"}
        </button>
      )}
    </section>
  );
}
