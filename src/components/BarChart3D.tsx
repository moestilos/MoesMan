import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  data: Array<[string, number]>; // [day, count]
  height?: number;
  className?: string;
  title?: string;
  subtitle?: string;
}

// Isometric 3D bars rendered with SVG polygons (front + top + right side).
// Perspective simulado con ejes isométricos. Sin deps externas.
export default function BarChart3D({
  data,
  height = 260,
  className = '',
  title,
  subtitle,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const max = useMemo(() => Math.max(1, ...data.map(([, v]) => v)), [data]);
  const count = data.length;

  // Layout
  const depth = 14; // desplazamiento isométrico diagonal
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const W = 900; // viewBox width (scalable)
  const H = height;
  const plotW = W - padLeft - padRight - depth;
  const plotH = H - padTop - padBottom - depth;
  const barGap = 3;
  const barW = Math.max(6, plotW / Math.max(1, count) - barGap);

  // Y axis ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((max * i) / ticks));

  return (
    <section className={`surface p-5 sm:p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {subtitle && <span className="section-kicker">{subtitle}</span>}
          {title && <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{title}</h3>}
        </div>
      )}

      {count === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">Sin datos.</p>
      ) : (
        <div
          ref={containerRef}
          className="relative w-full"
          style={{ aspectRatio: `${W}/${H}` }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <defs>
              <linearGradient id="bar3d-front" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--brand-300))" stopOpacity="1" />
                <stop offset="55%" stopColor="rgb(var(--brand-500))" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(var(--brand-700))" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="bar3d-front-hover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--brand-200))" stopOpacity="1" />
                <stop offset="55%" stopColor="rgb(var(--brand-400))" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(var(--brand-600))" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="bar3d-top" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(var(--brand-200))" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(var(--brand-400))" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="bar3d-side" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--brand-600))" stopOpacity="1" />
                <stop offset="100%" stopColor="rgb(var(--brand-900))" stopOpacity="1" />
              </linearGradient>
              <filter id="bar3d-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid Y lines (back plane) */}
            {tickVals.map((v, i) => {
              const y = padTop + plotH - (v / max) * plotH;
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1={padLeft + depth}
                    y1={y}
                    x2={padLeft + depth + plotW}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  <line
                    x1={padLeft}
                    y1={y + depth}
                    x2={padLeft + depth}
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + depth + 3}
                    fill="rgba(200,200,210,0.55)"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="end"
                    className="tabular-nums"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Floor (base plane, isometric parallelogram) */}
            <path
              d={`M ${padLeft} ${padTop + plotH + depth} L ${padLeft + plotW} ${padTop + plotH + depth} L ${padLeft + plotW + depth} ${padTop + plotH} L ${padLeft + depth} ${padTop + plotH} Z`}
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />

            {/* Bars */}
            {data.map(([day, count], i) => {
              const x0 = padLeft + depth + i * (barW + barGap);
              const targetH = (count / max) * plotH;
              const h = mounted ? targetH : 0;
              const y0 = padTop + plotH - h;
              const isHover = hoverIdx === i;
              const isDim = hoverIdx !== null && !isHover;

              // Front face
              const frontPts = `${x0},${y0} ${x0 + barW},${y0} ${x0 + barW},${y0 + h} ${x0},${y0 + h}`;
              // Top face (parallelogram)
              const topPts = `${x0},${y0} ${x0 + barW},${y0} ${x0 + barW - depth},${y0 - depth} ${x0 - depth},${y0 - depth}`;
              // Right side face
              const sidePts = `${x0 + barW},${y0} ${x0 + barW - depth},${y0 - depth} ${x0 + barW - depth},${y0 + h - depth} ${x0 + barW},${y0 + h}`;

              const label = day.slice(-5); // MM-DD

              return (
                <g
                  key={day}
                  style={{
                    opacity: isDim ? 0.4 : 1,
                    transition: 'opacity 200ms ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  {/* Clickable invisible rect (full height for easy hover) */}
                  <rect
                    x={x0 - 2}
                    y={padTop - depth}
                    width={barW + 4}
                    height={plotH + depth}
                    fill="transparent"
                  />
                  {/* Side */}
                  <polygon
                    points={sidePts}
                    fill="url(#bar3d-side)"
                    style={{
                      transition: 'all 900ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                  {/* Front */}
                  <polygon
                    points={frontPts}
                    fill={isHover ? 'url(#bar3d-front-hover)' : 'url(#bar3d-front)'}
                    filter={isHover ? 'url(#bar3d-glow)' : undefined}
                    style={{
                      transition: 'all 900ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                  {/* Top */}
                  <polygon
                    points={topPts}
                    fill="url(#bar3d-top)"
                    style={{
                      transition: 'all 900ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                  {/* Value label on hover */}
                  {isHover && (
                    <g>
                      <rect
                        x={x0 - 18}
                        y={y0 - depth - 28}
                        width={barW + 36}
                        height="20"
                        rx="4"
                        fill="rgba(14,14,18,0.96)"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth="1"
                      />
                      <text
                        x={x0 + barW / 2 - depth / 2}
                        y={y0 - depth - 14}
                        fill="#fff"
                        fontSize="11"
                        fontWeight="700"
                        textAnchor="middle"
                        className="tabular-nums"
                      >
                        {count}
                      </text>
                    </g>
                  )}
                  {/* X label (sparse: every ~5) */}
                  {(count > 0 && (i % Math.max(1, Math.ceil(data.length / 8)) === 0 || i === data.length - 1)) && (
                    <text
                      x={x0 + barW / 2}
                      y={padTop + plotH + depth + 16}
                      fill="rgba(200,200,210,0.6)"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      className="tabular-nums"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
