import {
  SchedulableTriggerInputTypes,
  type NotificationTriggerInput,
} from 'expo-notifications';
import {
  getQuadraAluguelPhase,
  getQuadraGraceDeadline,
  QUADRA_GRACE_MINUTES,
} from '../quadraAluguelTiming';
import { isQuadraReservaRow } from '../quadraReserva';
import type { WeatherSnapshot } from '../weather';
import type { AluguelComItem, MultaComAluguel } from '../../types/database';
import { formatDate, formatTime } from '../../utils/dates';
import { NOTIFICATION_ID_PREFIX, RAIN_NOTIFY_COOLDOWN_MS, type NotificationKind } from './constants';
import { wasNotifiedRecently } from './notifiedStore';

export type PlannedNotification = {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  trigger: NotificationTriggerInput;
  notifyKey?: string;
  notifyCooldownMs?: number;
};

function dateTrigger(at: Date): NotificationTriggerInput | null {
  const ms = at.getTime() - Date.now();
  if (ms < 5_000) return null;
  return {
    type: SchedulableTriggerInputTypes.DATE,
    date: at,
  };
}

function secondsTrigger(seconds: number): NotificationTriggerInput {
  return {
    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: Math.max(2, seconds),
    repeats: false,
  };
}

async function immediateIfAllowed(
  plan: Omit<PlannedNotification, 'trigger'> & {
    notifyKey: string;
    notifyCooldownMs?: number;
  },
): Promise<PlannedNotification | null> {
  const cooldown = plan.notifyCooldownMs;
  if (await wasNotifiedRecently(plan.notifyKey, cooldown)) return null;
  return {
    ...plan,
    trigger: secondsTrigger(2),
  };
}

