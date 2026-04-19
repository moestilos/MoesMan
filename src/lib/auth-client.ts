/**
 * Client-side auth helper. Solo se usa en browser (no en SSR).
 * Token en localStorage para simplicidad F2. Futuro: httpOnly cookie via API.
 */
const TOKEN_KEY = 'moesman:auth:token';
const USER_KEY = 'moesman:auth:user';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
}

export function updateUser(partial: Partial<AuthUser>) {
  const current = getUser();
  if (!current) return;
  const next = { ...current, ...partial };
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('moesman:auth-changed'));
}

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('moesman:auth-changed'));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent('moesman:auth-changed'));
}

export function isAuthed(): boolean {
  return !!getToken();
}
