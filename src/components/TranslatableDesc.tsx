import { useEffect, useMemo, useState } from 'react';

interface Props {
  text: string;
  /** Idioma detectado de origen, si se conoce */
  sourceLang?: string;
  /** Auto-translate si detecta no-ES */
  autoTranslate?: boolean;
}

const CACHE_PREFIX = 'moesman:translate:';

// Heurística: si tiene palabras ES comunes + caracteres mayormente ASCII, asumir ES
const ES_WORDS = /\b(el|la|los|las|de|que|en|con|por|para|su|un|una|y|no|es|se|ha|muy|más|pero|este|esta|como|sino|cuando|donde|quien)\b/gi;

function looksSpanish(text: string): boolean {
  const sample = text.slice(0, 600);
  const esMatches = sample.match(ES_WORDS)?.length ?? 0;
  return esMatches >= 4;
}

function detectLang(text: string): 'es' | 'en' | 'other' {
  if (looksSpanish(text)) return 'es';
  // Heurística EN: words
  const enMatches = text.slice(0, 600).match(/\b(the|and|of|to|a|in|is|it|you|that|he|was|for|on|are|with|as|his|they)\b/gi)?.length ?? 0;
  if (enMatches >= 4) return 'en';
  return 'other';
}

async function translateViaMyMemory(text: string, from: string, to: string): Promise<string> {
  // MyMemory free tier ~5000 char/request. Partimos si hace falta.
  const MAX = 500;
  if (text.length <= MAX) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Traductor no disponible');
    const body = await res.json();
    return body?.responseData?.translatedText ?? text;
  }
  // Chunked
  const sentences = text.split(/(?<=[\.\!\?])\s+/);
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > MAX) {
      if (cur) chunks.push(cur);
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) chunks.push(cur);
  const translated = await Promise.all(
    chunks.map(async (c) => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(c)}&langpair=${from}|${to}`;
      const res = await fetch(url);
      if (!res.ok) return c;
      const body = await res.json();
      return body?.responseData?.translatedText ?? c;
    }),
  );
  return translated.join(' ');
}

export default function TranslatableDesc({ text, sourceLang, autoTranslate = false }: Props) {
  const detected = useMemo(() => detectLang(text), [text]);
  const isSpanish = detected === 'es';
  const from = sourceLang === 'en' || detected === 'en' ? 'en' : detected === 'es' ? 'es' : 'en';

  const cacheKey = useMemo(
    () => CACHE_PREFIX + btoa(unescape(encodeURIComponent(text.slice(0, 80)))) + ':' + from,
    [text, from],
  );

  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (isSpanish) return;
    // Ver si cacheado
    try {
      const hit = localStorage.getItem(cacheKey);
      if (hit) {
        setTranslated(hit);
        setState('done');
      }
    } catch {}
  }, [cacheKey, isSpanish]);

  useEffect(() => {
    if (autoTranslate && state === 'idle' && !isSpanish) {
      go();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTranslate, isSpanish]);

  async function go() {
    setState('loading');
    try {
      const out = await translateViaMyMemory(text, from, 'es');
      setTranslated(out);
      setState('done');
      try {
        localStorage.setItem(cacheKey, out);
      } catch {}
    } catch (e) {
      setState('error');
    }
  }

  if (isSpanish) {
    return (
      <p className="max-w-3xl text-[15px] leading-relaxed text-fg-muted/95 whitespace-pre-line">
        {text}
      </p>
    );
  }

  const display = state === 'done' && translated && !showOriginal ? translated : text;

  return (
    <div className="max-w-3xl">
      {state !== 'done' && !showOriginal && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-bg-hover/60 px-3 py-1.5 text-xs">
          <span className="inline-flex h-5 items-center rounded bg-white/10 px-1.5 text-[10px] font-bold uppercase tracking-wider text-fg-muted ring-1 ring-inset ring-white/10">
            {from === 'en' ? 'EN' : '??'}
          </span>
          <span className="text-fg-muted">Descripción no está en español</span>
          <button
            type="button"
            onClick={go}
            disabled={state === 'loading'}
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white ring-1 ring-brand-400/30 transition hover:bg-brand-500 disabled:opacity-60"
          >
            {state === 'loading' ? (
              <>
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
                </svg>
                Traduciendo…
              </>
            ) : state === 'error' ? (
              'Reintentar'
            ) : (
              'Traducir al español'
            )}
          </button>
        </div>
      )}
      {state === 'done' && translated && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="inline-flex h-5 items-center rounded bg-emerald-500/15 px-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            Traducido
          </span>
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="text-fg-subtle underline decoration-dotted underline-offset-2 hover:text-fg"
          >
            {showOriginal ? 'Ver traducción' : 'Ver original'}
          </button>
        </div>
      )}
      <p className="text-[15px] leading-relaxed text-fg-muted/95 whitespace-pre-line">{display}</p>
    </div>
  );
}
