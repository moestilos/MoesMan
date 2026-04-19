# CLAUDE.md — Ako (antes MoesMan)

Instrucciones para Claude Code en futuras sesiones sobre este proyecto. **Léelo siempre antes de tocar código.**

---

## 🎯 Qué es Ako

Biblioteca personal de manga/manhwa/manhua en español. Portfolio piece del usuario **moestilos** (Guillermo Mateos, `gmateosoficial@gmail.com` = **admin único**).

Repo: https://github.com/moestilos/MoesMan · rama `main`
Path local: `C:\Users\gmate\Desktop\MoesMan\`

---

## 🧱 Stack (locked — no sugerir cambios)

- **Frontend**: Astro 5 SSR (`@astrojs/node` standalone) + React islands + Tailwind CSS 3
- **Backend embebido**: Astro API routes, JSON file DB (`data/moesman.json`), bcryptjs, `jose` JWT HS256
- **Backend alternativo** (existe pero no usado en dev): NestJS 10 + Postgres + Drizzle en carpeta `api/` — NO lo toques salvo petición explícita
- **Datos manga**: MangaDex API pública + ComicK API pública
- **Docker**: `docker-compose.yml` para prod — dev se usa `npm run dev` directo
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) — 3 jobs: build web, build api, smoke postgres+register

---

## 📁 Estructura clave

```
src/
  components/           # Islands React + Astro
    Header.astro        # Pill flotante top-4 (floating nav)
    Logo.astro          # SVG eagle inline (gradient brand CSS vars)
    BgStarfield.astro   # Canvas 2D + constelaciones (NO BgAurora, está deprecated)
    MangaCard.astro     # Card con badge TIPO (Manga/Manhwa/Manhua)
    HeroCarousel.tsx    # Rail con description + constelaciones
    GenreTabs.astro     # Multi-select categorías (flex-wrap, ?genres=a,b,c)
    ThemePicker.tsx     # 7 temas CSS vars
    AdminDashboard.tsx  # + AdminMangaList + AdminMangaDetail + DonutChart
    TranslatableDesc.tsx# MyMemory API fallback EN→ES
    Reader.tsx          # Lector client:load (vertical + paginado)
  lib/
    providers/
      types.ts          # MangaSummary, MangaDetail, BrowseParams, ChaptersParams
      mangadex.ts       # MangaDexProvider
      comick.ts         # ComickProvider (api.comick.fun)
      categories.ts     # CATEGORIES con slug/tagIds/demographic/originalLanguage/languageOverride/ratingOverride
      tag-names.ts      # Mapa EN→ES para tags MangaDex
      index.ts          # Registry + helpers: dedupeMangas, mergeChaptersAcrossProviders
    theme.ts            # THEMES (7), applyTheme, readThemeCookie
    prefs.ts            # NSFW localStorage + cookie
    ssr-prefs.ts        # readNsfwCookie, contentRatingsFor
    api.ts              # Cliente tipado para /api/* (auth, library, progress, favorites, avatar, profile)
    auth-client.ts      # getToken, getUser, setAuth, clearAuth, updateUser
    zip-download.ts     # JSZip client-side para descarga chapter/manga
    cache.ts            # In-memory TTL cache (server)
  server/
    db.ts               # JSON file DB abstraido (DbUser, DbLibraryEntry, DbFavorite, DbProgress, DbVisit)
    auth.ts             # register/login/jwt/bcrypt
    admin.ts            # isAdmin(user), extractIp(req), ADMIN_EMAIL
  pages/
    index.astro         # Home (hero carousel + rails)
    search.astro        # Multi-select categorías + SSR grid
    manga/[id].astro    # Detalle
    read/[chapterId].astro  # Reader fullbleed
    hentai.astro        # NSFW-gated, language override EN+ES
    admin.astro         # Solo admin email
    profile.astro       # Editar usuario
    api/                # Endpoints (auth, library, progress, favorites, track, img, admin/*)
public/
  icon.svg              # Eagle logo — gradient fijo (no CSS vars, external resource)
  manifest.webmanifest
  sw.js                 # Service Worker vanilla
  offline.html
data/
  moesman.json          # DB (gitignored)
