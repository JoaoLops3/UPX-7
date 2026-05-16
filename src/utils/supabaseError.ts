export function getSupabaseErrorMessage(error: { message?: string; code?: string } | null): string {
  if (!error) return 'Erro ao conectar com o servidor.';
  const msg = error.message?.toLowerCase() ?? '';
  if (msg.includes('503') || msg.includes('unavailable')) {
    return 'Supabase indisponível (503). No painel do Supabase, verifique se o projeto não está pausado e clique em Restore.';
  }
  return error.message ?? 'Erro ao buscar dados.';
}
