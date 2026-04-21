/**
 * Codifica URL destino como base64 URL-safe para pasar por /api/p/{b64}.
 * Motivo: adblockers (Chrome desktop) detectan `/api/img?u=<dominio>` por el
 * dominio en el query string. Path ofuscado evita estas reglas simples.
 *
 * Compatible server y browser (usa btoa si está, sino Buffer).
 */
export function proxyUrl(target: string, ref?: 'w'): string {
  const b64 = btoa(unescape(encodeURIComponent(target)));
  const safe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return ref ? `/api/p/${safe}?r=${ref}` : `/api/p/${safe}`;
}
