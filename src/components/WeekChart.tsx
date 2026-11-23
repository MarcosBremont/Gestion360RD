const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const W = 320;
const H = 150;

/** Curva suave (Catmull-Rom → Bézier) por los puntos dados. */
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export default function WeekChart({
  received,
  resolved,
  inProgress,
  labels = DAYS,
}: {
  received: number[];
  resolved: number[];
  inProgress: number[];
  labels?: string[];
}) {
  const max = Math.max(...received, ...resolved, ...inProgress, 1);
  const step = W / (labels.length - 1);
  const y = (v: number) => H - 8 - (v / max) * (H - 24);
  const line = (vals: number[]) => vals.map((v, i) => [i * step, y(v)] as [number, number]);
  const blue = line(resolved);
  const yellow = line(inProgress);

  return (
    <div>
      <svg viewBox={`-8 0 ${W + 16} ${H}`} className="w-full" role="img" aria-label="Reportes de la semana">
        {/* Barras: recibidos */}
        {received.map((v, i) => {
          const h = (v / max) * (H - 24);
          return (
            <g key={i}>
              {Array.from({ length: 4 }).map((_, k) => (
                <rect
                  key={k}
                  x={i * step - 9 + k * 5}
                  y={H - 8 - h}
                  width="2.4"
                  height={h}
                  rx="1.2"
                  fill="currentColor"
                  className="text-navy/15"
                />
              ))}
            </g>
          );
        })}
        <path d={smooth(yellow)} fill="none" stroke="#f2c230" strokeWidth="2" />
        <path d={smooth(blue)} fill="none" stroke="#2f74e8" strokeWidth="2.2" />
        {blue.map(([x, yy], i) => (
          <circle key={i} cx={x} cy={yy} r="4" fill="#2f74e8" stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {labels.map((d) => (
          <span key={d} className="rounded-full bg-chip px-2.5 py-1 text-[11px] font-semibold text-muted">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
