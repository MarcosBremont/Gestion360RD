import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const db = () => getFirestore();

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/** Envía una notificación push a todos los dispositivos de un usuario y limpia los tokens caducados. */
export async function pushToUser(uid: string, p: PushPayload) {
  const ref = db().doc(`users/${uid}`);
  const tokens: string[] = (await ref.get()).data()?.fcmTokens ?? [];
  if (!tokens.length) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { ...p },
    webpush: { headers: { Urgency: "high" } },
  });
  const dead = tokens.filter((_, i) => {
    const code = res.responses[i].error?.code;
    return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
  });
  if (dead.length) {
    const { FieldValue } = await import("firebase-admin/firestore");
    await ref.update({ fcmTokens: FieldValue.arrayRemove(...dead) });
  }
}

/** Distancia en metros entre dos coordenadas. */
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
