/**
 * Categorías/géneros navegables. IDs de tag estáticos de MangaDex.
 */

export type Demographic = 'shounen' | 'shoujo' | 'seinen' | 'josei';

export interface Category {
  slug: string;
  label: string;
  tagIds?: string[];
  demographic?: Demographic;
  nsfwOnly?: boolean;
  ratingOverride?: Array<'safe' | 'suggestive' | 'erotica' | 'pornographic'>;
}

export const CATEGORIES: Category[] = [
  // --- Demografía ---
  { slug: 'shonen', label: 'Shōnen', demographic: 'shounen' },
  { slug: 'seinen', label: 'Seinen', demographic: 'seinen' },
  { slug: 'shojo', label: 'Shōjo', demographic: 'shoujo' },
  { slug: 'josei', label: 'Josei', demographic: 'josei' },

  // --- Géneros populares ---
  { slug: 'isekai', label: 'Isekai', tagIds: ['ace04997-f6bd-436e-b261-779182193d3d'] },
  { slug: 'accion', label: 'Acción', tagIds: ['391b0423-d847-456f-aff0-8b0cfc03066b'] },
  { slug: 'aventura', label: 'Aventura', tagIds: ['87cc87cd-a395-47af-b27a-93258283bbc6'] },
  { slug: 'romance', label: 'Romance', tagIds: ['423e2eae-a7a2-4a8b-ac03-a8351462d71d'] },
  { slug: 'comedia', label: 'Comedia', tagIds: ['4d32cc48-9f00-4cca-9b5a-a839f0764984'] },
  { slug: 'fantasia', label: 'Fantasía', tagIds: ['cdc58593-87dd-415e-bbc0-2ec27bf404cc'] },
  { slug: 'terror', label: 'Terror', tagIds: ['cdad7e68-1419-41dd-bdce-27753074a640'] },
  { slug: 'misterio', label: 'Misterio', tagIds: ['07251805-a27e-4d59-b488-f0bfbec15168'] },
  { slug: 'drama', label: 'Drama', tagIds: ['b9af3a63-f058-46de-a9a0-e0c13906197a'] },
  { slug: 'sci-fi', label: 'Sci-Fi', tagIds: ['256c8bd9-4904-4360-bf4f-508a76d67183'] },
  { slug: 'deportes', label: 'Deportes', tagIds: ['69964a64-2f90-4d33-beeb-f3ed2875eb4c'] },
  { slug: 'psicologico', label: 'Psicológico', tagIds: ['3b60b75c-a2d7-4860-ab56-05f391bb889c'] },
  { slug: 'sobrenatural', label: 'Sobrenatural', tagIds: ['eabc5b4c-6aff-42f3-b657-3e90cbd00b75'] },
  { slug: 'escolar', label: 'Escolar', tagIds: ['caaa44eb-cd40-4177-b930-79d3ef2afe87'] },
  { slug: 'magia', label: 'Magia', tagIds: ['a1f53773-c69a-4ce5-8cab-fffcd90b1565'] },
  { slug: 'mecha', label: 'Mecha', tagIds: ['50880a9d-5440-4732-9afb-8f457127e836'] },
  { slug: 'harem', label: 'Harem', tagIds: ['aafb99c1-7f60-43fa-b75f-fc9502ce29c7'] },
  { slug: 'slice-of-life', label: 'Slice of Life', tagIds: ['e5301a23-ebd9-49dd-a0cb-2add944c7fe9'] },

  // --- Adulto (requiere NSFW toggle) ---
  { slug: 'hentai', label: 'Hentai', nsfwOnly: true, ratingOverride: ['pornographic'] },
  { slug: 'ecchi', label: 'Ecchi', tagIds: ['9ab53f6b-1c80-4479-807c-0e6d73e8a1a5'] },
];

export function findCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function safeCategories(includeNsfw: boolean): Category[] {
  return CATEGORIES.filter((c) => includeNsfw || !c.nsfwOnly);
}
