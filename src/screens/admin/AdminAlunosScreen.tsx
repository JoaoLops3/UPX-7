import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import { supabase } from '../../lib/supabase';
import type { AdminTabScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import { border, textInputWeb } from '../../theme/ui';
import type { Aluno } from '../../types/database';
import { maskNfcUid, normalizeNfcUid } from '../../utils/nfcUid';

type Props = AdminTabScreenProps<'AdminAlunos'>;

export default function AdminAlunosScreen(_props: Props) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAluno, setEditAluno] = useState<Aluno | null>(null);
  const [editUid, setEditUid] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const openEditUid = (aluno: Aluno) => {
    setEditAluno(aluno);
    setEditUid(aluno.uid_nfc ?? '');
    setEditError(null);
  };

  const closeEditUid = () => {
    setEditAluno(null);
    setEditUid('');
    setEditError(null);
  };

  const saveUid = async () => {
    if (!editAluno) return;
    setEditError(null);
    const normalized = editUid.trim() ? normalizeNfcUid(editUid) : null;
    if (normalized && !/^[0-9A-F]+$/.test(normalized)) {
      setEditError('UID inválido — use apenas hex (0-9, A-F).');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('alunos')
      .update({ uid_nfc: normalized })
      .eq('id', editAluno.id);
    setSaving(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    closeEditUid();
    void load();
  };

  const onAlunoPress = (aluno: Aluno) => {
    Alert.alert(aluno.nome, `RA ${aluno.ra}`, [
      { text: 'Editar UID NFC', onPress: () => openEditUid(aluno) },
      {
        text: aluno.ativo ? 'Desativar' : 'Reativar',
        onPress: () => toggleAtivo(aluno),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Alunos</Text>
      <Text style={styles.sub}>Toque para editar NFC ou ativar/desativar</Text>
      <FlatList
        data={alunos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => onAlunoPress(item)} accessibilityLabel={item.nome}>
            <AdminListCard
              title={item.nome}
              subtitle={`RA ${item.ra} · ${item.email}${item.uid_nfc ? ` · NFC ${maskNfcUid(item.uid_nfc)}` : ' · sem NFC'}`}
              badge={item.ativo ? 'Ativo' : 'Inativo'}
              badgeTone={item.ativo ? 'success' : 'danger'}
            />
          </Pressable>
        )}
      />

      <Modal visible={!!editAluno} transparent animationType="fade" onRequestClose={closeEditUid}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>UID NFC</Text>
            <Text style={styles.modalSub}>{editAluno?.nome}</Text>
            <TextInput
              style={[styles.input, textInputWeb]}
              value={editUid}
              onChangeText={setEditUid}
              placeholder="Ex: 312FAF97"
              placeholderTextColor={colors.inactive}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.modalHint}>Deixe vazio para remover o vínculo.</Text>
            {editError ? <Text style={styles.modalError}>{editError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={closeEditUid} style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveUid()}
                style={[styles.modalBtnPrimary, saving && { opacity: 0.7 }]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    ...border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryVeryDark },
  modalSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.primaryVeryDark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalHint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  modalError: { fontSize: 13, color: colors.dangerText, marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    ...border,
  },
  modalBtnSecondaryText: { fontWeight: '600', color: colors.textMuted },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalBtnPrimaryText: { fontWeight: '600', color: colors.white },
});
