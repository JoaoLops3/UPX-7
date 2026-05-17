import { isAluguelPendenteParaAluno } from '../quadraAluguelTiming';
import { pickProximaReservaQuadra } from '../quadraReserva';
import { supabase } from '../supabase';
import { fetchCampusWeather } from '../weather';
import type { AluguelComItem, MultaComAluguel } from '../../types/database';

export async function fetchNotificationDataForCurrentUser(): Promise<{
  aluguelAtivo: AluguelComItem | null;
  reservaQuadra: AluguelComItem | null;
  multasPendentes: MultaComAluguel[];
  weather: Awaited<ReturnType<typeof fetchCampusWeather>> | null;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const email = user.email.trim().toLowerCase();
  const { data: aluno } = await supabase
    .from('alunos')
    .select('id')
    .ilike('email', email)
    .eq('ativo', true)
    .maybeSingle();

  if (!aluno?.id) return null;

  const [alugueisRes, multasRes, weather] = await Promise.all([
    supabase.from('alugueis').select('*, itens(*)').eq('aluno_id', aluno.id),
    supabase
      .from('multas')
      .select('*, alugueis(*, itens(nome, numero))')
      .eq('aluno_id', aluno.id)
      .eq('status', 'pendente'),
    fetchCampusWeather().catch(() => null),
  ]);

  const alugueis = (alugueisRes.data as AluguelComItem[]) ?? [];
  const aluguelAtivo = alugueis.find((a) => isAluguelPendenteParaAluno(a)) ?? null;
  const reservaQuadra = pickProximaReservaQuadra(alugueis);
  const multasPendentes = (multasRes.data as MultaComAluguel[]) ?? [];

  return { aluguelAtivo, reservaQuadra, multasPendentes, weather };
}
