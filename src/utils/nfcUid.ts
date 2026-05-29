/** Normaliza UID NFC para comparação/armazenamento (hex maiúsculo, sem espaços). */
export function normalizeNfcUid(raw: string): string {
  return String(raw).replace(/\s+/g, '').toUpperCase();
}

export function maskNfcUid(uid: string | null | undefined): string | null {
  if (!uid) return null;
  const n = normalizeNfcUid(uid);
  if (n.length <= 4) return n;
  return `···${n.slice(-4)}`;
}
