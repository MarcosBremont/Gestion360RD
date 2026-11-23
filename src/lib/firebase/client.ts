"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

let appCheckStarted = false;
function startAppCheck(a: FirebaseApp) {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (appCheckStarted || typeof window === "undefined" || !key) return;
  appCheckStarted = true;
  // En desarrollo, Firebase imprime un token de depuración en la consola para registrarlo.
  if (process.env.NODE_ENV !== "production")
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(a, { provider: new ReCaptchaV3Provider(key), isTokenAutoRefreshEnabled: true });
}

export function app(): FirebaseApp {
  if (getApps().length) return getApp();
  const a = initializeApp(config);
  startAppCheck(a); // debe iniciarse antes que Firestore/Storage/Auth
  return a;
}

export function auth() {
  return getAuth(app());
}

export function db() {
  try {
    return initializeFirestore(app(), {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Ya inicializado en este contexto
    return getFirestore(app());
  }
}

export function storage() {
  const s = getStorage(app());
  // Por defecto Storage reintenta hasta 10 min; con mala señal (o bucket sin crear) eso parece un cuelgue.
  s.maxUploadRetryTime = 20_000;
  s.maxOperationRetryTime = 15_000;
  return s;
}
