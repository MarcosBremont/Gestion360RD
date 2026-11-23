import type { IconName } from "@/components/Icon";

export type ReportCategory = "bache" | "basura" | "semaforo" | "alumbrado";
export type ReportStatus = "pending" | "in_progress" | "resolved" | "rejected";

export const CATEGORIES: { id: ReportCategory; label: string; icon: IconName }[] = [
  { id: "bache", label: "Bache / hoyo", icon: "road" },
  { id: "basura", label: "Basura", icon: "trash" },
  { id: "semaforo", label: "Semáforo dañado", icon: "traffic" },
  { id: "alumbrado", label: "Alumbrado", icon: "bulb" },
];

export const STATUS_META: Record<
  ReportStatus,
  { label: string; icon: IconName; className: string }
> = {
  pending: { label: "Pendiente", icon: "clock", className: "bg-st-pendiente/20 text-st-pendiente" },
  in_progress: { label: "En proceso", icon: "clock", className: "bg-st-proceso/15 text-st-proceso" },
  resolved: { label: "Solucionado", icon: "check", className: "bg-st-solucionado/15 text-st-solucionado" },
  rejected: { label: "Rechazado", icon: "alert", className: "bg-st-rechazado/20 text-st-rechazado" },
};

export interface OutboxReport {
  clientId: string;
  category: ReportCategory;
  description: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  photo: Blob;
  createdAt: number;
  attempts: number;
  lastError?: string;
}
