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
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

const STORAGE_KEY_ARTICLE_RETENTION_DAYS = '@filto/data_management/articleRetentionDays';
const STORAGE_KEY_DELETE_STARRED_IN_AUTO = '@filto/data_management/deleteStarredInAutoDelete';

const RETENTION_OPTIONS = [7, 30, 90, 0];
const MANUAL_DELETE_OPTIONS = [-1, 1, 3, 7, 14];

const DataManagementHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>{t('dataManagement.title')}</ThemedText>
      <View style={styles.headerRight} />
    </View>
  );
};

const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={[styles.sectionContent, { backgroundColor }]}>{children}</View>
    </View>
  );
};

const Dropdown: React.FC<{ label: string; value: string; onPress: () => void }> = ({
  label,
  value,
  onPress,
}) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View>
      <ThemedText style={styles.dropdownLabel}>{label}</ThemedText>
      <TouchableOpacity
        style={[styles.dropdown, { borderColor, backgroundColor }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.dropdownValue}>{value}</ThemedText>
        <ThemedText style={styles.dropdownIcon}>▼</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const DropdownModal: React.FC<{
  visible: boolean;
  title: string;
  options: Array<{ value: number; label: string }>;
  selectedValue: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onClose }) => {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.dropdownModalContent, { backgroundColor }]}>
          <ThemedText style={styles.dropdownModalTitle}>{title}</ThemedText>
          <View style={styles.dropdownModalOptions}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.dropdownOptionText}>{opt.label}</ThemedText>
                {selectedValue === opt.value && (
                  <ThemedText style={styles.dropdownOptionCheck}>✓</ThemedText>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const ManualDeleteModal: React.FC<{
  visible: boolean;
  selectedDays: number;
  includeStarred: boolean;
  stats: { total: number; unread: number; read: number; starred: number } | null;
  onChangeDays: (days: number) => void;
  onChangeIncludeStarred: (value: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  visible,
  selectedDays,
  includeStarred,
  stats,
  onChangeDays,
  onChangeIncludeStarred,
  onConfirm,
  onCancel,
}) => {
  const hasTarget = stats && stats.total > 0;
  const backgroundColor = useThemeColor({}, 'background');
  const { t } = useTranslation();
  const manualDeleteOptions = MANUAL_DELETE_OPTIONS.map((value) => ({
    value,
    label:
      value === -1
        ? t('dataManagement.manualDeleteAll')
        : t('dataManagement.manualDeleteOlderThan', { days: value }),
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <ThemedText style={styles.modalTitle}>{t('dataManagement.manualDeleteTitle')}</ThemedText>
          <View style={styles.modalBody}>
            <ThemedText style={styles.modalLabel}>{t('dataManagement.manualDeleteSelectPeriod')}</ThemedText>
            <ScrollView style={styles.radioScrollView} showsVerticalScrollIndicator={false}>
              {manualDeleteOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.radioItem}
                  onPress={() => onChangeDays(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radio, selectedDays === opt.value && styles.radioSelected]}>
                    {selectedDays === opt.value && <View style={styles.radioDot} />}
                  </View>
                  <ThemedText style={styles.radioLabel}>{opt.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.divider} />
            {stats && (
              <View style={styles.statsSection}>
                <ThemedText style={styles.modalLabel}>{t('dataManagement.manualDeleteTargets')}</ThemedText>
                {hasTarget ? (
                  <View style={styles.statsContainer}>
                    <ThemedText style={styles.modalInfo}>- {t('dataManagement.manualDeleteUnread', { count: stats.unread })}</ThemedText>
                    <ThemedText style={styles.modalInfo}>- {t('dataManagement.manualDeleteRead', { count: stats.read })}</ThemedText>
                    {stats.starred > 0 && (
                      <ThemedText style={styles.modalInfo}>- {t('dataManagement.manualDeleteStarred', { count: stats.starred })}</ThemedText>
                    )}
                  </View>
                ) : (
                  <ThemedText style={styles.modalInfo}>{t('dataManagement.manualDeleteNoTargets')}</ThemedText>
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
                  <ThemedText
                    style={[styles.checkboxLabel, !hasTarget && styles.checkboxLabelDisabled]}
                  >
                    {t('dataManagement.deleteStarredToo')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={onCancel} activeOpacity={0.7}>
            <ThemedText style={styles.modalButtonTextCancel}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={onConfirm}
              activeOpacity={0.7}
              disabled={!hasTarget}
            >
            <ThemedText
              style={[styles.modalButtonTextConfirm, !hasTarget && styles.modalButtonTextDisabled]}
            >
              {t('common.delete')}
            </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ComingSoonRow: React.FC<{ title: string }> = ({ title }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.comingSoonRow}>
      <ThemedText style={styles.comingSoonRowText}>{title}</ThemedText>
      <ThemedText style={styles.comingSoonBadge}>{t('dataManagement.comingSoon')}</ThemedText>
    </View>
  );
};

export default function DataManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleToggleDeleteStarredInAuto = async () => {
    try {
      const next = !deleteStarredInAuto;
      setDeleteStarredInAuto(next);
      await AsyncStorage.setItem(STORAGE_KEY_DELETE_STARRED_IN_AUTO, next.toString());
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleOpenManualDelete = async () => {
    try {
      const stats = await ArticleRepository.getOldArticlesStats(manualDeleteDays, manualDeleteIncludeStarred);
      setManualDeleteStats(stats);
      setManualDeleteModalVisible(true);
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('dataManagement.deleteError'));
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
      Alert.alert(t('common.done'), t('dataManagement.deleteComplete', { count: deletedCount }));
      setManualDeleteDays(-1);
      setManualDeleteIncludeStarred(false);
      setManualDeleteStats(null);
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('dataManagement.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelManualDelete = () => {
    setManualDeleteModalVisible(false);
    setManualDeleteDays(-1);
    setManualDeleteIncludeStarred(false);
  };

  const retentionOptions = RETENTION_OPTIONS.map((value) => ({
    value,
    label: value === 0 ? t('dataManagement.unlimited') : t('dataManagement.days', { count: value }),
  }));
  const getRetentionLabel = () =>
    retentionOptions.find((o) => o.value === articleRetentionDays)?.label ?? t('dataManagement.days', { count: 30 });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <DataManagementHeader onPressBack={() => router.back()} />

      {isDeleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976d2" />
          <ThemedText style={styles.loadingText}>{t('dataManagement.deleteInProgress')}</ThemedText>
        </View>
      )}

      <ScrollView style={styles.content}>
        <SettingSection title={t('dataManagement.articleRetention')}>
          <View style={styles.retentionDescription}>
            <ThemedText style={styles.retentionDescriptionText}>
              {t('dataManagement.retentionDescription')}
            </ThemedText>
            <TouchableOpacity style={styles.toggleRow} onPress={handleToggleDeleteStarredInAuto} activeOpacity={0.7}>
              <ThemedText style={styles.toggleLabelText}>{t('dataManagement.deleteStarredToo')}</ThemedText>
              <View style={[styles.toggle, deleteStarredInAuto && styles.toggleActive]}>
                <View style={[styles.toggleThumb, deleteStarredInAuto && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
          <Dropdown label={t('dataManagement.retentionPeriodLabel')} value={getRetentionLabel()} onPress={() => setRetentionDropdownVisible(true)} />
        </SettingSection>

        <SettingSection title={t('dataManagement.manualDeleteSection')}>
          <TouchableOpacity style={styles.manualDeleteRow} onPress={handleOpenManualDelete} activeOpacity={0.7}>
            <ThemedText style={styles.manualDeleteText}>{t('dataManagement.manualDeleteNow')}</ThemedText>
            <ThemedText style={styles.arrow}>›</ThemedText>
          </TouchableOpacity>
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionWifiOnly')}>
          <ComingSoonRow title={t('dataManagement.wifiOnlyRss')} />
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionMinRefresh')}>
          <ComingSoonRow title={t('dataManagement.minRefreshThrottle')} />
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionFuture')}>
          <ComingSoonRow title={t('dataManagement.opmlImportExport')} />
          <View style={styles.comingSoonDivider} />
          <ComingSoonRow title={t('dataManagement.dataBackupRestore')} />
        </SettingSection>
      </ScrollView>

      <DropdownModal
        visible={retentionDropdownVisible}
        title={t('dataManagement.selectRetentionTitle')}
        options={retentionOptions}
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backIcon: { fontSize: 24, color: '#1976d2' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerRight: { width: 24 },
  content: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: { borderRadius: 12, padding: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabelText: { fontSize: 14 },
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
  dropdownLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownValue: { fontSize: 16 },
  dropdownIcon: { fontSize: 12 },
  manualDeleteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  manualDeleteText: { fontSize: 16, color: '#000' },
  arrow: { fontSize: 20, color: '#666' },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  comingSoonRowText: { fontSize: 14 },
  comingSoonBadge: { fontSize: 12, fontStyle: 'italic' },
  comingSoonDivider: { height: 1, marginVertical: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModalContent: { borderRadius: 12, padding: 20, width: '80%', maxWidth: 300 },
  dropdownModalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  dropdownModalOptions: { gap: 4 },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionText: { fontSize: 16 },
  dropdownOptionCheck: { fontSize: 18, color: '#1976d2', fontWeight: '600' },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    height: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalBody: { flex: 1 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  radioScrollView: { maxHeight: 180, marginBottom: 8 },
  radioItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: '#1976d2' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1976d2' },
  radioLabel: { fontSize: 14 },
  divider: { height: 1, marginVertical: 12 },
  statsSection: {},
  statsContainer: { marginBottom: 8 },
  modalInfo: { fontSize: 14, marginBottom: 4, paddingLeft: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkboxRowDisabled: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {},
  checkboxDisabled: {},
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '600' },
  checkboxLabel: { fontSize: 14 },
  checkboxLabelDisabled: { opacity: 0.5 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonCancel: {},
  modalButtonConfirm: {},
  modalButtonTextCancel: { fontSize: 16, fontWeight: '500' },
  modalButtonTextConfirm: { fontSize: 16, fontWeight: '600' },
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
