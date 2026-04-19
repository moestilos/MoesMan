/**
 * Preferencias del usuario (localStorage). Client-only.
 */
const NSFW_KEY = 'moesman:nsfw';
const NSFW_CONFIRMED_KEY = 'moesman:nsfw:confirmed';

export function isNsfwEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(NSFW_KEY) === '1';
}

export function setNsfwEnabled(v: boolean) {
  localStorage.setItem(NSFW_KEY, v ? '1' : '0');
  window.dispatchEvent(new CustomEvent('moesman:prefs-changed'));
}

export function isNsfwConfirmed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(NSFW_CONFIRMED_KEY) === '1';
}

export function confirmNsfw() {
  localStorage.setItem(NSFW_CONFIRMED_KEY, '1');
}

/**
 * Las preferencias se envían al servidor vía cookie (lectura en SSR).
 * Escritura simultánea en localStorage + cookie.
 */
export function syncNsfwCookie() {
  if (typeof document === 'undefined') return;
  const v = isNsfwEnabled() ? '1' : '0';
  document.cookie = `moesman_nsfw=${v}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
