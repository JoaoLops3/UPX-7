import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { showAlert } from '../utils/alert';
import {
  activateQuadraReserva,
  findAgendadoForCheckIn,
  validateCheckInWindow,
} from '../lib/quadraReserva';
import { nfcUidsMatch } from '../lib/nfcUid';
import { supabase } from '../lib/supabase';

type Options = {
  alunoId: string;
  uidNfc: string | null | undefined;
  quadraItemId: string | null | undefined;
  enabled: boolean;
  onActivated: () => void;
};

export function useQuadraCheckIn({
  alunoId,
  uidNfc,
  quadraItemId,
  enabled,
  onActivated,
}: Options) {
  const handling = useRef(false);

  useEffect(() => {
    if (!enabled || !alunoId || !quadraItemId || !uidNfc) return;

    const channel = supabase
      .channel(`nfc-checkin-${alunoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs_nfc' },
        (payload) => {
          void (async () => {
            const row = payload.new as { uid_cartao?: string };
            if (!nfcUidsMatch(row.uid_cartao, uidNfc)) return;
            if (handling.current) return;
            handling.current = true;

            try {
              const reserva = await findAgendadoForCheckIn(alunoId, quadraItemId);
              if (!reserva?.inicio) {
                if (Platform.OS === 'web') {
                  console.info('NFC: sem reserva agendada para check-in hoje.');
                }
                return;
              }

              const windowCheck = validateCheckInWindow(
                reserva.inicio,
                reserva.fim_previsto,
              );
              if (!windowCheck.ok) {
                showAlert('Check-in', windowCheck.message);
                return;
              }

              const result = await activateQuadraReserva(reserva.id, quadraItemId);
              if (result.ok) {
                onActivated();
              } else if (result.code !== 'no_reserva') {
                showAlert('Check-in', result.message);
              }
            } finally {
              handling.current = false;
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [alunoId, uidNfc, quadraItemId, enabled, onActivated]);
}
