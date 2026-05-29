import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import { upsertPaidMultaAlert } from '../../lib/adminMultaAlerts';
import { supabase } from '../../lib/supabase';
import type { AdminTabScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import type { MultaComAluguel } from '../../types/database';
import { formatDateTime } from '../../utils/dates';

type Props = AdminTabScreenProps<'AdminMultas'>;

export default function AdminMultasScreen(_props: Props) {
  const [multas, setMultas] = useState<MultaComAluguel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('multas')
      .select('*, alugueis(*, itens(nome, numero)), alunos(nome, ra)')
      .order('gerada_em', { ascending: false })
      .limit(80);
    setMultas((data as MultaComAluguel[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const marcarPago = (multa: MultaComAluguel) => {
    if (multa.status === 'pago') return;
    Alert.alert('Marcar como paga', `Multa de R$ ${Number(multa.valor).toFixed(2)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          const pagoEm = new Date().toISOString();
          await supabase
            .from('multas')
            .update({ status: 'pago', pago_em: pagoEm })
            .eq('id', multa.id);
          if (multa.aluno_id) {
            await upsertPaidMultaAlert(multa.aluno_id, {
              id: multa.id,
              dias_atraso: multa.dias_atraso,
              gerada_em: multa.gerada_em ?? pagoEm,
              itemNome: multa.alugueis?.itens?.nome,
            });
          }
          void load();
        },
      },
    ]);
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Multas</Text>
      <Text style={styles.sub}>Guarda-chuva · toque para marcar como paga</Text>
      <FlatList
        data={multas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma multa registrada.</Text>}
        renderItem={({ item }) => {
          const aluno = (item as MultaComAluguel & { alunos?: { nome: string; ra: string } }).alunos;
          return (
            <Pressable
              onPress={() => marcarPago(item)}
              disabled={item.status === 'pago'}
              accessibilityLabel="Multa"
            >
              <AdminListCard
                title={`${aluno?.nome ?? '—'} · RA ${aluno?.ra ?? '—'}`}
                subtitle={`${item.alugueis?.itens?.nome ?? 'Item'} · ${item.dias_atraso} dia(s) · ${formatDateTime(item.gerada_em)}`}
                badge={`R$ ${Number(item.valor).toFixed(2)} · ${item.status}`}
                badgeTone={item.status === 'pendente' ? 'danger' : 'success'}
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
