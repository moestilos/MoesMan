# MoesMan

Biblioteca personal de manga en español. Lector web rápido, dark mode, diseño tipo Netflix/Crunchyroll.

Estado: **Fase 2 — backend NestJS + Postgres + Drizzle + JWT, biblioteca y progreso persistidos**.

---

## Stack

- **Frontend (web):** Astro 5 + React islands + Tailwind CSS (SSR con adapter Node)
- **Proxy MangaDex:** rutas API de Astro cacheadas
- **Providers:** sistema desacoplado (`mangadex` activo, scraping pendiente)
- **Backend (api):** NestJS 10 + Passport JWT + class-validator
- **DB:** PostgreSQL 16 + Drizzle ORM (migraciones versionadas en `api/drizzle/`)
- **Auth:** JWT firmado en `/auth/login` y `/auth/register`, `Bearer` en `Authorization`
- **Contenedor:** Docker Compose orquesta `db` + `api` + `web`

Fase 3 añadirá PWA + descarga offline + caché de imágenes.

---

## Arquitectura

```
src/
├── layouts/Base.astro           Layout global (dark, header sticky, footer)
├── components/
│   ├── Header.astro             Navegación + búsqueda global
│   ├── MangaCard.astro          Card de portada estilo Netflix
│   ├── MangaGrid.astro          Grid responsive
│   ├── GridSkeleton.astro       Skeleton loader
│   └── Reader.tsx               Lector React (vertical + paginado)
├── lib/
│   ├── cache.ts                 Cache in-memory con TTL
│   └── providers/
│       ├── types.ts             Interfaz MangaProvider + tipos comunes
│       ├── mangadex.ts          Implementación MangaDex API
│       └── index.ts             Registro de providers
├── pages/
│   ├── index.astro              Home (hero + populares + trending)
│   ├── search.astro             Resultados de búsqueda
│   ├── manga/[id].astro         Detalle + lista de capítulos
│   ├── read/[chapterId].astro   Lector fullscreen
│   └── api/                     Endpoints REST (JSON)
│       ├── search.ts
│       ├── manga/[id].ts
│       ├── manga/[id]/chapters.ts
│       └── chapter/[id].ts
└── styles/global.css            Tailwind + tokens de diseño
```

### Providers

Cualquier fuente (API, scraping, etc.) implementa `MangaProvider`:

```ts
interface MangaProvider {
  id: string;
  name: string;
  preferredLanguages: Language[];
  search(params): Promise<MangaSummary[]>;
  getManga(id): Promise<MangaDetail>;
  listChapters(params): Promise<Chapter[]>;
  getChapterPages(chapterId): Promise<ChapterPages>;
}
```

Registrar una nueva fuente = añadir `register(new MiProvider())` en `src/lib/providers/index.ts`. El resto de la app no cambia.

### Idioma

Prioridad: `es` → `es-la` → fallback.

- `search` filtra por `availableTranslatedLanguage`.
- `listChapters` filtra por `translatedLanguage`.

---

## Ejecutar

### Stack completo (Docker — recomendado)

```bash
docker compose up --build
# web  → http://localhost:4321
# api  → http://localhost:3000/api
# db   → localhost:5432  (postgres://moesman:moesman@localhost/moesman)
```

Las migraciones se aplican solas en el contenedor `api` en el primer arranque.

### Desarrollo con hot reload (Docker)

```bash
docker compose --profile dev up --build web-dev api-dev db
```

### Local sin Docker (solo web, Fase 1)

```bash
npm install
npm run dev            # http://localhost:4321
```

### Local API (requiere Postgres corriendo)

```bash
cd api
cp .env.example .env   # edita JWT_SECRET
npm install
npm run db:push        # crea el schema
npm run start:dev      # http://localhost:3000/api
```

---

## API REST

### Web — proxy MangaDex (`http://localhost:4321/api/*`)

Responden `{ data }` o `{ error }`.

| Método | Ruta                               | Descripción                     |
| ------ | ---------------------------------- | ------------------------------- |
| GET    | `/api/search?q=QUERY`              | Búsqueda (ES por defecto)       |
| GET    | `/api/manga/:id`                   | Detalle del manga               |
| GET    | `/api/manga/:id/chapters`          | Capítulos ES del manga          |
| GET    | `/api/chapter/:id`                 | URLs de páginas del capítulo    |

### Backend NestJS (`http://localhost:3000/api/*`)

Auth con `Authorization: Bearer <token>` salvo `/auth/register` y `/auth/login`.

| Método | Ruta                                         | Descripción                          |
| ------ | -------------------------------------------- | ------------------------------------ |
| POST   | `/auth/register`                             | `{ email, username, password }`      |
| POST   | `/auth/login`                                | `{ email, password }`                |
| GET    | `/auth/me`                                   | Usuario actual                       |
| GET    | `/library`                                   | Biblioteca del usuario               |
| POST   | `/library`                                   | Añadir/actualizar entrada            |
| GET    | `/library/:providerId/:mangaId`              | `{ has: boolean }`                   |
| DELETE | `/library/:providerId/:mangaId`              | Quitar de biblioteca                 |
| GET    | `/favorites`                                 | Lista de favoritos                   |
| POST   | `/favorites/:providerId/:mangaId/toggle`     | Alternar favorito                    |
| POST   | `/progress`                                  | Upsert de progreso (por capítulo)    |
| GET    | `/progress/:providerId/:mangaId`             | Progreso de todos los capítulos      |
| GET    | `/progress/history?limit=30`                 | Historial reciente                   |

---

## Lector

- Modo **vertical** (scroll continuo, webtoon-like) y **paginado** (click izq/der).
- Lazy loading por defecto, primeras 2 páginas eager.
- Progreso guardado en `localStorage`:
  - `moesman:progress:{mangaId}:{chapterId}` — índice de página
  - `moesman:lastRead:{mangaId}` — último capítulo leído
  - `moesman:readerMode` — modo preferido
- Atajos: `← / →` página, `v` cambiar modo, `espacio` avanzar.

---

## Roadmap

- **Fase 1 ✓** — Astro + Tailwind + MangaDex + lector.
- **Fase 2 ✓** — NestJS + PostgreSQL + Drizzle + JWT. Biblioteca, favoritos, progreso e historial sincronizados.
- **Fase 3** — PWA + Service Worker + descarga offline + caché de imágenes.
- **Futuro** — Nuevos providers (scraping con fallback), recomendaciones, notificaciones de nuevos capítulos.

---

## Notas legales

MoesMan consume **solo la API pública de MangaDex** (agregador legal operado por scanlators). No incluye scraping de sitios piratas. El sistema de providers está diseñado para añadir fuentes adicionales en el futuro respetando sus términos.
