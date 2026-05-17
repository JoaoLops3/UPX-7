import { SchedulableTriggerInputTypes } from 'expo-notifications';
import type { NotificationKind } from './constants';
import {
  getNotificationPermissionState,
  requestNotificationPermissions,
} from './permissions';
import { notificationsSupportedOnPlatform } from './preferences';

const TEST_SAMPLES: { title: string; body: string; kind: NotificationKind }[] = [
  {
    kind: 'rain',
    title: 'Chuva no campus',
    body: 'Está chovendo na Facens. Leve guarda-chuva ou adie a quadra.',
  },
  {
    kind: 'reserva',
    title: 'Reserva da quadra em 15 minutos',
    body: 'Sua reserva começa às 14:00. Aproxime a carteirinha no totem.',
  },
  {
    kind: 'devolucao_quadra',
    title: 'Devolução da quadra pendente',
    body: 'Aproxime a carteirinha no totem em até 10 minutos.',
  },
  {
    kind: 'devolucao_guarda',
    title: 'Prazo do guarda-chuva se aproxima',
    body: 'Devolva o guarda-chuva até amanhã para evitar multa.',
  },
  {
    kind: 'multa',
    title: 'Multa pendente',
    body: 'Multa de R$ 15,00 referente ao guarda-chuva. Veja em Perfil → Minhas multas.',
  },
];

function pickRandomSample() {
  return TEST_SAMPLES[Math.floor(Math.random() * TEST_SAMPLES.length)]!;
}

export async function sendTestNotification(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!notificationsSupportedOnPlatform()) {
    return { ok: false, message: 'Teste disponível apenas no app iOS ou Android.' };
  }

  let permission = await getNotificationPermissionState();
  if (permission !== 'granted') {
    permission = await requestNotificationPermissions();
  }
  if (permission !== 'granted') {
    return {
      ok: false,
      message: 'Ative as notificações do UPX 7 nas configurações do celular.',
    };
  }

  const sample = pickRandomSample();

  let Notifications: typeof import('expo-notifications');
  try {
    Notifications = require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return { ok: false, message: 'Módulo de notificações não disponível. Recompile o app no Xcode.' };
  }

  await Notifications.scheduleNotificationAsync({
    identifier: `upx7:test:${Date.now()}`,
    content: {
      title: sample.title,
      body: sample.body,
      sound: true,
      data: { kind: sample.kind, test: true },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    },
  });

  return { ok: true };
}
