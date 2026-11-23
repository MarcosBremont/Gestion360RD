"use client";

import { useEffect, useState } from "react";
import type { OutboxReport } from "../types";
import { listOutbox } from "./outbox";
import { syncOutbox } from "./sync";

export function useOutbox() {
  const [items, setItems] = useState<OutboxReport[]>([]);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      void listOutbox().then((l) => {
        if (alive) setItems(l);
      });
    const run = () => void syncOutbox().then(refresh);

    // Lectura inicial y sync: ambos asíncronos, el setState ocurre en el callback.
    refresh();
    run();
    window.addEventListener("outbox-changed", refresh);
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    return () => {
      alive = false;
      window.removeEventListener("outbox-changed", refresh);
      window.removeEventListener("online", run);
      window.removeEventListener("focus", run);
    };
  }, []);

  return { items };
}
