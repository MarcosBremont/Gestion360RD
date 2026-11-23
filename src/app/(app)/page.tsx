import Link from "next/link";
import Icon from "@/components/Icon";
import { MapArt, MapDot } from "@/components/MapArt";
import WeekStats from "@/components/WeekStats";

export default function Home() {
  return (
    <div className="px-5 pt-5 pb-nav">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-extrabold italic">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-background">
            <Icon name="pin" className="h-5 w-5" />
          </span>
          Jarabacoa
        </div>
        <div className="flex items-center gap-3">
          <Link href="/avisos" aria-label="Avisos" className="glass flex h-11 w-11 items-center justify-center rounded-full!">
            <Icon name="bell" className="h-5 w-5" />
          </Link>
          <Link href="/perfil" aria-label="Mi cuenta" className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-azul to-[#6a7cf0] text-white">
            <Icon name="user" className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <WeekStats />

      <h2 className="mt-7 text-lg font-bold">¿Qué necesitas hoy?</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile href="/reportar" icon="camera" title="Reportar un problema" sub="Baches • Basura • Alumbrado" />
        <Tile href="/explorar" icon="compass" title="Visita Jarabacoa" sub="Saltos • Ríos • Senderos" />
      </div>

      <Link href="/mapa" className="glass mt-4 flex items-stretch gap-3 overflow-hidden p-4">
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <p className="text-xs text-muted">Cerca de ti</p>
            <p className="mt-0.5 text-lg font-bold leading-tight">Mapa de reportes</p>
            <p className="mt-1 text-sm text-muted">Mira qué se está atendiendo en tu zona</p>
          </div>
          <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-azul px-3 py-1.5 text-sm font-bold text-white">
            Abrir <Icon name="arrow" className="h-4 w-4" />
          </span>
        </div>
        <div className="relative h-32 w-36 overflow-hidden rounded-2xl">
          <MapArt className="absolute inset-0 h-full w-full" />
          <MapDot x={45} y={55} size={14} />
        </div>
      </Link>
    </div>
  );
}

function Tile({ href, icon, title, sub }: { href: string; icon: "camera" | "compass"; title: string; sub: string }) {
  return (
    <Link href={href} className="glass flex flex-col justify-between p-4" style={{ minHeight: 168 }}>
      <div className="flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-chip">
          <Icon name={icon} className="h-6 w-6" />
        </span>
        <Icon name="arrow" className="h-5 w-5 text-muted" />
      </div>
      <div className="mt-4">
        <p className="text-lg font-bold leading-tight">{title}</p>
        <p className="mt-1 text-xs text-muted">{sub}</p>
      </div>
    </Link>
  );
}