```

---

## 🎨 Design system

### Tokens (en `src/styles/global.css` + `tailwind.config.mjs`)

**Colores** (CSS vars — responden al tema activo):
- `bg.sunken/DEFAULT/raised/elevated/card/hover`
- `border` (rgba 0.06), `border-strong` (rgba 0.12), `border-hover` (rgba 0.18)
- `fg.DEFAULT/muted/subtle/faint`
- `brand.50-950` via `rgb(var(--brand-X) / <alpha>)` — **responde al tema ThemePicker**
- `accent.400-600` (violet)

**Motion tokens**:
- `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`
- `--dur-fast: 140ms` · `--dur-base: 220ms` · `--dur-slow: 420ms`

**Tipografía**:
- `font-sans` / `font-display` / `font-brand` = **Zen Kaku Gothic New** (japanese-friendly)
- **NO usar Caveat, Shippori Mincho, Inter** — probadas y rechazadas por el usuario

**Clases component**:
- `.btn` (44px mobile / 40px sm+), `.btn-primary/-secondary/-ghost/-icon`
- `.input` (44px mobile / 40px sm+, font-size 16px mobile para evitar zoom iOS)
- `.surface`, `.card`, `.skeleton`, `.section-kicker`, `.section-title`
- `.genre-pill`, `.hero-island`, `.nav-pill` (en Header)

### Temas (7 presets en `src/lib/theme.ts`)

`sakura` (default rose) · `tsuki` (violet) · `sora` (sky) · `mori` (emerald) · `hi` (amber) · `yami` (crimson) · `neo` (cyan)

Cookie `moesman_theme=X` leída SSR → `<html data-theme="X">`. JS cliente sync a localStorage.

---

## 🔌 Providers (extensible)

Cualquier fuente implementa interface `MangaProvider`:
```ts
interface MangaProvider {
  id, name, preferredLanguages;
  search(params): MangaSummary[];
  popular(params?): MangaSummary[];
  latest(params?): MangaSummary[];
  browse(params): MangaSummary[];
  getManga(id): MangaDetail;
  listChapters(params): Chapter[];
  getChapterPages(chapterId): ChapterPages;
}
```

Actualmente: **MangaDex** (principal) + **ComicK** (secundario). Registry en `src/lib/providers/index.ts`.

**URLs de imágenes pasan por `/api/img?u=...`** — proxy same-origin que evita bloqueos adblock. SIEMPRE usar `proxy()` helper al mapear covers/pages.

### Categorías (`categories.ts`)

Tipos de categorías:
- `tagIds: string[]` — tags MangaDex (Isekai, Acción, etc.)
- `demographic: 'shounen' | 'shoujo' | 'seinen' | 'josei'`
- `originalLanguage: string[]` — Manhwa (ko), Manhua (zh/zh-hk)
- `languageOverride: string[]` — Hentai usa `['es','es-la','en']` porque el porn rara vez tiene ES
- `ratingOverride: ContentRating[]` — Hentai usa `['pornographic']`
- `nsfwOnly: boolean` — filtra si no está activo NSFW toggle

Multi-select combinado: tags se unen AND, resto "primera que la tenga gana".

---

## 🔐 Auth embebido

- POST `/api/auth/register` → bcrypt + JWT HS256
- POST `/api/auth/login`
- GET `/api/auth/me` (Bearer)
- PATCH `/api/auth/profile` (requires currentPassword para cambios críticos)
- POST `/api/auth/avatar` (data URL ≤1MB, JPEG center-crop 256×256)

Cliente: `api.*` helpers en `src/lib/api.ts`. Token localStorage key `moesman:auth:token`.

---

## 👑 Admin

**Único admin**: email `gmateosoficial@gmail.com` (constante `ADMIN_EMAIL` en `server/admin.ts`).

Endpoints admin-only:
- `GET /api/admin/stats` — totales + last30Days + topPaths + byDevice + byBrowser
- `GET /api/admin/mangas?q=&sort=&limit=` — lista con stats (library/favorites/readers/progressCount)
- `GET /api/admin/manga/:providerId/:mangaId` — detalle con biblioteca/readers/chapters

Páginas: `/admin` (AdminDashboard component). Include DonutChart SVG puro (no chart lib).

---

## 📊 Tracking visitas

- `POST /api/track { path }` — dedup (IP + día) en `db.visits`
- Inline script en Base.astro — 1 POST por día por session (localStorage bucket)
- IP extraído de `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`

---

## 🎨 UI patterns

- **MangaCard** tiene **badge TIPO** (Manga/Manhwa/Manhua) via `originalLanguage` + badge 18+/16+ via `contentRating`
- **Rails** usan width viewport-relative: `w-[46vw] max-w-[220px] sm:w-[200px]` (2 cards visibles móvil)
- **Hero carousel** con aspect `4/3 → 16/9 → 21/8` responsive + description truncada 360 chars
- **GenreTabs**: flex-wrap, no horizontal scroll, multi-select via `?genres=a,b,c`
- **Header**: floating pill `top-4` fixed, `h-20` spacer debajo

---

## 🌍 i18n

- Títulos: `pickBestTitle` en `mangadex.ts` filtra CJK, prefiere `es/es-la/en/ja-ro/ko-ro/zh-ro`
- Tags: map EN→ES manual en `tag-names.ts` con `translateTag(name)`
- Descripciones: `TranslatableDesc` component con MyMemory API (free tier) + cache localStorage

---

## 🚫 Reglas estrictas

1. **NO scraping de sitios piratas** (nhentai, MangaPlus, ManwhaWeb, TuMangaOnline, InManga piracy). Usuario ha aceptado el razonamiento. Sólo APIs legales (MangaDex, ComicK).
2. **NO añadir deps nuevas sin confirmar** — usuario prefiere minimal. Actuales: astro, react, tailwind, bcryptjs, jose, jszip, drizzle (en `api/` backend NestJS alternativo)
3. **NO cambiar tipografía** — Zen Kaku Gothic New es la definitiva. Rechazado antes: Caveat (cursive), Shippori Mincho (serif), Inter (western)
4. **NO añadir emojis en la UI** — usar SVG icons siempre. Usuario rechaza emoticons
5. **NO romper localStorage keys** `moesman:*` — existen datos de usuario. La UI se llama "Ako" pero las keys internas siguen con prefijo `moesman:`
6. **NO tocar `/api` NestJS** salvo petición explícita — es stack alternativo, el dev usa backend embebido Astro
7. **Commits**: conventional, español, atómicos. Mantener estilo "feat: / fix: / refactor: / polish:"
8. **Cambio de deps o balance/numbers** → confirmar antes si es posible

---

## ✅ Workflow

1. Usuario conversa en ES, código en EN
2. Respuestas directas — usuario está en CAVEMAN MODE (fragmentos OK, drop articles/filler)
3. Build: `npm run build` (verificar antes de commit)
4. Commit + push a main → CI corre (no hay branch protection)
5. Tareas largas → TodoWrite para tracking visible

---

## 🧩 Scripts npm importantes

```bash
npm run dev       # Astro dev server (localhost:4321)
npm run build     # Build prod (verificar siempre antes de commit)
npm run preview   # Preview del build
docker compose up # Full stack (web + NestJS + Postgres)
```

---

## 🐛 Problemas conocidos / decisiones tomadas

- **Imágenes MangaDex bloqueadas por adblock** → siempre vía `/api/img?u=...` proxy
- **iOS zoom al focus input** → `font-size: 16px` mínimo en `.input` (aplicado)
- **Service Worker stale en dev** → Base.astro desregistra SW y limpia caches en `!PROD`
- **Hero carousel buttons sin estilo** → `.btn-primary` etc requieren `@apply btn;` (ya aplicado en global.css)
- **MyMemory rate limit** → cache localStorage por hash de texto
- **MangaDex tag mode** → usar `includedTagsMode=AND` para categoría strict
- **Pornographic rare en ES** → `languageOverride: ['es','es-la','en']` en hentai category

---

## 📝 Si el usuario pide algo nuevo

1. **Leer este archivo primero**
2. **Verificar** si encaja con restricciones (scraping, deps, fonts, emojis)
3. **Usar TodoWrite** si son ≥3 pasos
4. **Confirmar antes** de cambios destructivos, deps nuevas, o cambios a datos persistidos
5. **Commit atómico** con conventional message en español
6. **Build antes de commit** siempre
