import { Suspense } from "react";
import BusinessDetail from "./BusinessDetail";

export default function Page() {
  return (
    <Suspense fallback={<div className="px-5 pt-20 text-center text-muted">Cargando…</div>}>
      <BusinessDetail />
    </Suspense>
  );
}
