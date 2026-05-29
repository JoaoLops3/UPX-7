import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import { supabase } from '../../lib/supabase';
import type { AdminTabScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import { border, textInputWeb } from '../../theme/ui';
import type { Aluno } from '../../types/database';
import { maskNfcUid } from '../../utils/nfcUid';

type Props = AdminTabScreenProps<'AdminAlunos'>;

export default function AdminAlunosScreen({ navigation }: Props) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('alunos').select('*').order('nome');
    setAlunos((data as Aluno[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alunos;
    return alunos.filter(
      (aluno) =>
        aluno.ra.toLowerCase().includes(q) ||
        aluno.nome.toLowerCase().includes(q) ||
        aluno.email.toLowerCase().includes(q),
    );
  }, [alunos, search]);

  if (loading) return <LoadingView />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Alunos</Text>
        <Text style={styles.sub}>Toque no aluno para ver detalhes, multas e NFC</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.inactive} accessibilityElementsHidden />
        <TextInput
          style={[styles.searchInput, textInputWeb]}
          value={search}
          onChangeText={setSearch}
          placeholder="000000"
          placeholderTextColor={colors.inactive}
          keyboardType="number-pad"
          autoCorrect={false}
          accessibilityLabel="Buscar aluno por RA"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Limpar busca">
            <Ionicons name="close-circle" size={18} color={colors.inactive} accessibilityElementsHidden />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.count}>
        {filtered.length} {filtered.length === 1 ? 'aluno' : 'alunos'}
        {search.trim() ? ` · busca "${search.trim()}"` : ''}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum aluno encontrado para este RA.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AdminAlunoDetail', { alunoId: item.id })}
            style={({ pressed }) => [pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Abrir perfil de ${item.nome}`}
          >
            <AdminListCard
              title={item.nome}
              subtitle={`RA ${item.ra} · ${item.email}${item.uid_nfc ? ` · NFC ${maskNfcUid(item.uid_nfc)}` : ''}`}
              badge={item.ativo ? 'Ativo' : 'Inativo'}
              badgeTone={item.ativo ? 'success' : 'danger'}
              showChevron
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryVeryDark,
  },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 12,
    backgroundColor: colors.white,
    ...border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryVeryDark,
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  count: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  cardPressed: { opacity: 0.92 },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
