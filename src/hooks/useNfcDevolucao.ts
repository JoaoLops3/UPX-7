import { useEffect } from 'react';
import type { DevolverResult } from '../lib/devolverAluguel';
import { nfcLog, nfcLogLeitura } from '../lib/nfcConsoleLog';
import { nfcUidsMatch } from '../lib/nfcUid';
import { supabase } from '../lib/supabase';
import type { AluguelComItem } from '../types/database';

type Options = {
  alunoId: string;
  uidNfc: string | null | undefined;
  aluguelAtivo: AluguelComItem | null;
  enabled: boolean;
  onDevolvido: (result: DevolverResult) => void;
};

/** Lê a multa gerada (pelo trigger do banco) para montar o aviso ao aluno. */
async function buildDevolverResult(aluguelId: string): Promise<DevolverResult> {
  const { data } = await supabase
    .from('multas')
    .select('valor, dias_atraso')
    .eq('aluguel_id', aluguelId)
    .order('gerada_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      ok: true,
      multaGerada: true,
      valorMulta: Number(data.valor),
      diasAtraso: Number(data.dias_atraso),
    };
  }
  return { ok: true, multaGerada: false };
}

/**
 * Observa o resultado da devolução feita no totem (trigger processar_leitura_nfc).
 * O app não executa mais a devolução; apenas reage ao resultado do servidor.
 */
export function useNfcDevolucao({
  alunoId,
  uidNfc,
  aluguelAtivo,
  enabled,
  onDevolvido,
}: Options) {
  useEffect(() => {
    if (!enabled || !alunoId || !uidNfc || !aluguelAtivo) return;

    const aluguelId = aluguelAtivo.id;

    nfcLog('Observando totem (tela Devolução)', {
      uid_aluno: uidNfc,
      item: aluguelAtivo.itens.nome,
    });

    const channel = supabase
      .channel(`nfc-devolucao-${alunoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs_nfc' },
        (payload) => {
          void (async () => {
            const row = payload.new as {
              uid_cartao?: string;
              uid_totem?: string;
              acao?: string | null;
              sucesso?: boolean | null;
            };
            const match = nfcUidsMatch(row.uid_cartao, uidNfc);

            nfcLog('Evento logs_nfc recebido', {
              uid_cartao: row.uid_cartao,
              uid_totem: row.uid_totem,
              acao: row.acao,
              sucesso: row.sucesso,
            });
            nfcLogLeitura('devolucao', row.uid_cartao, uidNfc, match);

            if (!match) return;
            if (row.acao !== 'devolucao' || !row.sucesso) return;

            nfcLog('Devolução confirmada pelo totem');
            const result = await buildDevolverResult(aluguelId);
            onDevolvido(result);
          })();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          nfcLog('Realtime conectado — aguardando resultado do totem');
        } else if (status === 'CHANNEL_ERROR') {
          nfcLog('Erro na conexão Realtime do NFC');
        }
      });

    return () => {
      nfcLog('Parou de observar totem (saiu da tela Devolução)');
      void supabase.removeChannel(channel);
    };
  }, [alunoId, uidNfc, aluguelAtivo, enabled, onDevolvido]);
}
