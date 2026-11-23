"use client";

import { openDB, type DBSchema } from "idb";
import type { OutboxReport } from "../types";

interface OutboxDB extends DBSchema {
  outbox: { key: string; value: OutboxReport };
}

const dbPromise = () =>
  openDB<OutboxDB>("jarabacoa-outbox", 1, {
    upgrade(db) {
      db.createObjectStore("outbox", { keyPath: "clientId" });
    },
  });

export async function enqueueReport(r: OutboxReport) {
  await (await dbPromise()).put("outbox", r);
  window.dispatchEvent(new Event("outbox-changed"));
}

export async function listOutbox(): Promise<OutboxReport[]> {
  const all = await (await dbPromise()).getAll("outbox");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function removeFromOutbox(clientId: string) {
  await (await dbPromise()).delete("outbox", clientId);
  window.dispatchEvent(new Event("outbox-changed"));
}

export async function markAttempt(clientId: string, error: string) {
  const db = await dbPromise();
  const item = await db.get("outbox", clientId);
  if (item) await db.put("outbox", { ...item, attempts: item.attempts + 1, lastError: error });
  window.dispatchEvent(new Event("outbox-changed"));
}
