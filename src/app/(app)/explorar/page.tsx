"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import Gallery from "@/components/Gallery";
import PageHeader from "@/components/PageHeader";
import { RatingBadge } from "@/components/Reviews";
import {
  BUSINESS_META, PLACE_META, photosOf, SEED_BUSINESSES, SEED_EVENTS, SEED_PLACES, SampleNote, useContent,
  type Business, type BusinessCategory, type EventItem, type Place, type PlaceCategory,
} from "@/lib/content";

type Tab = "lugares" | "agenda" | "comercios";
const TABS: { id: Tab; label: string }[] = [
  { id: "lugares", label: "Lugares" },
  { id: "agenda", label: "Agenda" },
  { id: "comercios", label: "Comercios" },
];

export default function Explorar() {
  const [tab, setTab] = useState<Tab>("lugares");
  return (
    <div className="px-5 pt-5 pb-nav">
      <PageHeader title="Explorar" back="/" />
      <div role="tablist" className="glass mb-4 flex gap-1 rounded-full! p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full py-2.5 text-sm font-bold transition ${tab === t.id ? "bg-azul text-white shadow" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "lugares" && <Lugares />}
      {tab === "agenda" && <Agenda />}
      {tab === "comercios" && <Comercios />}
    </div>
  );
}

function Chips<T extends string>({ value, onChange, options }: { value: T | "all"; onChange: (v: T | "all") => void; options: { id: T | "all"; label: string }[] }) {
  return (
    <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${value === o.id ? "bg-navy text-background" : "bg-chip"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Cover({ url, grad, icon, className = "h-36" }: { url?: string; grad: string; icon: Parameters<typeof Icon>[0]["name"]; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`w-full object-cover ${className}`} />
  ) : (
    <div className={`flex w-full items-center justify-center bg-linear-to-br text-white/90 ${grad} ${className}`}>
      <Icon name={icon} className="h-12 w-12" />
    </div>
  );
}

function Lugares() {
  const { items, sample } = useContent<Place>("places", SEED_PLACES);
  const [cat, setCat] = useState<PlaceCategory | "all">("all");
  const shown = items.filter((p) => cat === "all" || p.category === cat);
  return (
    <>
      <Chips value={cat} onChange={setCat} options={[{ id: "all", label: "Todos" }, ...(Object.keys(PLACE_META) as PlaceCategory[]).map((k) => ({ id: k, label: PLACE_META[k].label }))]} />
      <SampleNote show={sample} />
      <ul className="space-y-4">
        {shown.map((p) => {
          const m = PLACE_META[p.category];
          return (
            <li key={p.id}>
              <Link href={`/explorar/lugar/${p.id}`} className="glass block overflow-hidden">
                <Cover url={photosOf(p)[0]} grad={m.grad} icon={m.icon} />
                <div className="p-4">
                  <p className="text-xs font-bold text-azul">{m.label}</p>
                  <p className="text-lg font-bold leading-tight">{p.name}</p>
                  <div className="mt-2 flex gap-2 text-xs font-semibold text-muted">
                    {p.difficulty && <span className="rounded-full bg-chip px-3 py-1">{p.difficulty}</span>}
                    {p.durationMin && <span className="rounded-full bg-chip px-3 py-1">{Math.round(p.durationMin / 60 * 10) / 10} h</span>}
                    {!sample && <RatingBadge placeId={p.id} />}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {!shown.length && <p className="py-10 text-center text-muted">No hay lugares en esta categoría.</p>}
    </>
  );
}

function Agenda() {
  const { items, sample } = useContent<EventItem>("events", SEED_EVENTS);
  const sorted = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <>
      <SampleNote show={sample} />
      <ul className="space-y-3">
        {sorted.map((e) => {
          const d = new Date(e.startsAt);
          return (
            <li key={e.id} className="glass overflow-hidden">
              <Gallery photos={photosOf(e)} alt={e.title} className="h-36" />
              <div className="flex gap-4 p-4">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-azul-suave text-azul">
                <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
                <span className="text-xs font-bold uppercase">{d.toLocaleDateString("es-DO", { month: "short" })}</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold leading-tight">{e.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {d.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" })} · {e.venue}
                </p>
                {e.price && <span className="mt-2 inline-block rounded-full bg-chip px-3 py-0.5 text-xs font-bold">{e.price}</span>}
              </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Comercios() {
  const { items, sample } = useContent<Business>("businesses", SEED_BUSINESSES);
  const [cat, setCat] = useState<BusinessCategory | "all">("all");
  const shown = items.filter((b) => cat === "all" || b.category === cat);
  return (
    <>
      <Chips value={cat} onChange={setCat} options={[{ id: "all", label: "Todos" }, ...(Object.keys(BUSINESS_META) as BusinessCategory[]).map((k) => ({ id: k, label: BUSINESS_META[k].label }))]} />
      <SampleNote show={sample} />
      <ul className="space-y-3">
        {shown.map((b) => (
          <li key={b.id} className="glass overflow-hidden">
            <Link href={`/explorar/comercio/${b.id}`} className="block">
              <Gallery photos={photosOf(b)} alt={b.name} className="h-40" />
              <div className="p-4 pb-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-chip"><Icon name={BUSINESS_META[b.category].icon} className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight">{b.name}</p>
                    <p className="text-sm text-muted">{BUSINESS_META[b.category].label}{b.address ? ` · ${b.address}` : ""}</p>
                  </div>
                </div>
                {!sample && <div className="mt-2"><RatingBadge placeId={b.id} col="businesses" /></div>}
                {b.description && <p className="mt-3 line-clamp-2 text-sm text-muted">{b.description}</p>}
              </div>
            </Link>
            {(b.phone || b.whatsapp) && (
              <div className="flex gap-2 px-4 pb-4 pt-2">
                {b.phone && <a href={`tel:${b.phone}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-azul-suave py-2.5 text-sm font-bold text-azul"><Icon name="phone" className="h-4 w-4" />Llamar</a>}
                {b.whatsapp && <a href={`https://wa.me/${b.whatsapp}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-st-solucionado/15 py-2.5 text-sm font-bold text-st-solucionado"><Icon name="chat" className="h-4 w-4" />WhatsApp</a>}
              </div>
            )}
            {!(b.phone || b.whatsapp) && <div className="pb-2" />}
          </li>
        ))}
      </ul>
    </>
  );
}
