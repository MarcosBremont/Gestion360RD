import { getMessaging } from "firebase-admin/messaging";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

/** Cuando un usuario registra un dispositivo nuevo, se suscribe al tema de alertas. */
export const onUserTokens = onDocumentWritten("users/{uid}", async (event) => {
  const before: string[] = event.data?.before.data()?.fcmTokens ?? [];
  const after: string[] = event.data?.after.data()?.fcmTokens ?? [];
  const added = after.filter((t) => !before.includes(t));
  if (added.length) await getMessaging().subscribeToTopic(added, "alerts");
});

/** Cuando el personal publica un aviso, se envía push a todos los suscritos. */
export const onAlertPublished = onDocumentWritten("alerts/{id}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (after?.status !== "published" || before?.status === "published") return;
  await getMessaging().send({
    topic: "alerts",
    data: { title: String(after.title), body: String(after.body).slice(0, 180), url: "/avisos" },
    webpush: { headers: { Urgency: after.severity === "danger" ? "high" : "normal" } },
  });
});
