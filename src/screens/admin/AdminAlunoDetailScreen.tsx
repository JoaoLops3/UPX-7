import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '../../components/BackButton';
import { AdminListCard } from '../../components/admin/AdminListCard';
import { LoadingView } from '../../components/LoadingView';
import {
  removeMultaAlert,
  upsertPaidMultaAlert,
  upsertPendingMultaAlert,
} from '../../lib/adminMultaAlerts';
import { calcularValorMulta, formatMultaCalculo, formatValorMulta } from '../../lib/multaCalculo';
import { supabase } from '../../lib/supabase';
import type { AdminStackScreenProps } from '../../navigation/adminTypes';
import { colors } from '../../theme/colors';
import { border, card, textInputWeb } from '../../theme/ui';
import type { Aluno, MultaComAluguel } from '../../types/database';
import { formatDateTime } from '../../utils/dates';
import { getInitials } from '../../utils/initials';
import { maskNfcUid, normalizeNfcUid } from '../../utils/nfcUid';
import { showAlert, showConfirm } from '../../utils/alert';

type Props = AdminStackScreenProps<'AdminAlunoDetail'>;

export default function AdminAlunoDetailScreen({ navigation, route }: Props) {
  const { alunoId } = route.params;
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [multas, setMultas] = useState<MultaComAluguel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMulta, setShowAddMulta] = useState(false);
  const [diasInput, setDiasInput] = useState('3');
  const [itemLabel, setItemLabel] = useState('Guarda-chuva');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showNfcModal, setShowNfcModal] = useState(false);
  const [nfcInput, setNfcInput] = useState('');
  const [selectedMulta, setSelectedMulta] = useState<MultaComAluguel | null>(null);
  const [multaActionLoading, setMultaActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [alunoRes, multasRes] = await Promise.all([
      supabase.from('alunos').select('*').eq('id', alunoId).maybeSingle(),
      supabase
        .from('multas')
        .select('*, alugueis(*, itens(nome, numero))')
        .eq('aluno_id', alunoId)
        .order('gerada_em', { ascending: false }),
    ]);
    setAluno((alunoRes.data as Aluno) ?? null);
    setMultas((multasRes.data as MultaComAluguel[]) ?? []);
    setLoading(false);
  }, [alunoId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleAtivo = async () => {
    if (!aluno) return;
    const next = !aluno.ativo;
    const ok = await showConfirm(aluno.nome, next ? 'Reativar aluno' : 'Desativar aluno');
    if (!ok) return;
    await supabase.from('alunos').update({ ativo: next }).eq('id', aluno.id);
    void load();
  };

  const editNfc = () => {
    if (!aluno) return;
    setNfcInput(aluno.uid_nfc ?? '');
    setShowNfcModal(true);
  };

  const confirmNfc = async () => {
    await saveNfc(nfcInput);
    setShowNfcModal(false);
  };

  const saveNfc = async (raw: string) => {
    if (!aluno) return;
    const normalized = raw.trim() ? normalizeNfcUid(raw) : null;
    if (normalized && !/^[0-9A-F]+$/.test(normalized)) {
      showAlert('UID inválido', 'Use apenas caracteres hex (0-9, A-F).');
      return;
    }
    const { error } = await supabase
      .from('alunos')
      .update({ uid_nfc: normalized })
      .eq('id', aluno.id);
    if (error) {
      showAlert('Erro', error.message);
      return;
    }
    void load();
  };

  const addMulta = async () => {
    setAddError(null);
    const dias = parseInt(diasInput.trim(), 10);
    if (!Number.isFinite(dias) || dias <= 0) {
      setAddError('Informe os dias de atraso (número maior que zero).');
      return;
    }
    const valor = calcularValorMulta(dias);
    const geradaEm = new Date().toISOString();
    setSaving(true);
    const { data, error } = await supabase
      .from('multas')
      .insert({
        aluno_id: alunoId,
        dias_atraso: dias,
        valor,
        status: 'pendente',
        gerada_em: geradaEm,
      })
      .select('id, dias_atraso, gerada_em')
      .single();
    setSaving(false);
    if (error || !data) {
      setAddError(error?.message ?? 'Não foi possível criar a multa.');
      return;
    }
    await upsertPendingMultaAlert(alunoId, {
      id: data.id,
      dias_atraso: dias,
      gerada_em: geradaEm,
      itemNome: itemLabel.trim() || 'item',
    });
    setShowAddMulta(false);
    setDiasInput('3');
    void load();
  };

  const marcarPaga = async (multa: MultaComAluguel) => {
    if (multa.status === 'pago' || multaActionLoading) return;
    const ok = await showConfirm(
      `Confirmar pagamento de R$ ${formatValorMulta(Number(multa.valor))}?`,
      'Marcar como paga',
    );
    if (!ok) return;

    setMultaActionLoading(true);
    const pagoEm = new Date().toISOString();
    const { error } = await supabase
      .from('multas')
      .update({ status: 'pago', pago_em: pagoEm })
      .eq('id', multa.id);
    if (error) {
      setMultaActionLoading(false);
      showAlert('Erro', error.message);
      return;
    }
    await upsertPaidMultaAlert(alunoId, {
      id: multa.id,
      dias_atraso: multa.dias_atraso,
      gerada_em: multa.gerada_em ?? pagoEm,
      itemNome: multaItemNome(multa),
    });
    setMultaActionLoading(false);
    setSelectedMulta(null);
    void load();
  };

  const removerMulta = async (multa: MultaComAluguel) => {
    if (multaActionLoading) return;
    const ok = await showConfirm(
      'A multa será excluída do sistema e sumirá do perfil e das notificações do aluno.',
      'Remover multa',
    );
    if (!ok) return;

    setMultaActionLoading(true);
    const { error } = await supabase.from('multas').delete().eq('id', multa.id);
    if (error) {
      setMultaActionLoading(false);
      showAlert('Erro', error.message);
      return;
    }
    await removeMultaAlert(alunoId, multa.id);
    setMultaActionLoading(false);
    setSelectedMulta(null);
    void load();
  };

  if (loading || !aluno) return <LoadingView />;

  const pendentes = multas.filter((m) => m.status === 'pendente');
  const totalPendente = pendentes.reduce((sum, m) => sum + calcularValorMulta(m.dias_atraso ?? 0), 0);

  const listHeader = (
    <>
      <BackButton onPress={() => navigation.goBack()} style={styles.back} />

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(aluno.nome)}</Text>
        </View>
        <View style={styles.profileBody}>
          <Text style={styles.nome}>{aluno.nome}</Text>
          <Text style={styles.meta}>RA {aluno.ra}</Text>
          <Text style={styles.meta}>{aluno.email}</Text>
          <Text style={styles.meta}>
            NFC {aluno.uid_nfc ? maskNfcUid(aluno.uid_nfc) : 'não vinculado'}
          </Text>
        </View>
        <View style={[styles.statusPill, aluno.ativo ? styles.statusAtivo : styles.statusInativo]}>
          <Text style={[styles.statusText, aluno.ativo ? styles.statusAtivoText : styles.statusInativoText]}>
            {aluno.ativo ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statValue}>{pendentes.length}</Text>
          <Text style={styles.statLabel}>Multas pendentes</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={[styles.statValue, pendentes.length > 0 && styles.statDanger]}>
            R$ {totalPendente.toFixed(2).replace('.', ',')}
          </Text>
          <Text style={styles.statLabel}>Total pendente</Text>
        </View>
      </View>

      <View style={styles.actionsBlock}>
        <View style={styles.actionsRow}>
          <ActionChip icon="add-circle-outline" label="Nova multa" onPress={() => setShowAddMulta(true)} />
          <ActionChip icon="card-outline" label="Editar NFC" onPress={editNfc} />
        </View>
        <ActionChip
          icon={aluno.ativo ? 'person-remove-outline' : 'person-add-outline'}
          label={aluno.ativo ? 'Desativar aluno' : 'Reativar aluno'}
          onPress={() => void toggleAtivo()}
          fullWidth
          tone={aluno.ativo ? 'danger' : 'default'}
        />
      </View>

      <Text style={styles.sectionTitle}>Multas do aluno</Text>
      <Text style={styles.sectionSub}>
        Toque em uma multa para ver detalhes, marcar como paga ou remover
      </Text>
    </>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={multas}
        keyExtractor={(item) => item.id}
        renderItem={({ item: multa }) => {
          const itemNome = multaItemNome(multa);
          const isPendente = multa.status === 'pendente';
          return (
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.92 }]}
              onPress={() => setSelectedMulta(multa)}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes da multa ${itemNome}`}
            >
              <AdminListCard
                title={itemNome}
                subtitle={`${multa.dias_atraso} dia(s) · ${formatDateTime(multa.gerada_em ?? new Date().toISOString())}`}
                badge={`R$ ${formatValorMulta(Number(multa.valor))} · ${multa.status}`}
                badgeTone={isPendente ? 'danger' : 'success'}
                showChevron
              />
            </Pressable>
          );
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhuma multa registrada para este aluno.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      />
      <Modal visible={showAddMulta} transparent animationType="fade" onRequestClose={() => setShowAddMulta(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nova multa</Text>
            <Text style={styles.modalSub}>{aluno.nome} · RA {aluno.ra}</Text>

            <Text style={styles.inputLabel}>Dias de atraso</Text>
            <TextInput
              style={[styles.input, textInputWeb]}
              value={diasInput}
              onChangeText={setDiasInput}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={colors.inactive}
            />

            <Text style={styles.inputLabel}>Descrição do item</Text>
            <TextInput
              style={[styles.input, textInputWeb]}
              value={itemLabel}
              onChangeText={setItemLabel}
              placeholder="Guarda-chuva #10"
              placeholderTextColor={colors.inactive}
            />

            <Text style={styles.preview}>
              Valor: R$ {calcularValorMulta(parseInt(diasInput, 10) || 0).toFixed(2).replace('.', ',')}
            </Text>
            <Text style={styles.modalHint}>O aluno receberá um aviso na aba Notificações.</Text>
            {addError ? <Text style={styles.modalError}>{addError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAddMulta(false)} style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => void addMulta()}
                style={[styles.modalBtnPrimary, saving && { opacity: 0.7 }]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Criar multa</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNfcModal} transparent animationType="fade" onRequestClose={() => setShowNfcModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>UID NFC</Text>
            <Text style={styles.modalSub}>Deixe vazio para remover o vínculo do cartão.</Text>
            <TextInput
              style={[styles.input, textInputWeb]}
              value={nfcInput}
              onChangeText={setNfcInput}
              placeholder="Ex.: A1B2C3D4"
              placeholderTextColor={colors.inactive}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowNfcModal(false)} style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => void confirmNfc()} style={styles.modalBtnPrimary}>
                <Text style={styles.modalBtnPrimaryText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedMulta !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMulta(null)}
      >
        {selectedMulta ? (
          <View style={styles.modalBackdrop}>
            <View style={styles.detailModalCard}>
              <Text style={styles.modalTitle}>{multaItemNome(selectedMulta)}</Text>
              <Text style={styles.modalSub}>
                {aluno.nome} · RA {aluno.ra}
              </Text>

              <View style={styles.detailBadgeRow}>
                <View
                  style={[
                    styles.detailStatusPill,
                    selectedMulta.status === 'pendente' ? styles.detailPending : styles.detailPaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.detailStatusText,
                      selectedMulta.status === 'pendente' ? styles.detailPendingText : styles.detailPaidText,
                    ]}
                  >
                    {selectedMulta.status === 'pendente' ? 'Pendente' : 'Paga'}
                  </Text>
                </View>
                <Text style={styles.detailValor}>R$ {formatValorMulta(Number(selectedMulta.valor))}</Text>
              </View>

              <View style={styles.detailBody}>
                <DetailLine label="Dias de atraso" value={`${selectedMulta.dias_atraso} dia(s)`} />
                <DetailLine
                  label="Cálculo"
                  value={formatMultaCalculo(selectedMulta.dias_atraso ?? 0)}
                />
                <DetailLine
                  label="Gerada em"
                  value={formatDateTime(selectedMulta.gerada_em ?? '—')}
                />
                {selectedMulta.pago_em ? (
                  <DetailLine label="Paga em" value={formatDateTime(selectedMulta.pago_em)} />
                ) : null}
                {selectedMulta.alugueis?.inicio ? (
                  <DetailLine label="Aluguel iniciou" value={formatDateTime(selectedMulta.alugueis.inicio)} />
                ) : null}
                {selectedMulta.alugueis?.fim_previsto ? (
                  <DetailLine
                    label="Devolver até"
                    value={formatDateTime(selectedMulta.alugueis.fim_previsto)}
                  />
                ) : null}
                {selectedMulta.alugueis?.fim_real ? (
                  <DetailLine label="Devolvido em" value={formatDateTime(selectedMulta.alugueis.fim_real)} />
                ) : null}
                {selectedMulta.alugueis?.itens?.numero != null ? (
                  <DetailLine
                    label="Item"
                    value={`${selectedMulta.alugueis.itens.nome} #${selectedMulta.alugueis.itens.numero}`}
                  />
                ) : null}
              </View>

              <View style={styles.detailActions}>
                {selectedMulta.status === 'pendente' ? (
                  <Pressable
                    onPress={() => void marcarPaga(selectedMulta)}
                    style={({ pressed }) => [
                      styles.modalBtnPrimary,
                      styles.modalBtnClickable,
                      multaActionLoading && styles.modalBtnDisabled,
                      pressed && !multaActionLoading && styles.modalBtnPressed,
                    ]}
                    disabled={multaActionLoading}
                    accessibilityRole="button"
                  >
                    {multaActionLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.modalBtnPrimaryText}>Marcar como paga</Text>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void removerMulta(selectedMulta)}
                  style={({ pressed }) => [
                    styles.modalBtnDanger,
                    styles.modalBtnClickable,
                    multaActionLoading && styles.modalBtnDisabled,
                    pressed && !multaActionLoading && styles.modalBtnPressed,
                  ]}
                  disabled={multaActionLoading}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalBtnDangerText}>Remover multa</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedMulta(null)}
                  style={({ pressed }) => [
                    styles.modalBtnSecondary,
                    styles.modalBtnClickable,
                    multaActionLoading && styles.modalBtnDisabled,
                    pressed && !multaActionLoading && styles.modalBtnPressed,
                  ]}
                  disabled={multaActionLoading}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalBtnSecondaryText}>Fechar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function multaItemNome(multa: MultaComAluguel): string {
  const item = multa.alugueis?.itens;
  if (item?.nome && item.numero != null) return `${item.nome} #${item.numero}`;
  if (item?.nome) return item.nome;
  return 'Multa administrativa';
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  fullWidth,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  fullWidth?: boolean;
  tone?: 'default' | 'danger';
}) {
  const iconColor = tone === 'danger' ? colors.dangerText : colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionChip,
        fullWidth && styles.actionChipFull,
        tone === 'danger' && styles.actionChipDanger,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text style={[styles.actionChipText, tone === 'danger' && styles.actionChipTextDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  list: { padding: 16, paddingBottom: 72, flexGrow: 1 },
  back: { marginBottom: 12 },
  profileCard: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  profileBody: { flex: 1, minWidth: 0 },
  nome: { fontSize: 18, fontWeight: '700', color: colors.primaryVeryDark },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusAtivo: { backgroundColor: colors.successBg },
  statusInativo: { backgroundColor: colors.dangerBg },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusAtivoText: { color: colors.successText },
  statusInativoText: { color: colors.dangerText },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statChip: {
    flex: 1,
    ...card,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
  statDanger: { color: colors.dangerText },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  actionsBlock: { gap: 8, marginBottom: 16 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    ...border,
    ...card,
  },
  actionChipFull: {
    flex: undefined,
    width: '100%',
  },
  actionChipDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: '#fecaca',
  },
  actionChipText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  actionChipTextDanger: { color: colors.dangerText },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.primaryVeryDark },
  sectionSub: { fontSize: 12, color: colors.textMuted, marginBottom: 10, marginTop: 4 },
  emptyBox: {
    ...card,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  detailModalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
    ...border,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailStatusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  detailPending: { backgroundColor: colors.dangerBg },
  detailPaid: { backgroundColor: colors.successBg },
  detailStatusText: { fontSize: 12, fontWeight: '700' },
  detailPendingText: { color: colors.dangerText },
  detailPaidText: { color: colors.successText },
  detailValor: { fontSize: 22, fontWeight: '700', color: colors.primaryVeryDark },
  detailBody: { gap: 10, marginBottom: 8 },
  detailLine: { gap: 2 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: colors.primaryVeryDark, lineHeight: 20 },
  detailActions: { gap: 8, marginTop: 16 },
  modalBtnDanger: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  modalBtnDangerText: { fontWeight: '600', color: colors.dangerText },
  modalBtnClickable: Platform.OS === 'web' ? { cursor: 'pointer' } : {},
  modalBtnDisabled: { opacity: 0.7 },
  modalBtnPressed: { opacity: 0.88 },
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
  modalSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: colors.primaryDark, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.primaryVeryDark,
    marginBottom: 12,
  },
  preview: { fontSize: 14, fontWeight: '600', color: colors.primaryVeryDark },
  modalHint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
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
