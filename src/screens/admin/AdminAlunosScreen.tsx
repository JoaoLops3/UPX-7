import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import { supabase } from '../../lib/supabase';
import type { AdminTabScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import type { Aluno } from '../../types/database';

type Props = AdminTabScreenProps<'AdminAlunos'>;

export default function AdminAlunosScreen(_props: Props) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toggleAtivo = (aluno: Aluno) => {
    const next = !aluno.ativo;
    Alert.alert(
      next ? 'Reativar aluno' : 'Desativar aluno',
      `${aluno.nome} (${aluno.ra})`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await supabase.from('alunos').update({ ativo: next }).eq('id', aluno.id);
            void load();
          },
        },
      ],
    );
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Alunos</Text>
      <Text style={styles.sub}>Inclui inativos · toque para ativar/desativar</Text>
      <FlatList
        data={alunos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => toggleAtivo(item)} accessibilityLabel={item.nome}>
            <AdminListCard
              title={item.nome}
              subtitle={`RA ${item.ra} · ${item.email}`}
              badge={item.ativo ? 'Ativo' : 'Inativo'}
              badgeTone={item.ativo ? 'success' : 'danger'}
            />
          </Pressable>
        )}
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
});
