"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { IconName } from "@/components/Icon";
import { db, firebaseConfigured } from "./firebase/client";

export type PlaceCategory = "salto" | "rio" | "sendero" | "restaurante" | "mirador";
export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  description: string;
  difficulty?: string;
  durationMin?: number;
  tips?: string[];
  mapQuery: string;
  coverUrl?: string;
  photos?: string[];
}
export interface EventItem {
  id: string;
  title: string;
  description: string;
  startsAt: string; // ISO
  venue: string;
  price?: string;
  coverUrl?: string;
  photos?: string[];
}
export type BusinessCategory = "comida" | "hospedaje" | "tours" | "artesania" | "servicios";
export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  description: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  coverUrl?: string;
  photos?: string[];
}
/** Fotos de un elemento: `photos` (hasta 3) o, en datos antiguos, solo `coverUrl`. */
export const photosOf = (x: { photos?: string[]; coverUrl?: string }): string[] =>
  x.photos?.length ? x.photos : x.coverUrl ? [x.coverUrl] : [];

export interface AlertItem {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "danger";
}
export interface Survey {
  id: string;
  question: string;
  options: string[];
}

export const PLACE_META: Record<PlaceCategory, { label: string; icon: IconName; grad: string }> = {
  salto: { label: "Saltos", icon: "water", grad: "from-sky-400 to-blue-600" },
  rio: { label: "Ríos", icon: "water", grad: "from-cyan-400 to-teal-600" },
  sendero: { label: "Senderos", icon: "mountain", grad: "from-emerald-400 to-green-700" },
  restaurante: { label: "Restaurantes", icon: "fork", grad: "from-orange-400 to-amber-600" },
  mirador: { label: "Miradores", icon: "mountain", grad: "from-indigo-400 to-violet-600" },
};

export const BUSINESS_META: Record<BusinessCategory, { label: string; icon: IconName }> = {
  comida: { label: "Comida", icon: "fork" },
  hospedaje: { label: "Hospedaje", icon: "home" },
  tours: { label: "Tours", icon: "compass" },
  artesania: { label: "Artesanía", icon: "star" },
  servicios: { label: "Servicios", icon: "store" },
};

// ── Contenido de EJEMPLO: se muestra solo mientras no haya contenido publicado en Firestore ──
export const SEED_PLACES: Place[] = [
  { id: "salto-jimenoa", name: "Salto de Jimenoa", category: "salto", description: "Uno de los saltos más conocidos de Jarabacoa, rodeado de vegetación y con zona para bañarse.", difficulty: "Media", durationMin: 120, tips: ["Lleva calzado con agarre", "Evita ir tras lluvias fuertes", "Guarda tu celular en bolsa impermeable"], mapQuery: "Salto de Jimenoa Jarabacoa" },
  { id: "salto-baiguate", name: "Salto de Baiguate", category: "salto", description: "Caída de agua de fácil acceso, ideal para ir en familia.", difficulty: "Fácil", durationMin: 90, tips: ["Hay tramos resbaladizos", "Llega temprano para evitar aglomeración"], mapQuery: "Salto de Baiguate Jarabacoa" },
  { id: "yaque-del-norte", name: "Río Yaque del Norte", category: "rio", description: "El río más largo del país pasa por Jarabacoa; punto habitual de rafting.", difficulty: "Media", durationMin: 180, tips: ["Usa siempre chaleco salvavidas", "Contrata operadores autorizados"], mapQuery: "Río Yaque del Norte Jarabacoa" },
  { id: "ruta-cordillera", name: "Rutas hacia la Cordillera Central", category: "sendero", description: "Punto de partida de senderos de montaña. Consulta condiciones antes de salir.", difficulty: "Difícil", durationMin: 480, tips: ["Avisa tu ruta a alguien", "Descarga esta ficha: puede no haber señal"], mapQuery: "Jarabacoa senderos montaña" },
];

export const SEED_EVENTS: EventItem[] = [
  { id: "ev1", title: "Feria artesanal (ejemplo)", description: "Evento de muestra para ver el diseño de la agenda.", startsAt: "2026-12-05T10:00:00", venue: "Parque Central", price: "Gratis" },
  { id: "ev2", title: "Concierto navideño (ejemplo)", description: "Evento de muestra para ver el diseño de la agenda.", startsAt: "2026-12-19T19:00:00", venue: "Plaza del pueblo", price: "Gratis" },
  { id: "ev3", title: "Caminata ecológica (ejemplo)", description: "Evento de muestra para ver el diseño de la agenda.", startsAt: "2026-12-27T08:00:00", venue: "Punto de encuentro por confirmar" },
];

export const SEED_BUSINESSES: Business[] = [
  { id: "b1", name: "Comedor de ejemplo", category: "comida", description: "Comercio de muestra para ver el directorio.", address: "Centro de Jarabacoa", phone: "809-555-0100", whatsapp: "18095550100" },
  { id: "b2", name: "Cabañas de ejemplo", category: "hospedaje", description: "Comercio de muestra para ver el directorio.", address: "Zona de montaña" },
  { id: "b3", name: "Tours de ejemplo", category: "tours", description: "Comercio de muestra para ver el directorio.", phone: "809-555-0101" },
];

export const SEED_ALERTS: AlertItem[] = [
  { id: "a1", title: "Así se verán los avisos", body: "Aviso de ejemplo. Aquí aparecerán las alertas climáticas y comunicados oficiales del Ayuntamiento.", severity: "info" },
];

export const SEED_SURVEYS: Survey[] = [
  { id: "demo", question: "¿Qué debería priorizar el Ayuntamiento este mes? (ejemplo)", options: ["Arreglo de calles", "Recogida de basura", "Alumbrado público", "Seguridad vial"] },
];

/** Lee documentos publicados de Firestore; si no hay (o sin configurar), usa el contenido de ejemplo. */
export function useContent<T extends { id: string }>(col: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(seed);
  const [sample, setSample] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onSnapshot(
      query(collection(db(), col), where("status", "==", "published")),
      (snap) => {
        if (snap.empty) {
          setItems(seed);
          setSample(true);
        } else {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T));
          setSample(false);
        }
      },
      () => {}
    );
  }, [col, seed]);

  return { items, sample };
}

export function SampleNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="mb-3 text-center text-[11px] text-muted">Contenido de ejemplo · el equipo del Ayuntamiento lo reemplazará</p>;
}
