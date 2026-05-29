import { Platform } from 'react-native';
import { normalizeNfcUid } from './nfcUid';

const PREFIX = '[UPX NFC]';

/** Logs visíveis no DevTools do navegador (F12 → Console). */
export function nfcLog(message: string, data?: Record<string, unknown>) {
  if (Platform.OS !== 'web') return;
  if (data && Object.keys(data).length > 0) {
    console.info(`${PREFIX} ${message}`, data);
  } else {
    console.info(`${PREFIX} ${message}`);
  }
}

export function nfcLogLeitura(
  context: 'scan' | 'devolucao',
  uidCartao: string | undefined,
  uidAluno: string | null | undefined,
  match: boolean,
) {
  nfcLog(match ? 'Leitura reconhecida' : 'Leitura ignorada (UID diferente)', {
    tela: context,
    uid_cartao: normalizeNfcUid(uidCartao),
    uid_aluno: normalizeNfcUid(uidAluno),
    corresponde: match,
  });
}
