import { useEffect } from 'react';
import { nfcLog, nfcLogLeitura } from '../lib/nfcConsoleLog';
import { nfcUidsMatch } from '../lib/nfcUid';
import { supabase } from '../lib/supabase';

type Options = {
  alunoId: string;
  uidNfc: string | null | undefined;
  enabled: boolean;
  onCheckIn: () => void;
};

/**
 * Observa o resultado das leituras do totem (processadas no servidor) para a
 * carteirinha do aluno logado. A ação de check-in é feita no banco pelo trigger
 * processar_leitura_nfc; aqui o app apenas reage ao resultado.
 */
export function useNfcScanTotem({ alunoId, uidNfc, enabled, onCheckIn }: Options) {
  useEffect(() => {
    if (!enabled || !alunoId || !uidNfc) return;

    nfcLog('Observando totem (tela Scan)', { uid_aluno: uidNfc });

    const channel = supabase
      .channel(`nfc-scan-${alunoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs_nfc' },
        (payload) => {
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
          nfcLogLeitura('scan', row.uid_cartao, uidNfc, match);

          if (!match) return;

          if (row.acao === 'checkin' && row.sucesso) {
            nfcLog('Check-in confirmado pelo totem');
            onCheckIn();
          }
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
      nfcLog('Parou de observar totem (saiu da tela Scan)');
      void supabase.removeChannel(channel);
    };
  }, [alunoId, uidNfc, enabled, onCheckIn]);
}
