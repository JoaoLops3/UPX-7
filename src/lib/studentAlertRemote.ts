import { supabase } from './supabase';
import type { StoredStudentAlert } from './studentAlertHistory';

type AvisoRow = {
  aluno_id: string;
  alert_id: string;
  kind: string;
  title: string;
  body: string;
  tone: string;
  action: string | null;
  created_at: string;
  read_at: string | null;
};

function rowToAlert(row: AvisoRow): StoredStudentAlert {
  return {
    id: row.alert_id,
    kind: row.kind as StoredStudentAlert['kind'],
    title: row.title,
    body: row.body,
    tone: row.tone as StoredStudentAlert['tone'],
    action: (row.action ?? undefined) as StoredStudentAlert['action'],
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function alertToRow(alunoId: string, alert: StoredStudentAlert): AvisoRow {
  return {
    aluno_id: alunoId,
    alert_id: alert.id,
    kind: alert.kind,
    title: alert.title,
    body: alert.body,
    tone: alert.tone,
    action: alert.action ?? null,
    created_at: alert.createdAt,
    read_at: alert.readAt,
  };
}

function hasAlunoId(alunoId: string): boolean {
  return alunoId.trim().length > 0;
}

export async function fetchRemoteAlertHistory(alunoId: string): Promise<StoredStudentAlert[]> {
  if (!hasAlunoId(alunoId)) return [];

  const { data, error } = await supabase
    .from('aluno_avisos')
    .select('aluno_id, alert_id, kind, title, body, tone, action, created_at, read_at')
    .eq('aluno_id', alunoId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as AvisoRow[]).map(rowToAlert);
}

export async function saveRemoteAlert(alunoId: string, alert: StoredStudentAlert): Promise<void> {
  if (!hasAlunoId(alunoId)) return;

  await supabase.from('aluno_avisos').upsert(alertToRow(alunoId, alert), {
    onConflict: 'aluno_id,alert_id',
  });
}

export async function saveRemoteAlerts(alunoId: string, alerts: StoredStudentAlert[]): Promise<void> {
  if (!hasAlunoId(alunoId) || alerts.length === 0) return;

  await supabase.from('aluno_avisos').upsert(
    alerts.map((alert) => alertToRow(alunoId, alert)),
    { onConflict: 'aluno_id,alert_id' },
  );
}
