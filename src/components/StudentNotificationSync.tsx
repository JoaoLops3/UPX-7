import { useEffect } from 'react';
import { useAluno } from '../hooks/useAluno';
import { useStudentNotifications } from '../hooks/useStudentNotifications';
import { ensureNotificationsAutoSetup } from '../lib/notifications/autoSetup';
import {
  ensureBackgroundTaskDefined,
  registerNotificationBackgroundSync,
} from '../lib/notifications/backgroundTask';

/** Permissões, sync em foreground e tarefa em segundo plano para alertas locais. */
export function StudentNotificationSync() {
  const { aluno } = useAluno();
  useStudentNotifications(aluno?.id ?? '');

  useEffect(() => {
    if (!aluno?.id) return;
    void (async () => {
      try {
        await ensureNotificationsAutoSetup();
        ensureBackgroundTaskDefined();
        await registerNotificationBackgroundSync();
      } catch {
        /* notificações opcionais — não bloqueia o app */
      }
    })();
  }, [aluno?.id]);

  return null;
}
