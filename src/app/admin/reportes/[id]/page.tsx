import { Suspense } from "react";
import AdminReport from "./AdminReport";

export default function Page() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-muted">Cargando…</p>}>
      <AdminReport />
    </Suspense>
  );
}
