import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Listener = () => void;

type AlugueisChannelEntry = {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
};

const channelsByAluno = new Map<string, AlugueisChannelEntry>();
let channelSeq = 0;

/**
 * Um único canal Realtime por aluno, compartilhado entre todos os useAlugueis().
 * Evita "cannot add postgres_changes after subscribe" quando várias telas montam o hook.
 */
export function subscribeAlugueisChanges(alunoId: string, listener: Listener): () => void {
  if (!alunoId) return () => {};

  let entry = channelsByAluno.get(alunoId);
  if (!entry) {
    channelSeq += 1;
    const channel = supabase
      .channel(`alugueis-changes-${alunoId}-${channelSeq}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alugueis',
          filter: `aluno_id=eq.${alunoId}`,
        },
        () => {
          const current = channelsByAluno.get(alunoId);
          if (!current) return;
          for (const fn of current.listeners) fn();
        },
      )
      .subscribe();

    entry = { channel, listeners: new Set() };
    channelsByAluno.set(alunoId, entry);
  }

  entry.listeners.add(listener);

  return () => {
    const current = channelsByAluno.get(alunoId);
    if (!current) return;

    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;

    channelsByAluno.delete(alunoId);
    void supabase.removeChannel(current.channel);
  };
}
