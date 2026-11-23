import { STATUS_META, type ReportStatus } from "@/lib/types";

export default function StatusPill({ status }: { status: ReportStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${m.className}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {m.label}
    </span>
  );
}
