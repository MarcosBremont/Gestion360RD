import { DocumentReference, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db, haversine, pushToUser } from "./helpers";

const NOTIFY: Record<string, { title: string; body: string }> = {
  in_progress: { title: "Tu reporte está en proceso", body: "El Ayuntamiento ya está trabajando en él." },
  resolved: { title: "Tu reporte fue solucionado", body: "Mira la foto del trabajo y confirma si quedó resuelto." },
  rejected: { title: "No pudimos atender tu reporte", body: "Abre el reporte para ver el motivo." },
  pending: { title: "Reabrimos tu reporte", body: "Lo volvemos a revisar con prioridad." },
};

const MAX_PER_HOUR = 5; // más de esto => "por revisar" y no se publica en el mapa
const DUP_RADIUS_M = 30;
const DUP_DAYS = 14;

/** Revisión de un reporte recién creado: límite de frecuencia y detección de duplicados. */
async function screenNewReport(ref: DocumentReference, id: string, r: FirebaseFirestore.DocumentData) {
  const patch: Record<string, unknown> = { screenedAt: FieldValue.serverTimestamp() };

  const hourAgo = Timestamp.fromMillis(Date.now() - 3600_000);
  const recent = await db().collection("reports").where("reporterUid", "==", r.reporterUid).where("createdAt", ">=", hourAgo).count().get();
  if (recent.data().count > MAX_PER_HOUR) {
    patch.moderation = "review";
    patch.flag = "rate-limit";
  }

  const since = Timestamp.fromMillis(Date.now() - DUP_DAYS * 86400_000);
  const near = await db().collection("reports").where("category", "==", r.category).where("createdAt", ">=", since).limit(300).get();
  let best: { id: string; d: number } | null = null;
  for (const d of near.docs) {
    const o = d.data();
    if (d.id === id || o.status === "resolved" || o.status === "rejected" || !o.location || !r.location) continue;
    const dist = haversine(r.location.latitude, r.location.longitude, o.location.latitude, o.location.longitude);
    if (dist <= DUP_RADIUS_M && (!best || dist < best.d)) best = { id: d.id, d: dist };
  }
  if (best) patch.duplicateOf = best.id;

  await ref.update(patch); // dispara de nuevo esta función, ya con la revisión hecha
}

/**
 * reports/{id} → publicReports/{id}
 * - Proyección SIN datos personales ni la foto del ciudadano: solo `hasPhoto`.
 * - Notificación en la bandeja y push al cambiar el estado.
 * - Si el ciudadano responde "No quedó resuelto", se reabre con prioridad alta.
 */
export const onReportWritten = onDocumentWritten("reports/{id}", async (event) => {
  const id = event.params.id;
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const pub = db().doc(`publicReports/${id}`);

  if (!after) {
    await pub.delete();
    return;
  }

  // Alta: se revisa primero y no se publica nada hasta la segunda ejecución.
  if (!before) {
    await screenNewReport(event.data!.after.ref, id, after);
    return;
  }

  if (after.status === "rejected" || after.moderation === "review") {
    await pub.delete();
  } else {
    await pub.set({
      category: after.category,
      status: after.status,
      location: after.location,
      barrio: after.barrio ?? null,
      hasPhoto: Boolean(after.photos?.length),
      hasEvidence: (after.evidenceCount ?? 0) > 0,
      createdAt: after.createdAt ?? FieldValue.serverTimestamp(),
      resolvedAt: after.resolvedAt ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (before.status !== after.status && after.reporterUid && NOTIFY[after.status]) {
    const n = NOTIFY[after.status];
    await db().collection(`notifications/${after.reporterUid}/items`).add({
      ...n,
      reportId: id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    await pushToUser(after.reporterUid, { ...n, url: `/reporte/${id}` });
  }

  if (after.status === "resolved" && after.citizenConfirmation === "no" && before.citizenConfirmation !== "no") {
    await event.data!.after.ref.update({
      status: "pending",
      priority: "high",
      citizenConfirmation: FieldValue.delete(),
      resolvedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await event.data!.after.ref.collection("timeline").add({
      type: "status_changed",
      fromStatus: "resolved",
      toStatus: "pending",
      by: "system",
      publicNote: "El ciudadano indicó que el problema no quedó resuelto.",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
});
