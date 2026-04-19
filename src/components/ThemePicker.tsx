import { useEffect, useState } from 'react';
import { THEMES, applyTheme, getSavedTheme, DEFAULT_THEME_ID } from '@/lib/theme';

export default function ThemePicker() {
  const [active, setActive] = useState<string>(DEFAULT_THEME_ID);

  useEffect(() => {
    setActive(getSavedTheme());
    const on = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (ce.detail) setActive(ce.detail);
    };
    window.addEventListener('moesman:theme-changed', on);
    return () => window.removeEventListener('moesman:theme-changed', on);
  }, []);

  function pick(id: string) {
    applyTheme(id);
    setActive(id);
  }

  return (
    <div className="px-1 py-1">
      <div className="grid grid-cols-4 gap-1.5">
        {THEMES.map((t) => {
          const [c1, c2, c3] = t.swatch;
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              aria-label={`Tema ${t.label}`}
              title={`${t.label} · ${t.subtitle}`}
              className={`group relative flex aspect-square items-center justify-center rounded-lg transition-all duration-200 outline-none ${
                selected
                  ? 'ring-2 ring-offset-2 ring-offset-bg-card scale-[1.03]'
                  : 'ring-1 ring-border hover:scale-[1.05]'
              }`}
              style={
                selected
                  ? ({ '--tw-ring-color': c2 } as React.CSSProperties)
                  : undefined
              }
            >
              <span
                className="h-full w-full rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`,
                  boxShadow: selected
                    ? `0 0 20px -2px ${c2}aa, inset 0 1px 0 0 rgba(255,255,255,0.2)`
                    : 'inset 0 1px 0 0 rgba(255,255,255,0.15)',
                }}
              />
              {selected && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 px-2 text-[10px] font-medium text-fg-subtle">
        {THEMES.find((t) => t.id === active)?.label}
        <span className="opacity-60"> · {THEMES.find((t) => t.id === active)?.subtitle}</span>
      </div>
    </div>
  );
}
