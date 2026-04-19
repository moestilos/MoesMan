/**
 * Sistema de temas. Tokens CSS en global.css bajo [data-theme="..."].
 */

export interface Theme {
  id: string;
  label: string;
  subtitle: string;
  swatch: [string, string, string]; // [400, 500, 700] hex para preview
}

export const THEMES: Theme[] = [
  { id: 'sakura', label: 'Sakura', subtitle: 'Rosa cerezo', swatch: ['#ff6a8e', '#f5356a', '#ba0e44'] },
  { id: 'tsuki',  label: 'Tsuki',  subtitle: 'Violeta luna', swatch: ['#a78bfa', '#8b5cf6', '#6d28d9'] },
  { id: 'sora',   label: 'Sora',   subtitle: 'Azul cielo',   swatch: ['#38bdf8', '#0ea5e9', '#0369a1'] },
  { id: 'mori',   label: 'Mori',   subtitle: 'Verde bosque', swatch: ['#34d399', '#10b981', '#047857'] },
  { id: 'hi',     label: 'Hi',     subtitle: 'Ámbar fuego',  swatch: ['#fbbf24', '#f59e0b', '#b45309'] },
  { id: 'yami',   label: 'Yami',   subtitle: 'Carmesí noche', swatch: ['#f87171', '#ef4444', '#b91c1c'] },
  { id: 'neo',    label: 'Neo',    subtitle: 'Neo-Tokyo',    swatch: ['#22d3ee', '#06b6d4', '#0e7490'] },
];

export const DEFAULT_THEME_ID = 'sakura';
const STORAGE_KEY = 'moesman:theme';
const COOKIE_NAME = 'moesman_theme';

export function isValidTheme(id: string): boolean {
  return THEMES.some((t) => t.id === id);
}

export function getSavedTheme(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME_ID;
  const v = localStorage.getItem(STORAGE_KEY);
  return v && isValidTheme(v) ? v : DEFAULT_THEME_ID;
}

export function applyTheme(id: string) {
  if (!isValidTheme(id)) id = DEFAULT_THEME_ID;
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem(STORAGE_KEY, id);
  // Cookie para que SSR aplique el tema sin flash
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent('moesman:theme-changed', { detail: id }));
}

export function readThemeCookie(cookieHeader: string | null | undefined): string {
  if (!cookieHeader) return DEFAULT_THEME_ID;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const v = m?.[1];
  return v && isValidTheme(v) ? v : DEFAULT_THEME_ID;
}
