export const NOTIFICATION_ID_PREFIX = 'upx7:';

export const STORAGE_KEYS = {
  enabled: 'upx7_notifications_enabled',
  notified: 'upx7_notifications_notified',
} as const;

export const RAIN_NOTIFY_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export type NotificationKind =
  | 'rain'
  | 'reserva'
  | 'devolucao_quadra'
  | 'devolucao_guarda'
  | 'multa';
