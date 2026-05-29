export type TotemQrPayload = {
  sessaoId: string;
  token: string;
};

export function buildTotemQrValue(sessaoId: string, token: string): string {
  return `upx7://totem?id=${encodeURIComponent(sessaoId)}&token=${encodeURIComponent(token)}`;
}

export function parseTotemQrValue(raw: string): TotemQrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('upx7://totem')) {
      const url = new URL(trimmed.replace('upx7://', 'https://upx7.local/'));
      const sessaoId = url.searchParams.get('id');
      const token = url.searchParams.get('token');
      if (sessaoId && token) return { sessaoId, token };
    }
  } catch {
    // fall through
  }

  try {
    const json = JSON.parse(trimmed) as { id?: string; token?: string; sessao_id?: string };
    const sessaoId = json.sessao_id ?? json.id;
    if (sessaoId && json.token) return { sessaoId, token: json.token };
  } catch {
    // fall through
  }

  return null;
}

export type TotemQrSessionResult = {
  ok: boolean;
  sessao_id?: string;
  token?: string;
  expira_em?: string;
  message?: string;
};

export type TotemQrConfirmResult = {
  ok: boolean;
  message?: string;
  aluno?: { id: string; nome: string | null };
};
