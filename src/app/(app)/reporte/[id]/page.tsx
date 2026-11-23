import { Suspense } from "react";
import ReportDetail from "./ReportDetail";

export default function Page() {
  return (
    <Suspense fallback={<div className="px-5 pt-20 text-center text-muted">Cargando…</div>}>
      <ReportDetail />
    </Suspense>
  );
}
