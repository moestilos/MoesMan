import { useEffect, useMemo, useRef, useState } from 'react';

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color?: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  centerLabel?: string;
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  className?: string;
  emptyText?: string;
}

const PALETTE = [
  'rgb(var(--brand-500))',
  'rgb(var(--accent-500))',
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#64748b', // slate
];

export default function DonutChart({
  title,
  subtitle,
  centerLabel = 'Total',
  segments,
  size = 220,
  stroke = 24,
  className = '',
  emptyText = 'Sin datos',
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const data = useMemo(() => {
    const filtered = segments.filter((s) => s.value > 0);
    const total = filtered.reduce((s, x) => s + x.value, 0);
    const withPct = filtered.map((s, i) => ({
      ...s,
      color: s.color ?? PALETTE[i % PALETTE.length],
      pct: total > 0 ? s.value / total : 0,
    }));
    return { items: withPct, total };
  }, [segments]);

  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Cumulative offsets in absolute units (circumference)
  let cum = 0;
  const rendered = data.items.map((s, i) => {
    const len = s.pct * C;
    const seg = {
      ...s,
      index: i,
      dash: `${len} ${C - len}`,
      offset: -cum,
    };
    cum += len;
    return seg;
  });

  const activeItem = hoverIdx !== null ? rendered[hoverIdx] : null;

  function onMove(e: React.MouseEvent) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className={`surface p-5 sm:p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-5">
          {subtitle && <span className="section-kicker">{subtitle}</span>}
          {title && (
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{title}</h3>
          )}
        </div>
      )}

      {data.total === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div
            className="rounded-full"
            style={{
              width: size * 0.7,
              height: size * 0.7,
              border: `${stroke * 0.7}px solid rgba(255,255,255,0.04)`,
            }}
          />
          <p className="text-sm text-fg-muted">{emptyText}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Chart (tilt 3D) */}
          <div
            className="relative flex-none"
            style={{
              width: size,
              height: size,
              perspective: '1200px',
            }}
            onMouseMove={onMove}
            onMouseLeave={() => {
              setHoverIdx(null);
              setTooltip(null);
            }}
          >
            {/* Floor glow ellipse (sombra proyectada debajo) */}
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{
                bottom: size * 0.05,
                width: size * 0.85,
                height: size * 0.18,
                background: `radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)`,
                filter: 'blur(8px)',
                transform: 'translateX(-50%) translateZ(-40px)',
              }}
            />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${size} ${size}`}
              width={size}
              height={size}
              className="-rotate-90 overflow-visible"
              style={{
                transform: 'rotateX(55deg) rotate(-90deg)',
                transformStyle: 'preserve-3d',
                filter: 'drop-shadow(0 18px 18px rgba(0,0,0,0.55))',
              }}
            >
              <defs>
                {rendered.map((s) => (
                  <linearGradient
                    key={`grad-${s.key}`}
                    id={`grad-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0.6" />
                  </linearGradient>
                ))}
                {rendered.map((s) => (
                  <linearGradient
                    key={`rim-${s.key}`}
                    id={`rim-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0.15" />
                  </linearGradient>
                ))}
                <filter id="donut-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Rim inferior (da grosor 3D, dibujado antes → debajo en Z) */}
              {rendered.map((s) => {
                const isActive = activeItem?.key === s.key;
                const isDimmed = activeItem !== null && !isActive;
                return (
                  <circle
                    key={`rim-${s.key}`}
                    cx={cx}
                    cy={cy + 8}
                    r={r}
                    fill="none"
                    stroke={`url(#rim-${s.key})`}
                    strokeWidth={stroke}
                    strokeDasharray={mounted ? s.dash : `0 ${C}`}
                    strokeDashoffset={s.offset}
                    style={{
                      transition:
                        'stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1), opacity 240ms ease',
                      opacity: isDimmed ? 0.2 : 0.85,
                    }}
                  />
                );
              })}
              {/* Track */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={stroke}
              />
              {/* Segments cara superior */}
              {rendered.map((s) => {
                const isActive = activeItem?.key === s.key;
                const isDimmed = activeItem !== null && !isActive;
                return (
                  <circle
                    key={s.key}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={`url(#grad-${s.key})`}
                    strokeWidth={isActive ? stroke + 4 : stroke}
                    strokeLinecap="butt"
                    strokeDasharray={mounted ? s.dash : `0 ${C}`}
                    strokeDashoffset={s.offset}
                    filter={isActive ? 'url(#donut-glow)' : undefined}
                    style={{
                      transition:
                        'stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1), stroke-width 240ms ease, opacity 240ms ease',
                      opacity: isDimmed ? 0.35 : 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoverIdx(s.index)}
                  />
                );
              })}
            </svg>

            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">
                {activeItem ? activeItem.label : centerLabel}
              </span>
              <span
                className="mt-1 font-display text-3xl font-black tabular-nums transition-colors"
                style={{ color: activeItem?.color ?? '#fafafa' }}
              >
                {(activeItem ? activeItem.value : data.total).toLocaleString('es-ES')}
              </span>
              {activeItem && (
                <span className="mt-0.5 text-xs font-semibold text-fg-muted tabular-nums">
                  {(activeItem.pct * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* Tooltip */}
            {activeItem && tooltip && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-bg-elevated px-2.5 py-1.5 ring-1 ring-border shadow-card-lg"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: activeItem.color }}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-fg">
                    {activeItem.label}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5 text-xs">
                  <span className="font-black tabular-nums text-fg">
                    {activeItem.value.toLocaleString('es-ES')}
                  </span>
                  <span className="text-fg-subtle">· {(activeItem.pct * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <ul className="flex-1 space-y-2.5 self-stretch">
            {rendered.map((s) => {
              const pct = (s.pct * 100).toFixed(1);
              const isActive = activeItem?.key === s.key;
              return (
                <li
                  key={s.key}
                  onMouseEnter={() => setHoverIdx(s.index)}
                  onMouseLeave={() => setHoverIdx(null)}
                  className={`group relative cursor-default rounded-lg px-3 py-2 transition-colors ${
                    isActive ? 'bg-bg-hover/60' : 'hover:bg-bg-hover/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-block h-2.5 w-2.5 flex-none rounded-full"
                      style={{
                        background: s.color,
                        boxShadow: isActive
                          ? `0 0 10px 0 ${s.color}, 0 0 0 3px rgba(255,255,255,0.04)`
                          : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                        transition: 'box-shadow 200ms ease',
                      }}
                    />
                    <span className="flex-1 truncate text-sm font-medium text-fg-muted group-hover:text-fg">
                      {s.label}
                    </span>
                    <span className="tabular-nums text-sm font-bold text-fg">
                      {s.value.toLocaleString('es-ES')}
                    </span>
                    <span className="w-12 text-right tabular-nums text-xs font-semibold text-fg-subtle">
                      {pct}%
                    </span>
                  </div>
                  {/* Progress bar micro */}
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full transition-[width] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        width: mounted ? `${pct}%` : '0%',
                        background: `linear-gradient(90deg, ${s.color}aa, ${s.color})`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
