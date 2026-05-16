import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingView } from '../../components/LoadingView';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../lib/supabase';
import type { AdminTabScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import { card } from '../../theme/ui';

type Props = AdminTabScreenProps<'AdminHome'>;

type Stats = {
  alugueisAtivos: number;
  itensIndisponiveis: number;
  multasPendentes: number;
  alunosAtivos: number;
};

export default function AdminDashboardScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const { admin } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [alugueis, itens, multas, alunos] = await Promise.all([
      supabase.from('alugueis').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('itens').select('id', { count: 'exact', head: true }).eq('disponivel', false),
      supabase.from('multas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('ativo', true),
    ]);
    setStats({
      alugueisAtivos: alugueis.count ?? 0,
      itensIndisponiveis: itens.count ?? 0,
      multasPendentes: multas.count ?? 0,
      alunosAtivos: alunos.count ?? 0,
    });
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading || !stats) return <LoadingView />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Painel administrativo</Text>
          <Text style={styles.title}>Olá, {admin?.nome?.split(' ')[0] ?? 'admin'}</Text>
        </View>
        <Pressable onPress={() => void signOut()} style={styles.logoutBtn} accessibilityLabel="Sair">
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <StatBox
          label="Aluguéis ativos"
          value={String(stats.alugueisAtivos)}
          onPress={() => navigation.navigate('AdminAlugueis')}
        />
        <StatBox
          label="Itens em uso"
          value={String(stats.itensIndisponiveis)}
          onPress={() => navigation.navigate('AdminItens')}
        />
        <StatBox
          label="Multas pendentes"
          value={String(stats.multasPendentes)}
          onPress={() => navigation.navigate('AdminMultas')}
        />
        <StatBox
          label="Alunos ativos"
          value={String(stats.alunosAtivos)}
          onPress={() => navigation.navigate('AdminAlunos')}
        />
      </View>

      <Text style={styles.hint}>
        Use as abas abaixo para gerenciar aluguéis, itens, alunos e multas do campus.
      </Text>
    </ScrollView>
  );
}

function StatBox({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statBox, pressed && styles.statPressed]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  eyebrow: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    ...card,
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    padding: 14,
  },
  statPressed: { backgroundColor: colors.background },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.primaryDark },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 20, lineHeight: 20 },
});
