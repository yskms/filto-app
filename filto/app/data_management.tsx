import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArticleRepository } from '@/repositories/ArticleRepository';

const STORAGE_KEY_ARTICLE_RETENTION_DAYS = '@filto/data_management/articleRetentionDays';
const STORAGE_KEY_DELETE_STARRED_IN_AUTO = '@filto/data_management/deleteStarredInAutoDelete';

const RETENTION_OPTIONS = [
  { value: 7, label: '7日' },
  { value: 30, label: '30日' },
  { value: 90, label: '90日' },
  { value: 0, label: '無制限' },
];

const MANUAL_DELETE_OPTIONS = [
  { value: -1, label: '全て削除' },
  { value: 1, label: '1日より古い記事' },
  { value: 3, label: '3日より古い記事' },
  { value: 7, label: '7日より古い記事' },
  { value: 14, label: '14日より古い記事' },
];

const DataManagementHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onPressBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={styles.backIcon}>←</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Data Management</Text>
    <View style={styles.headerRight} />
  </View>
);

const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const Dropdown: React.FC<{ label: string; value: string; onPress: () => void }> = ({ label, value, onPress }) => (
  <View>
    <Text style={styles.dropdownLabel}>{label}</Text>
    <TouchableOpacity style={styles.dropdown} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.dropdownValue}>{value}</Text>
      <Text style={styles.dropdownIcon}>▼</Text>
    </TouchableOpacity>
  </View>
);

