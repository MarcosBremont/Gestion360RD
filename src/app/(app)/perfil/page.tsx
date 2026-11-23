"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { authMessage, loginEmail, loginGoogle, logout, resetPassword } from "@/lib/firebase/actions";
import { useAuth } from "@/lib/firebase/auth";
import { firebaseConfigured } from "@/lib/firebase/client";

const ROLE_LABEL = { citizen: "Ciudadano", editor: "Editor de contenido", brigade: "Brigada", admin: "Administrador" } as const;

export default function Perfil() {
  const { user, role, loading } = useAuth();
  const signedIn = user && !user.isAnonymous;

  return (
    <div className="px-5 pt-5 pb-nav">
      <PageHeader title="Mi cuenta" back="/" />
      {!firebaseConfigured ? (
        <p className="glass p-4 text-sm">Firebase no está configurado. Revisa <code>.env.local</code>.</p>
      ) : loading ? (
        <p className="py-16 text-center text-muted">Cargando…</p>
      ) : signedIn ? (
        <Account />
      ) : (
        <Login anonymous={Boolean(user?.isAnonymous)} />
      )}
      {signedIn && role !== "citizen" && (
        <Link href="/admin" className="glass mt-4 flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-azul-suave text-azul"><Icon name="shield" className="h-5 w-5" /></span>
          <span className="flex-1 font-bold">Panel de gestión</span>
          <Icon name="arrow" className="h-5 w-5 text-muted" />
        </Link>
      )}
    </div>
  );
}

function Account() {
  const { user, role } = useAuth();
  const initial = (user?.displayName ?? user?.email ?? "?")[0].toUpperCase();
  return (
    <div className="space-y-4">
      <div className="glass flex items-center gap-4 p-5">
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-azul to-[#6a7cf0] text-2xl font-bold text-white">{initial}</span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user?.displayName ?? "Mi cuenta"}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-chip px-3 py-0.5 text-xs font-bold">{ROLE_LABEL[role]}</span>
        </div>
      </div>
      {user && !user.emailVerified && user.providerData.some((p) => p.providerId === "password") && (
        <p className="glass p-4 text-sm">Revisa tu correo para verificar tu cuenta. Las cuentas verificadas pueden reportar sin restricciones.</p>
      )}
      <button onClick={() => logout()} className="glass flex w-full items-center justify-center gap-2 py-4 font-bold">
        <Icon name="logout" className="h-5 w-5" />Cerrar sesión
      </button>
    </div>
  );
}

function Login({ anonymous }: { anonymous: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: authMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="glass p-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-azul-suave text-azul"><Icon name="user" className="h-8 w-8" /></span>
        <h2 className="mt-3 text-xl font-extrabold">{anonymous ? "Guarda tus reportes" : "Entra a tu cuenta"}</h2>
        <p className="mt-1 text-sm text-muted">
          {anonymous ? "Vincula una cuenta para no perder tus reportes y recibir avisos." : "Para seguir tus reportes y recibir notificaciones."}
        </p>
      </div>

      <button
        onClick={() => run(loginGoogle)} disabled={busy}
        className="glass flex w-full items-center justify-center gap-3 py-4 font-bold disabled:opacity-60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-extrabold text-azul">G</span>
        Continuar con Google
      </button>

      <p className="text-center text-xs text-muted">o con tu correo</p>

      <form
        className="glass space-y-3 p-4"
        onSubmit={(e) => { e.preventDefault(); void run(() => loginEmail(mode, email.trim(), password)); }}
      >
        <label className="block">
          <span className="text-sm font-semibold">Correo</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-2xl bg-chip p-3 focus:outline-2 focus:outline-azul" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Contraseña</span>
          <input type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-2xl bg-chip p-3 focus:outline-2 focus:outline-azul" />
        </label>
        {msg && <p role="alert" className={`text-sm font-semibold ${msg.ok ? "text-st-solucionado" : "text-st-pendiente"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-azul py-3.5 font-bold text-white shadow-lg disabled:opacity-50">
          {busy ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
        <div className="flex justify-between text-sm font-semibold text-azul">
          <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Crear una cuenta" : "Ya tengo cuenta"}
          </button>
          {mode === "login" && (
            <button type="button" onClick={() => email ? void run(async () => { await resetPassword(email.trim()); setMsg({ ok: true, text: "Te enviamos un correo para restablecerla." }); }) : setMsg({ ok: false, text: "Escribe tu correo primero." })}>
              Olvidé mi contraseña
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
