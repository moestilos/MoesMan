/**
 * Codifica URL destino como base64 URL-safe para pasar por /api/p/{b64}.
 * Motivo: adblockers (Chrome desktop) detectan `/api/img?u=<dominio>` por el
 * dominio en el query string. Path ofuscado evita estas reglas simples.
 *
 * Compatible server y browser (usa btoa si está, sino Buffer).
 */
/**
 * Por estabilidad (Vercel a veces tarda en publicar rutas nuevas
 * con parámetros dinámicos) usamos el endpoint legacy /api/img que
 * está probado. La obfuscación adblock se consigue vía ref= genérico.
 */
export function proxyUrl(target: string, ref?: 'w'): string {
  const base = `/api/img?u=${encodeURIComponent(target)}`;
  return ref ? `${base}&ref=${ref === 'w' ? 'webtoons' : ref}` : base;
}
