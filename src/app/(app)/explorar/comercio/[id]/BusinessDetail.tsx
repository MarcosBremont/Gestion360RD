"use client";

import { useParams } from "next/navigation";
import Gallery from "@/components/Gallery";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import Reviews from "@/components/Reviews";
import { BUSINESS_META, photosOf, SEED_BUSINESSES, SampleNote, useContent, type Business } from "@/lib/content";

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { items, sample } = useContent<Business>("businesses", SEED_BUSINESSES);
  const b = items.find((x) => x.id === id);

  if (!b)
    return (
      <div className="px-5 pt-5">
        <PageHeader title="Comercio" back="/explorar" />
        <p className="py-16 text-center text-muted">No encontramos este comercio.</p>
      </div>
    );

  const m = BUSINESS_META[b.category];
  const photos = photosOf(b);
  const mapQuery = encodeURIComponent(`${b.name} ${b.address ?? "Jarabacoa"}`);

  return (
    <div className="pb-nav">
      <div className="relative">
        {photos.length ? (
          <Gallery photos={photos} alt={b.name} className="h-72" />
        ) : (
          <div className="flex h-72 w-full items-center justify-center bg-linear-to-br from-sky-400 to-blue-600 text-white/90"><Icon name={m.icon} className="h-20 w-20" /></div>
        )}
        <div className="absolute inset-x-5 top-5"><PageHeader title="" back="/explorar" /></div>
      </div>

      <div className="glass -mt-8 mx-4 p-5">
        <p className="text-xs font-bold text-azul">{m.label}</p>
        <h1 className="text-2xl font-extrabold leading-tight">{b.name}</h1>
        {b.address && <p className="mt-2 flex items-start gap-2 text-sm text-muted"><Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0" />{b.address}</p>}
        {b.description && <p className="mt-4 text-muted">{b.description}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {b.phone && <a href={`tel:${b.phone}`} className="flex items-center justify-center gap-2 rounded-full bg-azul py-3.5 font-bold text-white shadow-lg"><Icon name="phone" className="h-5 w-5" />Llamar</a>}
          {b.whatsapp && <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-st-solucionado py-3.5 font-bold text-white shadow-lg"><Icon name="chat" className="h-5 w-5" />WhatsApp</a>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer"
            className={`flex items-center justify-center gap-2 rounded-full bg-azul-suave py-3.5 font-bold text-azul ${b.phone && b.whatsapp ? "col-span-2" : ""}`}>
            <Icon name="pin" className="h-5 w-5" />Cómo llegar
          </a>
        </div>
        <div className="mt-4"><SampleNote show={sample} /></div>
      </div>

      <div className="mx-4 mt-4"><Reviews col="businesses" placeId={id} enabled={!sample} /></div>
    </div>
  );
}
