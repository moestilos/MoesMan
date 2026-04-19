import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  data: Array<[string, number]>;
  className?: string;
  title?: string;
  subtitle?: string;
}

// Area chart moderno: linea suave + fill gradient + puntos hover.
// Limpio, pro, sin 3D fake.
export default function BarChart3D({
  data,
  className = '',
  title,
  subtitle,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const max = useMemo(() => Math.max(1, ...data.map(([, v]) => v)), [data]);
  const total = useMemo(() => data.reduce((s, [, v]) => s + v, 0), [data]);
  const avg = data.length > 0 ? total / data.length : 0;
  const count = data.length;

  const W = 900;
  const H = 280;
  const padL = 44;
  const padR = 20;
  const padT = 24;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Si pocos datos, replicar puntos para no dar impresión de línea plana
  // Si count === 1, mostramos como KPI grande en vez de line chart
  const singleMode = count <= 1;

  // Points
  const pts = data.map(([day, v], i) => {
    const x = count === 1 ? padL + plotW / 2 : padL + (i / (count - 1)) * plotW;
    const y = padT + plotH - (v / max) * plotH;
    return { x, y, day, v };
  });

  // Smooth path (catmull-rom → bezier)
  function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }
  const linePath = smoothPath(pts);
  const areaPath =
    pts.length > 0
      ? `${linePath} L ${pts[pts.length - 1].x} ${padT + plotH} L ${pts[0].x} ${padT + plotH} Z`
      : '';

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((max * i) / ticks));

  const hoverPt = hoverIdx !== null ? pts[hoverIdx] : null;

  return (
    <section className={`surface p-4 sm:p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {subtitle && <span className="section-kicker">{subtitle}</span>}
            {title && <h3 className="mt-2 font-display text-lg sm:text-xl font-bold tracking-tight">{title}</h3>}
          </div>
          <div className="flex flex-none items-baseline gap-3 text-right">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Total</div>
              <div className="font-display text-lg sm:text-xl font-black tabular-nums text-fg">{total}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-fg-subtle">Promedio</div>
              <div className="font-display text-lg sm:text-xl font-black tabular-nums text-brand-300">
                {avg.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {count === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">Sin datos aún.</p>
      ) : (
        <div
          className="relative w-full h-[220px] xs:h-[260px] sm:h-auto sm:aspect-[900/280] overflow-hidden"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--brand-400))" stopOpacity="0.55" />
                <stop offset="60%" stopColor="rgb(var(--brand-500))" stopOpacity="0.15" />
                <stop offset="100%" stopColor="rgb(var(--brand-500))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="area-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(var(--brand-300))" />
                <stop offset="50%" stopColor="rgb(var(--brand-500))" />
                <stop offset="100%" stopColor="rgb(var(--accent-500))" />
              </linearGradient>
              <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid Y */}
            {tickVals.map((v, i) => {
              const y = padT + plotH - (v / max) * plotH;
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? '' : '3 4'}
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    fill="rgba(200,200,210,0.55)"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="end"
                    className="tabular-nums"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {!singleMode && (
              <path
                d={areaPath}
                fill="url(#area-fill)"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: 'opacity 600ms ease-out',
                }}
              />
            )}
            {/* Line */}
            {!singleMode && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#area-line)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#line-glow)"
                style={{
                  strokeDasharray: 3000,
                  strokeDashoffset: mounted ? 0 : 3000,
                  transition: 'stroke-dashoffset 1200ms cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            )}

            {/* Dots + hover zones */}
            {pts.map((p, i) => {
              const isHover = hoverIdx === i;
              const zoneW = Math.max(24, plotW / Math.max(1, count - 1));
              return (
                <g key={`pt-${i}`}>
                  {/* Hover zone invisible */}
                  <rect
                    x={p.x - zoneW / 2}
                    y={padT}
                    width={zoneW}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHoverIdx(i)}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHover ? 6 : singleMode ? 5 : 3}
                    fill={isHover || singleMode ? 'rgb(var(--brand-400))' : 'rgb(var(--brand-500))'}
                    stroke="#0a0a0d"
                    strokeWidth={isHover || singleMode ? 3 : 2}
                    style={{
                      transition: 'r 160ms ease, fill 160ms ease',
                      opacity: mounted ? 1 : 0,
                      transitionProperty: 'r, fill, opacity',
                      filter: isHover ? 'drop-shadow(0 0 8px rgb(var(--brand-500) / 0.8))' : undefined,
                    }}
                  />
                </g>
              );
            })}

            {/* Hover vertical line + tooltip */}
            {hoverPt && (
              <g>
                <line
                  x1={hoverPt.x}
                  y1={padT}
                  x2={hoverPt.x}
                  y2={padT + plotH}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Tooltip */}
                <g transform={`translate(${Math.min(Math.max(padL, hoverPt.x - 50), W - padR - 100)}, ${Math.max(padT, hoverPt.y - 54)})`}>
                  <rect width="100" height="42" rx="6" fill="rgba(14,14,18,0.96)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <text x="10" y="16" fill="rgba(200,200,210,0.7)" fontSize="10" fontWeight="700" letterSpacing="0.5">
                    {hoverPt.day.slice(-5)}
                  </text>
                  <text x="10" y="34" fill="#fff" fontSize="16" fontWeight="800" className="tabular-nums">
                    {hoverPt.v}
                    <tspan fill="rgba(200,200,210,0.6)" fontSize="10" fontWeight="600"> visitas</tspan>
                  </text>
                </g>
              </g>
            )}

            {/* X labels sparse */}
            {pts.map((p, i) => {
              const step = Math.max(1, Math.ceil(count / 5));
              if (count > 1 && (i % step !== 0 && i !== count - 1)) return null;
              return (
                <text
                  key={`xl-${i}`}
                  x={p.x}
                  y={padT + plotH + 20}
                  fill="rgba(200,200,210,0.6)"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  className="tabular-nums"
                >
                  {p.day.slice(-5)}
                </text>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