const DropdownModal: React.FC<{
  visible: boolean;
  title: string;
  options: Array<{ value: number; label: string }>;
  selectedValue: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.dropdownModalContent}>
        <Text style={styles.dropdownModalTitle}>{title}</Text>
        <View style={styles.dropdownModalOptions}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.dropdownOption}
              onPress={() => { onSelect(opt.value); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownOptionText}>{opt.label}</Text>
              {selectedValue === opt.value && <Text style={styles.dropdownOptionCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

const ManualDeleteModal: React.FC<{
  visible: boolean;
  selectedDays: number;
  includeStarred: boolean;
  stats: { total: number; unread: number; read: number; starred: number } | null;
  onChangeDays: (days: number) => void;
  onChangeIncludeStarred: (value: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ visible, selectedDays, includeStarred, stats, onChangeDays, onChangeIncludeStarred, onConfirm, onCancel }) => {
  const hasTarget = stats && stats.total > 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>記事の手動削除</Text>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>削除する期間を選択:</Text>
            <ScrollView style={styles.radioScrollView} showsVerticalScrollIndicator={false}>
              {MANUAL_DELETE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.radioItem}
                  onPress={() => onChangeDays(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radio, selectedDays === opt.value && styles.radioSelected]}>
                    {selectedDays === opt.value && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.divider} />
            {stats && (
              <View style={styles.statsSection}>
                <Text style={styles.modalLabel}>削除対象:</Text>
                {hasTarget ? (
                  <View style={styles.statsContainer}>
                    <Text style={styles.modalInfo}>・未読: {stats.unread}件</Text>
                    <Text style={styles.modalInfo}>・既読: {stats.read}件</Text>
                    {stats.starred > 0 && <Text style={styles.modalInfo}>・お気に入り: {stats.starred}件</Text>}
                  </View>
                ) : (
                  <Text style={styles.modalInfo}>削除対象の記事はありません</Text>
                )}
                <TouchableOpacity
                  style={[styles.checkboxRow, !hasTarget && styles.checkboxRowDisabled]}
                  onPress={() => hasTarget && onChangeIncludeStarred(!includeStarred)}
                  activeOpacity={hasTarget ? 0.7 : 1}
                  disabled={!hasTarget}
                >
                  <View style={[styles.checkbox, includeStarred && styles.checkboxChecked, !hasTarget && styles.checkboxDisabled]}>
                    {includeStarred && hasTarget && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.checkboxLabel, !hasTarget && styles.checkboxLabelDisabled]}>お気に入りも削除</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.modalButtonTextCancel}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={onConfirm}
              activeOpacity={0.7}
              disabled={!hasTarget}
            >
              <Text style={[styles.modalButtonTextConfirm, !hasTarget && styles.modalButtonTextDisabled]}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ComingSoonRow: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.comingSoonRow}>
    <Text style={styles.comingSoonRowText}>{title}</Text>
    <Text style={styles.comingSoonBadge}>今後対応予定</Text>
  </View>
);

export default function DataManagementScreen() {
  const router = useRouter();
  const [articleRetentionDays, setArticleRetentionDays] = useState(30);
  const [deleteStarredInAuto, setDeleteStarredInAuto] = useState(false);
  const [retentionDropdownVisible, setRetentionDropdownVisible] = useState(false);
  const [manualDeleteModalVisible, setManualDeleteModalVisible] = useState(false);
  const [manualDeleteDays, setManualDeleteDays] = useState(-1);
  const [manualDeleteIncludeStarred, setManualDeleteIncludeStarred] = useState(false);
  const [manualDeleteStats, setManualDeleteStats] = useState<{
    total: number;
    unread: number;
    read: number;
    starred: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const [savedRetention, savedStarred] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ARTICLE_RETENTION_DAYS),
        AsyncStorage.getItem(STORAGE_KEY_DELETE_STARRED_IN_AUTO),
      ]);
      if (savedRetention !== null) setArticleRetentionDays(parseInt(savedRetention, 10));
      if (savedStarred !== null) setDeleteStarredInAuto(savedStarred === 'true');
    } catch (e) {
      console.error('Failed to load data management settings:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const handleChangeRetentionDays = async (days: number) => {
    try {
      setArticleRetentionDays(days);
      await AsyncStorage.setItem(STORAGE_KEY_ARTICLE_RETENTION_DAYS, days.toString());
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const handleToggleDeleteStarredInAuto = async () => {
    try {
      const next = !deleteStarredInAuto;
      setDeleteStarredInAuto(next);
      await AsyncStorage.setItem(STORAGE_KEY_DELETE_STARRED_IN_AUTO, next.toString());
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const handleOpenManualDelete = async () => {
    try {
      const stats = await ArticleRepository.getOldArticlesStats(manualDeleteDays, manualDeleteIncludeStarred);
      setManualDeleteStats(stats);
      setManualDeleteModalVisible(true);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '削除対象の確認に失敗しました');
    }
  };

  const handleChangeManualDeleteDays = async (days: number) => {
    setManualDeleteDays(days);
    try {
      const stats = await ArticleRepository.getOldArticlesStats(days, manualDeleteIncludeStarred);
      setManualDeleteStats(stats);
    } catch (_) {}
  };

  const handleChangeManualDeleteIncludeStarred = async (value: boolean) => {
    setManualDeleteIncludeStarred(value);
    try {
      const stats = await ArticleRepository.getOldArticlesStats(manualDeleteDays, value);
      setManualDeleteStats(stats);
    } catch (_) {}
  };

  const handleConfirmManualDelete = async () => {
    if (!manualDeleteStats || manualDeleteStats.total === 0) {
      setManualDeleteModalVisible(false);
      return;
    }
    try {
      setIsDeleting(true);
      setManualDeleteModalVisible(false);
      const deletedCount = await ArticleRepository.deleteOldArticles(manualDeleteDays, manualDeleteIncludeStarred);
      Alert.alert('完了', `${deletedCount}件の記事を削除しました`);
      setManualDeleteDays(-1);
      setManualDeleteIncludeStarred(false);
      setManualDeleteStats(null);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '記事の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelManualDelete = () => {
    setManualDeleteModalVisible(false);
    setManualDeleteDays(-1);
    setManualDeleteIncludeStarred(false);
  };

  const getRetentionLabel = () => RETENTION_OPTIONS.find((o) => o.value === articleRetentionDays)?.label ?? '30日';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <DataManagementHeader onPressBack={() => router.back()} />

      {isDeleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>削除中...</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        <SettingSection title="記事保持期間">
          <View style={styles.retentionDescription}>
            <Text style={styles.retentionDescriptionText}>
              設定した期間より古い記事は同期時に自動的に削除されます
            </Text>
            <TouchableOpacity style={styles.toggleRow} onPress={handleToggleDeleteStarredInAuto} activeOpacity={0.7}>
              <Text style={styles.toggleLabelText}>お気に入りも削除</Text>
              <View style={[styles.toggle, deleteStarredInAuto && styles.toggleActive]}>
                <View style={[styles.toggleThumb, deleteStarredInAuto && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
          <Dropdown label="保持期間" value={getRetentionLabel()} onPress={() => setRetentionDropdownVisible(true)} />
        </SettingSection>

        <SettingSection title="手動削除オプション">
          <TouchableOpacity style={styles.manualDeleteRow} onPress={handleOpenManualDelete} activeOpacity={0.7}>
            <Text style={styles.manualDeleteText}>記事を今すぐ削除</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </SettingSection>

        <SettingSection title="WiFi時のみ取得">
          <ComingSoonRow title="WiFi接続時のみRSSを取得" />
        </SettingSection>

        <SettingSection title="最低更新間隔">
          <ComingSoonRow title="連打防止の最低更新間隔" />
        </SettingSection>

        <SettingSection title="（将来）">
          <ComingSoonRow title="OPML Import / Export" />
          <View style={styles.comingSoonDivider} />
          <ComingSoonRow title="データのバックアップ / 復元" />
        </SettingSection>
      </ScrollView>

      <DropdownModal
        visible={retentionDropdownVisible}
        title="保持期間を選択"
        options={RETENTION_OPTIONS}
        selectedValue={articleRetentionDays}
        onSelect={handleChangeRetentionDays}
        onClose={() => setRetentionDropdownVisible(false)}
      />

      <ManualDeleteModal
        visible={manualDeleteModalVisible}
        selectedDays={manualDeleteDays}
        includeStarred={manualDeleteIncludeStarred}
        stats={manualDeleteStats}
        onChangeDays={handleChangeManualDeleteDays}
        onChangeIncludeStarred={handleChangeManualDeleteIncludeStarred}
        onConfirm={handleConfirmManualDelete}
        onCancel={handleCancelManualDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backIcon: { fontSize: 24, color: '#1976d2' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerRight: { width: 24 },
  content: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabelText: { fontSize: 14, color: '#000' },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: '#1976d2' },
  toggleThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  retentionDescription: { marginBottom: 16 },
  retentionDescriptionText: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 12 },
  dropdownLabel: { fontSize: 14, fontWeight: '500', color: '#666', marginBottom: 8 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  dropdownValue: { fontSize: 16, color: '#000' },
  dropdownIcon: { fontSize: 12, color: '#666' },
  manualDeleteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  manualDeleteText: { fontSize: 16, color: '#000' },
  arrow: { fontSize: 20, color: '#666' },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  comingSoonRowText: { fontSize: 14, color: '#000' },
  comingSoonBadge: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  comingSoonDivider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%', maxWidth: 300 },
  dropdownModalTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 16, textAlign: 'center' },
  dropdownModalOptions: { gap: 4 },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionText: { fontSize: 16, color: '#000' },
  dropdownOptionCheck: { fontSize: 18, color: '#1976d2', fontWeight: '600' },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    height: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 16, textAlign: 'center' },
  modalBody: { flex: 1 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  radioScrollView: { maxHeight: 180, marginBottom: 8 },
  radioItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: '#1976d2' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1976d2' },
  radioLabel: { fontSize: 14, color: '#000' },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 12 },
  statsSection: {},
  statsContainer: { marginBottom: 8 },
  modalInfo: { fontSize: 14, color: '#666', marginBottom: 4, paddingLeft: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkboxRowDisabled: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  checkboxDisabled: { backgroundColor: '#f0f0f0', borderColor: '#e0e0e0' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '600' },
  checkboxLabel: { fontSize: 14, color: '#000' },
  checkboxLabelDisabled: { color: '#999' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#f0f0f0' },
  modalButtonConfirm: { backgroundColor: '#ff3b30' },
  modalButtonTextCancel: { fontSize: 16, fontWeight: '500', color: '#000' },
  modalButtonTextConfirm: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalButtonTextDisabled: { opacity: 0.5 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#fff', fontWeight: '500' },
});
