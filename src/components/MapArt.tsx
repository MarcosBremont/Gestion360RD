import type { ReactNode } from "react";

/** Ilustración de mapa (placeholder hasta integrar MapLibre). */
export function MapArt({ className = "" }: { className?: string }) {
  const streets = [];
  for (let i = -6; i < 14; i++) streets.push(<line key={`a${i}`} x1={i * 38} y1="0" x2={i * 38 + 200} y2="700" />);
  for (let i = -2; i < 18; i++) streets.push(<line key={`b${i}`} x1="-50" y1={i * 42} x2="500" y2={i * 42 - 90} />);
  return (
    <svg
      viewBox="0 0 400 640"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <rect width="400" height="640" fill="#eef2ee" />
      <g stroke="#ffffff" strokeWidth="5" opacity="0.95">{streets}</g>
      <g stroke="#dfe6df" strokeWidth="1" opacity="0.9">{streets}</g>
      <g fill="#cde8c2" opacity="0.9">
        <rect x="40" y="120" width="70" height="46" rx="8" />
        <rect x="150" y="300" width="56" height="40" rx="8" />
        <rect x="30" y="470" width="84" height="52" rx="8" />
      </g>
      <path d="M250 0 C 270 120 330 200 300 300 C 280 380 340 470 330 640 L 400 640 L 400 0 Z" fill="#a9dbe6" />
      <path d="M250 0 C 270 120 330 200 300 300 C 280 380 340 470 330 640" fill="none" stroke="#dff3f7" strokeWidth="4" />
    </svg>
  );
}

/** Punto con halo pulsante, posicionado en % sobre el mapa. */
export function MapDot({
  x,
  y,
  size = 18,
  color = "#2f74e8",
  big = false,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  big?: boolean;
  children?: ReactNode;
}) {
  const halo = size * (big ? 3.4 : 2.6);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <span
        className="pulse-ring absolute left-1/2 top-1/2 rounded-full"
        style={{ width: halo, height: halo, marginLeft: -halo / 2, marginTop: -halo / 2, background: color, opacity: 0.25 }}
      />
      <span
        className="relative block rounded-full border-[3px] border-white shadow-md"
        style={{ width: size, height: size, background: color }}
      />
      {children}
    </div>
  );
}
