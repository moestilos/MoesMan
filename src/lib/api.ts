// Backend embebido: mismas rutas same-origin (/api/*). Sin CORS.
// Override con PUBLIC_API_BASE si usas NestJS externo.
const API_BASE = import.meta.env.PUBLIC_API_BASE ?? '/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LibraryEntry {
  id: string;
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
  addedAt: string;
}

export interface ProgressRow {
  id: string;
  providerId: string;
  mangaId: string;
  chapterId: string;
  chapterNumber: string | null;
  page: number;
  totalPages: number | null;
  updatedAt: string;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || res.statusText;
    throw new ApiError(Array.isArray(msg) ? msg.join(', ') : String(msg), res.status);
  }
  return body as T;
}

export const api = {
  base: API_BASE,

  register(email: string, username: string, password: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  },
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me(token: string) {
    return request<{ user: AuthUser }>('/auth/me', { token });
  },

  library: {
    list: (token: string) => request<LibraryEntry[]>('/library', { token }),
    add: (
      token: string,
      input: { providerId: string; mangaId: string; title: string; coverUrl?: string | null },
    ) =>
      request<LibraryEntry>('/library', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    has: (token: string, providerId: string, mangaId: string) =>
      request<{ has: boolean }>(`/library/${providerId}/${mangaId}`, { token }),
    remove: (token: string, providerId: string, mangaId: string) =>
      request<{ removed: number }>(`/library/${providerId}/${mangaId}`, {
        method: 'DELETE',
        token,
      }),
  },

  progress: {
    upsert: (
      token: string,
      input: {
        providerId: string;
        mangaId: string;
        chapterId: string;
        chapterNumber?: string | null;
        page: number;
        totalPages?: number;
      },
    ) =>
      request<ProgressRow>('/progress', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    forManga: (token: string, providerId: string, mangaId: string) =>
      request<ProgressRow[]>(`/progress/${providerId}/${mangaId}`, { token }),
    history: (token: string, limit = 30) =>
      request<ProgressRow[]>(`/progress/history?limit=${limit}`, { token }),
  },

  favorites: {
    list: (token: string) =>
      request<Array<{ id: string; providerId: string; mangaId: string; addedAt: string }>>(
        '/favorites',
        { token },
      ),
    toggle: (token: string, providerId: string, mangaId: string) =>
      request<{ favorite: boolean }>(`/favorites/${providerId}/${mangaId}/toggle`, {
        method: 'POST',
        token,
      }),
  },
};

export { ApiError };
