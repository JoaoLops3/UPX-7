import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import { supabase } from '../../lib/supabase';
import type { AdminTabScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import type { AluguelComItem } from '../../types/database';
import { formatDateTime, formatTime } from '../../utils/dates';
import { getItemDisplay } from '../../utils/itemDisplay';

type Props = AdminTabScreenProps<'AdminAlugueis'>;

export default function AdminAlugueisScreen(_props: Props) {
  const [rows, setRows] = useState<AluguelComItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('alugueis')
      .select('*, itens(*), alunos(nome, ra, email)')
      .order('inicio', { ascending: false })
      .limit(80);
    setRows((data as AluguelComItem[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const encerrar = (row: AluguelComItem) => {
    Alert.alert(
      'Encerrar aluguel',
      `Marcar como devolvido: ${row.itens?.nome ?? 'item'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            const agora = new Date().toISOString();
            await supabase
              .from('alugueis')
              .update({ status: 'devolvido', fim_real: agora })
              .eq('id', row.id);
            if (row.item_id) {
              await supabase.from('itens').update({ disponivel: true }).eq('id', row.item_id);
            }
            void load();
          },
        },
      ],
    );
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Aluguéis</Text>
      <Text style={styles.sub}>Últimos registros · toque para encerrar se necessário</Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum aluguel registrado.</Text>}
        renderItem={({ item }) => {
          const aluno = (item as AluguelComItem & { alunos?: { nome: string; ra: string } }).alunos;
          const display = getItemDisplay(item.itens?.tipo ?? 'quadra');
          const ativo = item.status === 'ativo' || item.status === 'aguardando_nfc';
          const badgeLabel =
            item.status === 'agendado'
              ? 'Agendado'
              : item.status === 'cancelado'
                ? 'Cancelado'
                : (item.status ?? '—');
          return (
            <Pressable
              onPress={() => ativo && encerrar(item)}
              disabled={!ativo}
              accessibilityLabel={`Aluguel ${display.label}`}
            >
              <AdminListCard
                title={`${display.label} · ${aluno?.nome ?? '—'}`}
                subtitle={`RA ${aluno?.ra ?? '—'} · ${item.inicio ? formatDateTime(item.inicio) : '—'} → ${formatTime(item.fim_previsto)}`}
                badge={badgeLabel}
                badgeTone={
                  item.status === 'ativo'
                    ? 'success'
                    : item.status === 'aguardando_nfc'
                      ? 'warning'
                      : item.status === 'agendado'
                        ? 'default'
                        : item.status === 'atrasado'
                          ? 'danger'
                          : item.status === 'cancelado'
                            ? 'default'
                            : 'default'
                }
              />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sub: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 16, paddingTop: 0 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24 },
});
