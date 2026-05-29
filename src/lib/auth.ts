import { supabase } from './supabase';

export type LoginMode = 'email' | 'ra';

export function detectLoginMode(identifier: string): LoginMode {
  return identifier.trim().includes('@') ? 'email' : 'ra';
}

/** Normaliza RA: remove espaços; se só dígitos, mantém; senão trim. */
export function normalizeRa(ra: string): string {
  const trimmed = ra.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length > 0 ? digitsOnly : trimmed;
}

export async function resolveLoginEmail(
  identifier: string,
  mode: LoginMode,
): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (mode === 'email') {
    return trimmed.toLowerCase();
  }

  const ra = normalizeRa(trimmed);

  const { data: rpcEmail, error: rpcError } = await supabase.rpc(
    'lookup_aluno_email_for_login',
    { p_ra: ra },
  );

  if (!rpcError && typeof rpcEmail === 'string' && rpcEmail.length > 0) {
    return rpcEmail;
  }

  const { data, error } = await supabase
    .from('alunos')
    .select('email')
    .eq('ra', ra)
    .eq('ativo', true)
    .maybeSingle();

  if (error || !data?.email) return null;
  return data.email.trim().toLowerCase();
}

export async function requestPasswordReset(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return 'Informe seu RA ou e-mail institucional.';

  const mode = detectLoginMode(trimmed);
  const email = await resolveLoginEmail(trimmed, mode);
  if (!email) return 'RA/e-mail não encontrado no cadastro de alunos.';

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return error.message;
  return null;
}
