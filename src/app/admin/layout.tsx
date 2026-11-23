"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import { useAuth, type Role } from "@/lib/firebase/auth";

const NAV: { href: string; label: string; icon: IconName; roles: Role[] }[] = [
  { href: "/admin", label: "Bandeja", icon: "inbox", roles: ["admin", "brigade"] },
  { href: "/admin/contenido", label: "Contenido", icon: "edit", roles: ["admin", "editor"] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const links = NAV.filter((n) => n.roles.includes(role));

  if (loading) return <p className="py-32 text-center text-muted">Cargando…</p>;
  if (!user || !links.length)
    return (
      <div className="mx-auto max-w-sm px-5 pt-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-azul-suave text-azul"><Icon name="shield" className="h-8 w-8" /></span>
        <h1 className="mt-4 text-xl font-extrabold">Acceso restringido</h1>
        <p className="mt-2 text-muted">Esta sección es solo para el personal del Ayuntamiento.</p>
        <Link href={user ? "/" : "/perfil"} className="mt-6 inline-block rounded-full bg-azul px-8 py-3.5 font-bold text-white shadow-lg">
          {user ? "Volver al inicio" : "Iniciar sesión"}
        </Link>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-5">
      <header className="glass mb-6 flex flex-wrap items-center justify-between gap-3 rounded-full! px-3 py-2">
        <div className="flex items-center gap-2 pl-2 font-extrabold italic">
          <Icon name="shield" className="h-5 w-5 text-azul" />Gestión
        </div>
        <Suspense fallback={null}>
          <AdminNav links={links} />
        </Suspense>
        <Link href="/" className="rounded-full bg-chip px-4 py-2 text-sm font-bold">Ir a la app</Link>
      </header>
      {children}
    </div>
  );
}

function AdminNav({ links }: { links: typeof NAV }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1" aria-label="Gestión">
      {links.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" || path.startsWith("/admin/reportes") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${on ? "bg-azul text-white" : "text-muted"}`}>
            <Icon name={l.icon} className="h-4 w-4" />{l.label}
          </Link>
        );
      })}
    </nav>
  );
}