export async function planStudentNotifications(input: {
  aluguelAtivo: AluguelComItem | null;
  reservaQuadra: AluguelComItem | null;
  multasPendentes: MultaComAluguel[];
  weather: WeatherSnapshot | null;
}): Promise<PlannedNotification[]> {
  const { aluguelAtivo, reservaQuadra, multasPendentes, weather } = input;
  const plans: PlannedNotification[] = [];
  const now = Date.now();

  if (weather?.isRainy) {
    const hourKey = new Date().toISOString().slice(0, 13);
    const rain = await immediateIfAllowed({
      id: `${NOTIFICATION_ID_PREFIX}rain:${hourKey}`,
      title: 'Chuva no campus',
      body: `Está chovendo na Facens (${weather.description}). Leve guarda-chuva ou adie a quadra.`,
      kind: 'rain',
      notifyKey: `rain:${hourKey}`,
      notifyCooldownMs: RAIN_NOTIFY_COOLDOWN_MS,
    });
    if (rain) plans.push(rain);
  }

  if (reservaQuadra?.inicio && isQuadraReservaRow(reservaQuadra)) {
    const inicio = new Date(reservaQuadra.inicio);
    const inicioMs = inicio.getTime();
    const hora = formatTime(reservaQuadra.inicio);
    const reminders: { idSuffix: string; offsetMin: number; title: string; body: string }[] = [
      {
        idSuffix: '1h',
        offsetMin: 60,
        title: 'Reserva da quadra em 1 hora',
        body: `Sua reserva começa às ${hora}. Prepare-se para o check-in no totem.`,
      },
      {
        idSuffix: '15m',
        offsetMin: 15,
        title: 'Reserva da quadra em 15 minutos',
        body: `Em breve: ${hora}. Aproxime a carteirinha no totem para liberar a quadra.`,
      },
    ];

    for (const r of reminders) {
      const at = new Date(inicioMs - r.offsetMin * 60_000);
      const trigger = dateTrigger(at);
      if (!trigger) continue;
      plans.push({
        id: `${NOTIFICATION_ID_PREFIX}reserva:${reservaQuadra.id}:${r.idSuffix}`,
        title: r.title,
        body: r.body,
        kind: 'reserva',
        trigger,
      });
    }
  }

  if (aluguelAtivo) {
    const tipo = aluguelAtivo.itens?.tipo;
    const nome = aluguelAtivo.itens?.nome ?? 'item';

    if (tipo === 'quadra') {
      const phase = getQuadraAluguelPhase(aluguelAtivo);
      const fimMs = new Date(aluguelAtivo.fim_previsto).getTime();
      const graceEnd = getQuadraGraceDeadline(aluguelAtivo.fim_previsto);

      if (phase === 'em_uso' && fimMs > now) {
        const warn10 = dateTrigger(new Date(fimMs - 10 * 60_000));
        if (warn10) {
          plans.push({
            id: `${NOTIFICATION_ID_PREFIX}devolucao-quadra-warn:${aluguelAtivo.id}`,
            title: 'Quadra termina em 10 minutos',
            body: `Prepare-se para devolver ${nome} no totem NFC ao fim do horário.`,
            kind: 'devolucao_quadra',
            trigger: warn10,
          });
        }

        const fimTrigger = dateTrigger(new Date(fimMs));
        if (fimTrigger) {
          plans.push({
            id: `${NOTIFICATION_ID_PREFIX}devolucao-quadra-fim:${aluguelAtivo.id}`,
            title: 'Horário da quadra encerrado',
            body: 'Aproxime a carteirinha no totem para concluir a devolução.',
            kind: 'devolucao_quadra',
            trigger: fimTrigger,
          });
        }
      }

      if (phase === 'aguardando_nfc' || aluguelAtivo.status === 'aguardando_nfc') {
        const urgent = await immediateIfAllowed({
          id: `${NOTIFICATION_ID_PREFIX}devolucao-quadra-urgent:${aluguelAtivo.id}`,
          title: 'Devolução da quadra pendente',
          body: `Aproxime a carteirinha no totem em até ${QUADRA_GRACE_MINUTES} minutos para liberar a quadra.`,
          kind: 'devolucao_quadra',
          notifyKey: `devolucao-urgent:${aluguelAtivo.id}`,
        });
        if (urgent) plans.push(urgent);

        const graceWarn = dateTrigger(
          new Date(graceEnd.getTime() - 5 * 60_000),
        );
        if (graceWarn) {
          plans.push({
            id: `${NOTIFICATION_ID_PREFIX}devolucao-quadra-grace:${aluguelAtivo.id}`,
            title: 'Últimos minutos para devolver',
            body: 'Faltam 5 minutos para confirmar a devolução da quadra no totem NFC.',
            kind: 'devolucao_quadra',
            trigger: graceWarn,
          });
        }
      }
    }

    if (tipo === 'guarda_chuva') {
      const fimMs = new Date(aluguelAtivo.fim_previsto).getTime();
      const devolucaoAte = formatDate(aluguelAtivo.fim_previsto);

      const dayBefore = dateTrigger(new Date(fimMs - 24 * 60 * 60_000));
      if (dayBefore) {
        plans.push({
          id: `${NOTIFICATION_ID_PREFIX}devolucao-guarda-1d:${aluguelAtivo.id}`,
          title: 'Devolução do guarda-chuva amanhã',
          body: `Lembrete: devolver ${nome} até ${devolucaoAte}.`,
          kind: 'devolucao_guarda',
          trigger: dayBefore,
        });
      }

      const due = dateTrigger(new Date(fimMs - 2 * 60 * 60_000));
      if (due) {
        plans.push({
          id: `${NOTIFICATION_ID_PREFIX}devolucao-guarda-due:${aluguelAtivo.id}`,
          title: 'Prazo do guarda-chuva se aproxima',
          body: `Devolva ${nome} até ${devolucaoAte} para evitar multa.`,
          kind: 'devolucao_guarda',
          trigger: due,
        });
      }

      if (fimMs > now && fimMs - now < 24 * 60 * 60_000) {
        const urgentGuarda = await immediateIfAllowed({
          id: `${NOTIFICATION_ID_PREFIX}devolucao-guarda-urgent:${aluguelAtivo.id}`,
          title: 'Devolver guarda-chuva',
          body: `Prazo até ${devolucaoAte}. Use a aba Devolução e aproxime a carteirinha no totem.`,
          kind: 'devolucao_guarda',
          notifyKey: `devolucao-guarda-urgent:${aluguelAtivo.id}`,
        });
        if (urgentGuarda) plans.push(urgentGuarda);
      }
    }
  }

  for (const multa of multasPendentes) {
    const valor = Number(multa.valor).toFixed(2).replace('.', ',');
    const itemNome = multa.alugueis?.itens?.nome ?? 'item';
    const multaPlan = await immediateIfAllowed({
      id: `${NOTIFICATION_ID_PREFIX}multa:${multa.id}`,
      title: 'Multa pendente',
      body: `Multa de R$ ${valor} referente a ${itemNome}. Confira em Perfil → Minhas multas.`,
      kind: 'multa',
      notifyKey: `multa:${multa.id}`,
    });
    if (multaPlan) plans.push(multaPlan);
  }

  return plans;
}
