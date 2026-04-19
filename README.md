# MoesMan

Biblioteca personal de manga en español. Lector web rápido, dark mode, diseño tipo Netflix/Crunchyroll.

Estado: **Fase 1 — UI + lector con MangaDex funcional**.

---

## Stack

- **Frontend:** Astro 5 + React islands + Tailwind CSS (SSR con adapter Node)
- **Backend integrado:** rutas API de Astro como proxy cacheado a MangaDex
- **Datos:** sistema de `providers` desacoplado (solo `mangadex` en F1)
- **Cache:** en memoria por proceso (TTL por endpoint)
- **Contenedor:** Docker + docker-compose

Fase 2 añadirá NestJS + PostgreSQL + Drizzle + JWT.

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

### Local (recomendado mientras desarrollas)

```bash
npm install
npm run dev
# abre http://localhost:4321
```

### Docker (producción)

```bash
docker compose up --build web
# http://localhost:4321
```

### Docker (desarrollo con hot reload)

```bash
docker compose --profile dev up --build web-dev
```

### Build producción local

```bash
npm run build
npm start
```

---

## API REST

Todas las respuestas devuelven `{ data }` o `{ error }`.

| Método | Ruta                               | Descripción                     |
| ------ | ---------------------------------- | ------------------------------- |
| GET    | `/api/search?q=QUERY`              | Búsqueda (ES por defecto)       |
| GET    | `/api/manga/:id`                   | Detalle del manga               |
| GET    | `/api/manga/:id/chapters`          | Capítulos ES del manga          |
| GET    | `/api/chapter/:id`                 | URLs de páginas del capítulo    |

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

- **Fase 2** — NestJS + PostgreSQL + Drizzle + JWT. Biblioteca personal persistida, progreso sincronizado, favoritos, historial.
- **Fase 3** — PWA + Service Worker + descarga offline + caché de imágenes.
- **Futuro** — Nuevos providers (scraping con fallback), recomendaciones, notificaciones de nuevos capítulos.

---

## Notas legales

MoesMan consume **solo la API pública de MangaDex** (agregador legal operado por scanlators). No incluye scraping de sitios piratas. El sistema de providers está diseñado para añadir fuentes adicionales en el futuro respetando sus términos.
