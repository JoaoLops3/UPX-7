import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton } from '../../components/BackButton';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import { supabase } from '../../lib/supabase';
import type { AdminStackScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import type { LogNFC } from '../../types/database';
import { formatDateTime } from '../../utils/dates';

type Props = AdminStackScreenProps<'AdminLogsNfc'>;

export default function AdminLogsNfcScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<LogNFC[]>([]);
  const [loading, setLoading] = useState(true);
  const [unknownOnly, setUnknownOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('logs_nfc').select('*').order('lido_em', { ascending: false }).limit(100);
    if (unknownOnly) {
      query = query.eq('acao', 'aluno_desconhecido');
    }
    const { data } = await query;
    setLogs((data as LogNFC[]) ?? []);
    setLoading(false);
  }, [unknownOnly]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Logs NFC</Text>
      </View>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Só cartões não cadastrados</Text>
        <Switch
          value={unknownOnly}
          onValueChange={setUnknownOnly}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma leitura registrada.</Text>}
          renderItem={({ item }) => (
            <AdminListCard
              title={item.uid_cartao}
              subtitle={`${item.uid_totem} · ${item.lido_em ? formatDateTime(item.lido_em) : '—'}`}
              badge={item.acao ?? '—'}
              badgeTone={
                item.acao === 'aluno_desconhecido'
                  ? 'danger'
                  : item.acao === 'identificacao'
                    ? 'success'
                    : 'default'
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.primaryVeryDark, flex: 1 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  filterLabel: { fontSize: 14, color: colors.textMuted },
  list: { padding: 16, paddingTop: 0 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24 },
});
