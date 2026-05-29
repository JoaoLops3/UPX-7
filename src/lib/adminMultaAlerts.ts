import { calcularValorMulta } from './multaCalculo';
import { supabase } from './supabase';

type MultaAlertInput = {
  id: string;
  dias_atraso: number;
  gerada_em: string;
  itemNome?: string;
};

function multaAlertBody(dias: number, itemNome: string): string {
  const valor = calcularValorMulta(dias).toFixed(2).replace('.', ',');
  return `R$ ${valor} (${dias} ${dias === 1 ? 'dia' : 'dias'} de atraso). ${itemNome}. Pague na tesouraria.`;
}

export async function upsertPendingMultaAlert(
  alunoId: string,
  multa: MultaAlertInput,
): Promise<void> {
  const itemNome = multa.itemNome ?? 'item';
  await supabase.from('aluno_avisos').upsert(
    {
      aluno_id: alunoId,
      alert_id: `multa:${multa.id}`,
      kind: 'multa',
      title: 'Multa pendente',
      body: multaAlertBody(multa.dias_atraso, itemNome),
      tone: 'danger',
      action: 'Fines',
      created_at: multa.gerada_em,
      read_at: null,
    },
    { onConflict: 'aluno_id,alert_id' },
  );
}

export async function upsertPaidMultaAlert(
  alunoId: string,
  multa: MultaAlertInput,
): Promise<void> {
  const itemNome = multa.itemNome ?? 'item';
  const valor = calcularValorMulta(multa.dias_atraso).toFixed(2).replace('.', ',');
  await supabase.from('aluno_avisos').upsert(
    {
      aluno_id: alunoId,
      alert_id: `multa:${multa.id}`,
      kind: 'multa',
      title: 'Multa quitada',
      body: `${itemNome} · R$ ${valor} — pagamento registrado pela tesouraria.`,
      tone: 'info',
      action: 'Fines',
      created_at: multa.gerada_em,
      read_at: null,
    },
    { onConflict: 'aluno_id,alert_id' },
  );
}

export async function removeMultaAlert(alunoId: string, multaId: string): Promise<void> {
  await supabase
    .from('aluno_avisos')
    .delete()
    .eq('aluno_id', alunoId)
    .eq('alert_id', `multa:${multaId}`);
}
