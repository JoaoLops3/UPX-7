import { useAluno } from '../hooks/useAluno';
import { useStudentNotifications } from '../hooks/useStudentNotifications';

/** Sincroniza notificações locais em segundo plano (sem UI). */
export function StudentNotificationSync() {
  const { aluno } = useAluno();
  useStudentNotifications(aluno?.id ?? '');
  return null;
}
