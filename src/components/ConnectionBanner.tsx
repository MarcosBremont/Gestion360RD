"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export default function ConnectionBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-2">
      <p className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-background shadow-lg">
        Sin conexión · tus reportes se guardan y se envían solos
      </p>
    </div>
  );
}
