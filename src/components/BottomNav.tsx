"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const items: { href: string; label: string; icon: IconName; cta?: boolean }[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/mapa", label: "Mapa", icon: "map" },
  { href: "/reportar", label: "Reportar un problema", icon: "camera", cta: true },
  { href: "/mis-reportes", label: "Mis reportes", icon: "list" },
  { href: "/explorar", label: "Explorar", icon: "compass" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ul className="glass flex items-center gap-2 rounded-full! p-2">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          const base = "flex h-12 w-12 items-center justify-center rounded-full transition";
          const style = it.cta
            ? "bg-linear-to-br from-azul via-[#6a7cf0] to-[#b07cf0] text-white shadow-md"
            : active
              ? "bg-azul text-white shadow-md"
              : "bg-chip text-navy/70";
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-label={it.label}
                aria-current={active ? "page" : undefined}
                className={`${base} ${style}`}
              >
                <Icon name={it.icon} className="h-5 w-5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
