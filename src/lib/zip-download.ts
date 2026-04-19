import JSZip from 'jszip';

export interface ChapterMeta {
  id: string;
  number: string | null;
  title: string | null;
}

export interface ZipProgress {
  phase: 'fetching-pages' | 'downloading' | 'zipping' | 'done' | 'error';
  current: number;
  total: number;
  message?: string;
}

type OnProgress = (p: ZipProgress) => void;

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 120) || 'untitled';
}

async function fetchPages(chapterId: string): Promise<string[]> {
  const res = await fetch(`/api/chapter/${chapterId}`);
  if (!res.ok) throw new Error(`No se pudo obtener capitulo (HTTP ${res.status})`);
  const body = await res.json();
  const pages: string[] = body?.data?.pages ?? [];
  if (pages.length === 0) throw new Error('Capitulo sin paginas');
  return pages;
}

function guessExt(url: string, mime: string | null): string {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('webp')) return 'webp';
  if (mime?.includes('jpeg')) return 'jpg';
  const m = url.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

async function addPagesToZip(
  zip: JSZip,
  folder: string,
  pages: string[],
  onProgress?: OnProgress,
  offset = 0,
  total = pages.length,
) {
  for (let i = 0; i < pages.length; i++) {
    const url = pages[i];
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pagina ${i + 1} fallo (HTTP ${res.status})`);
    const blob = await res.blob();
    const ext = guessExt(url, blob.type);
    const pad = String(i + 1).padStart(3, '0');
    zip.file(`${folder}/${pad}.${ext}`, blob);
    onProgress?.({
      phase: 'downloading',
      current: offset + i + 1,
      total,
    });
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function downloadChapterZip(
  mangaTitle: string,
  chapter: ChapterMeta,
  onProgress?: OnProgress,
) {
  try {
    onProgress?.({ phase: 'fetching-pages', current: 0, total: 0 });
    const pages = await fetchPages(chapter.id);
    onProgress?.({ phase: 'downloading', current: 0, total: pages.length });
    const zip = new JSZip();
    await addPagesToZip(zip, '.', pages, onProgress);
    onProgress?.({ phase: 'zipping', current: pages.length, total: pages.length });
    const blob = await zip.generateAsync({ type: 'blob' });
    const chapterPart = chapter.number ? `cap-${chapter.number}` : `cap-${chapter.id.slice(0, 6)}`;
    const titlePart = chapter.title ? `-${sanitize(chapter.title)}` : '';
    const name = `${sanitize(mangaTitle)}_${chapterPart}${titlePart}.zip`;
    triggerDownload(blob, name);
    onProgress?.({ phase: 'done', current: pages.length, total: pages.length });
  } catch (e) {
    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message: e instanceof Error ? e.message : 'error',
    });
    throw e;
  }
}

export async function downloadMangaZip(
  mangaTitle: string,
  chapters: ChapterMeta[],
  onProgress?: OnProgress,
) {
  try {
    // Calcular total páginas
    onProgress?.({ phase: 'fetching-pages', current: 0, total: chapters.length });
    const pagesPerChapter: Array<{ chapter: ChapterMeta; pages: string[] }> = [];
    for (let i = 0; i < chapters.length; i++) {
      const c = chapters[i];
      const pages = await fetchPages(c.id);
      pagesPerChapter.push({ chapter: c, pages });
      onProgress?.({
        phase: 'fetching-pages',
        current: i + 1,
        total: chapters.length,
        message: `Catalogando caps… ${i + 1}/${chapters.length}`,
      });
    }
    const totalPages = pagesPerChapter.reduce((s, x) => s + x.pages.length, 0);
    const zip = new JSZip();
    let offset = 0;
    for (const { chapter, pages } of pagesPerChapter) {
      const numPart = chapter.number ?? chapter.id.slice(0, 6);
      const titlePart = chapter.title ? ` - ${sanitize(chapter.title)}` : '';
      const folder = `${String(numPart).padStart(4, '0')}${titlePart}`.slice(0, 140);
      await addPagesToZip(zip, folder, pages, onProgress, offset, totalPages);
      offset += pages.length;
    }
    onProgress?.({ phase: 'zipping', current: totalPages, total: totalPages });
    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, `${sanitize(mangaTitle)}_completo.zip`);
    onProgress?.({ phase: 'done', current: totalPages, total: totalPages });
  } catch (e) {
    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message: e instanceof Error ? e.message : 'error',
    });
    throw e;
  }
}
