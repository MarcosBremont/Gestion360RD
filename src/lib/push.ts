"use client";

import { signInAnonymously } from "firebase/auth";
import { arrayUnion, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app, auth, db } from "./firebase/client";

export type PushState = "unsupported" | "ios-install" | "denied" | "granted" | "default";

export async function pushState(): Promise<PushState> {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (ios && !standalone) return "ios-install"; // iOS solo permite push en la PWA instalada
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  return Notification.permission as PushState;
}

export async function enablePush(): Promise<void> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error("no-vapid");
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error("no-sw"); // el service worker solo existe en producción

  if ((await Notification.requestPermission()) !== "granted") throw new Error("denied");
  const token = await getToken(getMessaging(app()), { vapidKey, serviceWorkerRegistration: reg });

  const a = auth();
  const user = a.currentUser ?? (await signInAnonymously(a)).user;
  await setDoc(doc(db(), "users", user.uid), { fcmTokens: arrayUnion(token), updatedAt: serverTimestamp() }, { merge: true });
}
