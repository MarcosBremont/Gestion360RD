"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./client";

async function ensureUserDoc(u: User) {
  // Nunca se escribe `role`: lo asigna solo el servidor (custom claims).
  await setDoc(
    doc(db(), "users", u.uid),
    { displayName: u.displayName ?? null, email: u.email ?? null, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function loginGoogle() {
  const a = auth();
  const provider = new GoogleAuthProvider();
  try {
    const cred = a.currentUser?.isAnonymous
      ? await linkWithPopup(a.currentUser, provider)
      : await signInWithPopup(a, provider);
    await ensureUserDoc(cred.user);
  } catch (e) {
    // La cuenta de Google ya existía: se entra en ella (los reportes anónimos previos quedan en la otra sesión).
    if ((e as { code?: string }).code === "auth/credential-already-in-use") {
      const c = GoogleAuthProvider.credentialFromError(e as never);
      if (c) {
        const cred = await signInWithCredential(a, c);
        await ensureUserDoc(cred.user);
        return;
      }
    }
    throw e;
  }
}

export async function loginEmail(mode: "login" | "register", email: string, password: string) {
  const a = auth();
  if (mode === "login") {
    const cred = await signInWithEmailAndPassword(a, email, password);
    await ensureUserDoc(cred.user);
    return;
  }
  const cred = a.currentUser?.isAnonymous
    ? await linkWithCredential(a.currentUser, EmailAuthProvider.credential(email, password))
    : await createUserWithEmailAndPassword(a, email, password);
  await sendEmailVerification(cred.user);
  await ensureUserDoc(cred.user);
}

export const resetPassword = (email: string) => sendPasswordResetEmail(auth(), email);
export const logout = () => signOut(auth());

export function authMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/email-already-in-use": "Ese correo ya tiene una cuenta. Inicia sesión.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
    "auth/network-request-failed": "Sin conexión. Inténtalo cuando tengas señal.",
    "auth/operation-not-allowed": "Este método de acceso no está activado en Firebase.",
    "auth/unauthorized-domain": "Este sitio no está autorizado en Firebase. Añade el dominio en Authentication → Configuración → Dominios autorizados.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio.",
    "auth/cancelled-popup-request": "Se canceló el inicio de sesión. Inténtalo de nuevo.",
    "auth/web-storage-unsupported": "Tu navegador bloquea el almacenamiento necesario. Desactiva el modo privado o la protección de rastreo para este sitio.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
  };
  if (!map[code]) console.error("[auth]", e);
  return map[code] ?? `No se pudo completar${code ? ` (${code.replace("auth/", "")})` : ""}. Inténtalo de nuevo.`;
}
