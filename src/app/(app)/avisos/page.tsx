"use client";

import { signInAnonymously } from "firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import PushToggle from "@/components/PushToggle";
import { SEED_ALERTS, SEED_SURVEYS, SampleNote, useContent, type AlertItem, type Survey } from "@/lib/content";
import { useAuth } from "@/lib/firebase/auth";
import { fetchWeather, type Weather } from "@/lib/weather";
import { auth, db, firebaseConfigured } from "@/lib/firebase/client";

const SERVER_FUNCTIONS = process.env.NEXT_PUBLIC_SERVER_FUNCTIONS === "true";

function useWeather() {
  const [w, setW] = useState<Weather | null>(null);
  useEffect(() => {
    if (!firebaseConfigured) return;
    // Con Cloud Functions: se lee weather/current. Sin ellas: se pide a Open-Meteo desde el navegador.
    if (!SERVER_FUNCTIONS) {
      let alive = true;
      fetchWeather().then((x) => alive && setW(x));
      return () => { alive = false; };
    }
    return onSnapshot(
      doc(db(), "weather", "current"),
      (s) => { const v = s.data(); setW(v ? ({ ...v, updatedAt: v.updatedAt?.toDate?.() } as Weather) : null); },
      () => {}
    );
  }, []);
  return w;
}

const weatherIcon = (c: number) => (c <= 2 ? "sun" : c >= 51 ? "water" : "cloud") as "sun" | "water" | "cloud";

const SEV: Record<AlertItem["severity"], string> = {
  info: "bg-st-proceso/15 text-st-proceso",
  warning: "bg-st-pendiente/20 text-st-pendiente",
  danger: "bg-red-500/15 text-red-600",
};

export default function Avisos() {
  const alerts = useContent<AlertItem>("alerts", SEED_ALERTS);
  const surveys = useContent<Survey>("surveys", SEED_SURVEYS);

  return (
    <div className="px-5 pt-5 pb-nav">
      <PageHeader title="Avisos" back="/" />

      <Notifications />

      <div className="mt-6"><PushToggle /></div>

      <WeatherCard />

      <h2 className="mt-7 mb-3 text-lg font-bold">Alertas</h2>
      <SampleNote show={alerts.sample} />
      <ul className="space-y-3">
        {alerts.items.map((a) => (
          <li key={a.id} className="glass p-4">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${SEV[a.severity]}`}>
              <Icon name="megaphone" className="h-4 w-4" />
              {a.severity === "danger" ? "Urgente" : a.severity === "warning" ? "Precaución" : "Información"}
            </span>
            <p className="mt-2 font-bold">{a.title}</p>
            <p className="mt-1 text-sm text-muted">{a.body}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-7 mb-3 text-lg font-bold">Encuesta ciudadana</h2>
      <SampleNote show={surveys.sample} />
      {surveys.items.slice(0, 1).map((s) => <SurveyCard key={s.id} s={s} demo={surveys.sample} />)}
    </div>
  );
}

function SurveyCard({ s, demo }: { s: Survey; demo: boolean }) {
  const key = `voted-${s.id}`;
  const [voted, setVoted] = useState(() => {
    try { return typeof window !== "undefined" && localStorage.getItem(key) !== null; } catch { return false; }
  });
  const [pick, setPick] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function vote() {
    if (pick === null) return;
    setBusy(true);
    setErr(null);
    try {
      if (!demo && firebaseConfigured) {
        const a = auth();
        const u = a.currentUser ?? (await signInAnonymously(a)).user;
        // Un voto por persona: el ID del documento es el uid (lo exigen las reglas).
        await setDoc(doc(db(), "surveys", s.id, "responses", u.uid), { choice: pick, createdAt: serverTimestamp() });
      }
      localStorage.setItem(key, String(pick));
      setVoted(true);
    } catch {
      setErr("No se pudo registrar tu voto. ¿Ya votaste o no tienes conexión?");
    } finally {
      setBusy(false);
    }
  }

  if (voted)
    return (
      <div className="glass p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-st-solucionado text-white"><Icon name="check" className="h-7 w-7" /></span>
        <p className="mt-3 font-bold">¡Gracias por participar!</p>
        <p className="text-sm text-muted">Tu opinión ayuda a decidir prioridades.</p>
      </div>
    );

  return (
    <div className="glass p-4">
      <p className="font-bold">{s.question}</p>
      <div className="mt-3 space-y-2" role="radiogroup" aria-label={s.question}>
        {s.options.map((o, i) => (
          <button
            key={o} role="radio" aria-checked={pick === i} onClick={() => setPick(i)}
            className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left font-semibold ${pick === i ? "bg-azul text-white" : "bg-chip"}`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${pick === i ? "border-white" : "border-muted"}`}>
              {pick === i && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
            </span>
            {o}
          </button>
        ))}
      </div>
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-st-pendiente">{err}</p>}
      <button onClick={vote} disabled={pick === null || busy} className="mt-4 w-full rounded-full bg-azul py-3.5 font-bold text-white shadow-lg disabled:opacity-40">
        {busy ? "Enviando…" : "Votar"}
      </button>
    </div>
  );
}

interface Note { id: string; title: string; body: string; reportId?: string; read: boolean; createdAt?: Date }

function Notifications() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [items, setItems] = useState<Note[]>([]);

  useEffect(() => {
    if (!firebaseConfigured || !uid) return;
    return onSnapshot(
      query(collection(db(), "notifications", uid, "items"), orderBy("createdAt", "desc"), limit(20)),
      (s) => setItems(s.docs.map((d) => {
        const v = d.data({ serverTimestamps: "estimate" });
        return { id: d.id, title: v.title, body: v.body, reportId: v.reportId, read: v.read, createdAt: v.createdAt?.toDate?.() } as Note;
      })),
      () => {}
    );
  }, [uid]);

  if (!uid || !items.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Tus notificaciones</h2>
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={n.reportId ? `/reporte/${n.reportId}` : "#"}
              onClick={() => !n.read && updateDoc(doc(db(), "notifications", uid, "items", n.id), { read: true })}
              className="glass flex items-start gap-3 p-4"
            >
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? "bg-navy/15" : "bg-azul"}`} />
              <span>
                <span className="block font-bold leading-tight">{n.title}</span>
                <span className="text-sm text-muted">{n.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WeatherCard() {
  const w = useWeather();
  if (!w)
    return (
      <section className="glass mt-6 p-5 text-center text-sm text-muted">El clima de Jarabacoa no está disponible por ahora.</section>
    );
  return (
    <section className="glass mt-6 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Jarabacoa ahora</p>
          <p className="mt-1 text-6xl font-extrabold tracking-tight">{w.temp}°</p>
          <p className="mt-1 font-semibold">{w.condition}</p>
        </div>
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-azul-suave text-azul"><Icon name={weatherIcon(w.code)} className="h-10 w-10" /></span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        {[
          { i: "water" as const, v: `${w.humidity}%`, l: "Humedad" },
          { i: "wind" as const, v: `${w.wind} km/h`, l: "Viento" },
          { i: "cloud" as const, v: `${w.rainProb}%`, l: "Lluvia (3 h)" },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl bg-chip py-3">
            <Icon name={x.i} className="mx-auto h-5 w-5 text-azul" />
            <p className="mt-1 font-bold">{x.v}</p>
            <p className="text-xs text-muted">{x.l}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">
        {w.updatedAt && `Actualizado ${w.updatedAt.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" })} · `}
        Datos: <a href="https://open-meteo.com" className="underline" target="_blank" rel="noreferrer">Open-Meteo.com</a>
      </p>
    </section>
  );
}
