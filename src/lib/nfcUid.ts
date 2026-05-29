/** Normaliza UID do cartao para comparar Arduino, Supabase e app. */
export function normalizeNfcUid(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\s+/g, '').toUpperCase();
}

export function nfcUidsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeNfcUid(a);
  const nb = normalizeNfcUid(b);
  return na.length >= 4 && na === nb;
}
