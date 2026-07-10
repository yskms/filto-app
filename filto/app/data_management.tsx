import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '@/constants/storageKeys';
import { Ionicons } from '@expo/vector-icons';
import { ArticleRepository } from '@/repositories/ArticleRepository';
import { resetAllData } from '@/database/init';
import { restartOnboarding } from '@/utils/onboarding';
import { SyncService } from '@/services/SyncService';
import { OpmlService } from '@/services/OpmlService';
import {
  BackupService,
  type BackupData,
  type BackupImportMode,
  type BackupPickResult,
} from '@/services/BackupService';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { LoadingOverlay } from '@/components/LoadingOverlay';


const RETENTION_OPTIONS = [7, 30, 90, 0];
const MANUAL_DELETE_OPTIONS = [-1, 1, 3, 7, 14];
const MIN_REFRESH_OPTIONS = [0, 1, 3, 5, 10];

const DataManagementHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Ionicons name="chevron-back" size={26} color={iconColor} />
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
  const iconColor = useThemeColor({}, 'text');

  return (
    <View>
      <ThemedText style={styles.dropdownLabel}>{label}</ThemedText>
      <TouchableOpacity
        style={[styles.dropdown, { borderColor, backgroundColor }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.dropdownValue}>{value}</ThemedText>
        <Ionicons name="chevron-down" size={14} color={iconColor} />
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
  const tintColor = useThemeColor({}, 'tint');

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
                  <Ionicons name="checkmark" size={18} color={tintColor} />
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
  const hasStarredAvailable = stats && stats.starred > 0;
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
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
                  <View style={[styles.radio, selectedDays === opt.value && { borderColor: tintColor }]}>
                    {selectedDays === opt.value && <View style={[styles.radioDot, { backgroundColor: tintColor }]} />}
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
                  style={[styles.checkboxRow, !hasStarredAvailable && styles.checkboxRowDisabled]}
                  onPress={() => hasStarredAvailable && onChangeIncludeStarred(!includeStarred)}
                  activeOpacity={hasStarredAvailable ? 0.7 : 1}
                  disabled={!hasStarredAvailable}
                >
                  <View style={[styles.checkbox, includeStarred && hasStarredAvailable && { backgroundColor: tintColor, borderColor: tintColor }, !hasStarredAvailable && styles.checkboxDisabled]}>
                    {includeStarred && hasStarredAvailable && <Ionicons name="checkmark" size={14} color={backgroundColor} />}
                  </View>
                  <ThemedText
                    style={[styles.checkboxLabel, !hasStarredAvailable && styles.checkboxLabelDisabled]}
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

export default function DataManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const arrowColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const toggleOffBg = useThemeColor({ light: '#ccc', dark: '#555' }, 'background');
  const toggleOnBg = useThemeColor({ light: '#34C759', dark: '#30d158' }, 'background');
  const [articleRetentionDays, setArticleRetentionDays] = useState(30);
  const [deleteStarredInAuto, setDeleteStarredInAuto] = useState(false);
  const [wifiOnlyFetch, setWifiOnlyFetch] = useState(false);
  const [minRefreshInterval, setMinRefreshInterval] = useState(0);
  const [retentionDropdownVisible, setRetentionDropdownVisible] = useState(false);
  const [minRefreshDropdownVisible, setMinRefreshDropdownVisible] = useState(false);
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
  const [isResetting, setIsResetting] = useState(false);
  const [isOpmlBusy, setIsOpmlBusy] = useState(false);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [backupIncludeAllArticles, setBackupIncludeAllArticles] = useState(false);
  /** 二度押しの即時ガード。isBackupBusy は再レンダリングまで更新されないため併用する */
  const backupBusyRef = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      const [savedRetention, savedStarred, savedWifiOnly, savedMinRefresh] = await Promise.all([
        AsyncStorage.getItem(StorageKeys.articleRetentionDays),
        AsyncStorage.getItem(StorageKeys.deleteStarredInAutoDelete),
        AsyncStorage.getItem(StorageKeys.wifiOnlyFetch),
        AsyncStorage.getItem(StorageKeys.minRefreshIntervalMinutes),
      ]);
      if (savedRetention !== null) setArticleRetentionDays(parseInt(savedRetention, 10));
      if (savedStarred !== null) setDeleteStarredInAuto(savedStarred === 'true');
      if (savedWifiOnly !== null) setWifiOnlyFetch(savedWifiOnly === 'true');
      if (savedMinRefresh !== null) setMinRefreshInterval(parseInt(savedMinRefresh, 10));
    } catch (_) {
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const handleChangeRetentionDays = async (days: number) => {
    try {
      setArticleRetentionDays(days);
      await AsyncStorage.setItem(StorageKeys.articleRetentionDays, days.toString());
    } catch (_) {
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleChangeMinRefreshInterval = async (minutes: number) => {
    try {
      setMinRefreshInterval(minutes);
      await AsyncStorage.setItem(StorageKeys.minRefreshIntervalMinutes, minutes.toString());
    } catch (_) {
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleToggleDeleteStarredInAuto = async () => {
    try {
      const next = !deleteStarredInAuto;
      setDeleteStarredInAuto(next);
      await AsyncStorage.setItem(StorageKeys.deleteStarredInAutoDelete, next.toString());
    } catch (_) {
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleToggleWifiOnlyFetch = async () => {
    try {
      const next = !wifiOnlyFetch;
      setWifiOnlyFetch(next);
      await AsyncStorage.setItem(StorageKeys.wifiOnlyFetch, next.toString());
    } catch (_) {
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleOpenManualDelete = async () => {
    try {
      const stats = await ArticleRepository.getOldArticlesStats(manualDeleteDays, manualDeleteIncludeStarred);
      setManualDeleteStats(stats);
      setManualDeleteModalVisible(true);
    } catch (_) {
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
    } catch (_) {
      Alert.alert(t('common.error'), t('dataManagement.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportBackup = async () => {
    // state だけでは同じフレーム内の二度押しを止められない（handleImportBackup と同様）
    if (isBackupBusy || backupBusyRef.current) return;
    backupBusyRef.current = true;
    try {
      setIsBackupBusy(true);
      const result = await BackupService.exportToFile({ includeAllArticles: backupIncludeAllArticles });
      if (result.status === 'unavailable') {
        Alert.alert(t('dataManagement.backupExport'), t('dataManagement.shareUnavailable'));
      }
    } catch (_) {
      Alert.alert(t('common.error'), t('dataManagement.backupExportError'));
    } finally {
      setIsBackupBusy(false);
      backupBusyRef.current = false;
    }
  };

  const applyBackup = async (data: BackupData, mode: BackupImportMode) => {
    try {
      setIsBackupBusy(true);
      // 置き換えは全データを消す。進行中の同期が消した直後のフィードに記事を書き戻すのを防ぐ
      if (mode === 'replace') {
        SyncService.cancelOngoing();
      }
      const result = await BackupService.applyBackup(data, mode);

      // 黙って捨てると「消えた」と誤解されるものだけ補足する
      const notes = [
        result.starredRestored > 0
          ? t('dataManagement.backupRestoreStarredRestored', { count: result.starredRestored })
          : '',
        result.feedsSkipped > 0
          ? t('dataManagement.backupRestoreFeedsSkipped', { count: result.feedsSkipped })
          : '',
        result.articlesSkipped > 0
          ? t('dataManagement.backupRestoreArticlesSkipped', { count: result.articlesSkipped })
          : '',
        result.keywordsSkipped > 0
          ? t('dataManagement.backupRestoreKeywordsSkipped', { count: result.keywordsSkipped })
          : '',
      ].filter(Boolean);

      Alert.alert(
        t('common.done'),
        t('dataManagement.backupRestoreComplete', {
          feeds: result.feeds,
          filters: result.filters,
          keywords: result.keywords,
          articles: result.articles,
        }) + (notes.length > 0 ? '\n' + notes.join('\n') : '')
      );
    } catch (_) {
      Alert.alert(t('common.error'), t('dataManagement.backupRestoreError'));
    } finally {
      setIsBackupBusy(false);
    }
  };

  /** 置き換えは取り消せないうえ、失われる記事の量がバックアップの中身で変わるため個別に確認する */
  const confirmReplace = (data: BackupData) => {
    // 範囲を記録していない古いバックアップは、お気に入りのみの可能性を排除できないので警告する
    const articleWarning = data.includeAllArticles
      ? ''
      : '\n\n' + t('dataManagement.backupReplaceStarredOnlyWarning');

    Alert.alert(
      t('dataManagement.backupReplaceConfirmTitle'),
      t('dataManagement.backupReplaceConfirmMessage', {
        feeds: data.feeds.length,
        filters: data.filters.length,
        keywords: data.globalAllowKeywords.length,
        articles: data.articles.length,
      }) + articleWarning,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dataManagement.backupReplaceExecute'),
          style: 'destructive',
          onPress: () => applyBackup(data, 'replace'),
        },
      ]
    );
  };

  const runImportBackup = async () => {
    let picked: BackupPickResult;
    try {
      setIsBackupBusy(true);
      // 読み込んで検証するだけ。ここではまだ何も書き換えない
      picked = await BackupService.pickBackupFile();
    } catch (_) {
      Alert.alert(t('common.error'), t('dataManagement.backupRestoreError'));
      return;
    } finally {
      setIsBackupBusy(false);
      backupBusyRef.current = false;
    }

    if (picked.status === 'cancelled') return;
    if (picked.status === 'invalid') {
      Alert.alert(t('dataManagement.backupRestore'), t('dataManagement.backupRestoreInvalid'));
      return;
    }
    if (picked.status === 'unsupportedVersion') {
      Alert.alert(t('dataManagement.backupRestore'), t('dataManagement.backupRestoreUnsupported'));
      return;
    }

    // const に束ねると絞り込みが onPress のクロージャまで残る
    const { data } = picked;

    // 中身の件数を見せたうえで、追加か置き換えかを選ばせる
    Alert.alert(
      t('dataManagement.backupRestoreModeTitle'),
      t('dataManagement.backupRestoreModeMessage', {
        feeds: data.feeds.length,
        filters: data.filters.length,
        keywords: data.globalAllowKeywords.length,
        articles: data.articles.length,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dataManagement.backupRestoreModeReplace'),
          style: 'destructive',
          onPress: () => confirmReplace(data),
        },
        {
          text: t('dataManagement.backupRestoreModeMerge'),
          onPress: () => applyBackup(data, 'merge'),
        },
      ]
    );
  };

  const handleImportBackup = () => {
    // isBackupBusy は state のため、同じフレーム内の二度押しを止められない。
    // DocumentPicker が二重に開くのを防ぐため ref で弾く
    if (isBackupBusy || backupBusyRef.current) return;
    backupBusyRef.current = true;
    runImportBackup();
  };

  const handleExportOpml = async () => {
    if (isOpmlBusy) return;
    try {
      setIsOpmlBusy(true);
      const result = await OpmlService.exportToFile();
      if (result.status === 'empty') {
        Alert.alert(t('dataManagement.opmlExport'), t('dataManagement.opmlExportEmpty'));
      } else if (result.status === 'unavailable') {
        Alert.alert(t('dataManagement.opmlExport'), t('dataManagement.opmlShareUnavailable'));
      }
      // shared の場合は共有シートが結果なので追加の通知は不要
    } catch (_) {
      Alert.alert(t('common.error'), t('dataManagement.opmlExportError'));
    } finally {
      setIsOpmlBusy(false);
    }
  };

  const handleImportOpml = async () => {
    if (isOpmlBusy) return;
    try {
      setIsOpmlBusy(true);
      const result = await OpmlService.importFromFile();
      if (result.status === 'invalid') {
        Alert.alert(t('dataManagement.opmlImport'), t('dataManagement.opmlImportInvalid'));
      } else if (result.status === 'noFeeds') {
        Alert.alert(t('dataManagement.opmlImport'), t('dataManagement.opmlImportNoFeeds'));
      } else if (result.status === 'imported') {
        Alert.alert(
          t('common.done'),
          t('dataManagement.opmlImportComplete', { added: result.added, skipped: result.skipped })
        );
      }
      // cancelled は通知しない
    } catch (_) {
      Alert.alert(t('common.error'), t('dataManagement.opmlImportError'));
    } finally {
      setIsOpmlBusy(false);
    }
  };

  const handleResetAllData = () => {
    Alert.alert(
      t('dataManagement.resetAllData'),
      t('dataManagement.confirmResetAll'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              // 実行中の同期を止めてから消す（古いフィードへの記事書き込みを防ぐ）
              SyncService.cancelOngoing();
              await resetAllData();
              Alert.alert(
                t('common.done'),
                t('dataManagement.resetComplete') + '\n' + t('dataManagement.replayTourPrompt'),
                [
                  { text: t('dataManagement.replayTourLater'), style: 'cancel' },
                  { text: t('dataManagement.replayTourConfirm'), onPress: () => { restartOnboarding(); } },
                ]
              );
            } catch (_) {
              Alert.alert(t('common.error'), t('dataManagement.resetError'));
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
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

  const minRefreshOptions = MIN_REFRESH_OPTIONS.map((value) => ({
    value,
    label: value === 0 ? t('dataManagement.minRefreshNoLimit') : t('dataManagement.minutes', { count: value }),
  }));
  // 選択肢に無い値が保存されていても、SyncService は保存値どおりに制限をかける。
  // 「制限なし」と誤表示しないよう、その分数をそのまま出す
  const getMinRefreshLabel = () =>
    minRefreshOptions.find((o) => o.value === minRefreshInterval)?.label ??
    (minRefreshInterval > 0
      ? t('dataManagement.minutes', { count: minRefreshInterval })
      : t('dataManagement.minRefreshNoLimit'));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <DataManagementHeader onPressBack={() => router.back()} />

      {isDeleting && (
        <LoadingOverlay message={t('dataManagement.deleteInProgress')} />
      )}
      {isResetting && (
        <LoadingOverlay message={t('dataManagement.resetInProgress')} />
      )}
      {isOpmlBusy && (
        <LoadingOverlay message={t('dataManagement.opmlInProgress')} />
      )}
      {isBackupBusy && (
        <LoadingOverlay message={t('dataManagement.backupInProgress')} />
      )}

      <ScrollView style={styles.content}>
        <SettingSection title={t('dataManagement.articleRetention')}>
          <View style={styles.retentionDescription}>
            <ThemedText style={styles.retentionDescriptionText}>
              {t('dataManagement.retentionDescription')}
            </ThemedText>
            <TouchableOpacity style={styles.toggleRow} onPress={handleToggleDeleteStarredInAuto} activeOpacity={0.7}>
              <ThemedText style={styles.toggleLabelText}>{t('dataManagement.deleteStarredToo')}</ThemedText>
              <View style={[styles.toggle, { backgroundColor: deleteStarredInAuto ? toggleOnBg : toggleOffBg }]}>
                <View style={[styles.toggleThumb, deleteStarredInAuto && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
          <Dropdown label={t('dataManagement.retentionPeriodLabel')} value={getRetentionLabel()} onPress={() => setRetentionDropdownVisible(true)} />
        </SettingSection>

        <SettingSection title={t('dataManagement.manualDeleteSection')}>
          <TouchableOpacity style={styles.manualDeleteRow} onPress={handleOpenManualDelete} activeOpacity={0.7}>
            <ThemedText style={styles.manualDeleteText}>{t('dataManagement.manualDeleteNow')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={arrowColor} />
          </TouchableOpacity>
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionWifiOnly')}>
          <TouchableOpacity style={styles.toggleRow} onPress={handleToggleWifiOnlyFetch} activeOpacity={0.7}>
            <ThemedText style={styles.toggleLabelText}>{t('dataManagement.wifiOnlyRss')}</ThemedText>
            <View style={[styles.toggle, { backgroundColor: wifiOnlyFetch ? toggleOnBg : toggleOffBg }]}>
              <View style={[styles.toggleThumb, wifiOnlyFetch && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
          <ThemedText style={styles.sectionHint}>{t('dataManagement.wifiOnlyHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionMinRefresh')}>
          <Dropdown label={t('dataManagement.minRefreshThrottle')} value={getMinRefreshLabel()} onPress={() => setMinRefreshDropdownVisible(true)} />
          <ThemedText style={styles.sectionHint}>{t('dataManagement.minRefreshHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.opmlImportExport')}>
          <TouchableOpacity style={styles.manualDeleteRow} onPress={handleExportOpml} activeOpacity={0.7} disabled={isOpmlBusy}>
            <ThemedText style={styles.manualDeleteText}>{t('dataManagement.opmlExport')}</ThemedText>
            <Ionicons name="share-outline" size={20} color={arrowColor} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.manualDeleteRow} onPress={handleImportOpml} activeOpacity={0.7} disabled={isOpmlBusy}>
            <ThemedText style={styles.manualDeleteText}>{t('dataManagement.opmlImport')}</ThemedText>
            <Ionicons name="download-outline" size={20} color={arrowColor} />
          </TouchableOpacity>
          <ThemedText style={styles.sectionHint}>{t('dataManagement.opmlHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.dataBackupRestore')}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setBackupIncludeAllArticles((prev) => !prev)}
            activeOpacity={0.7}
            disabled={isBackupBusy}
          >
            <ThemedText style={styles.toggleLabelText}>{t('dataManagement.backupIncludeAllArticles')}</ThemedText>
            <View style={[styles.toggle, { backgroundColor: backupIncludeAllArticles ? toggleOnBg : toggleOffBg }]}>
              <View style={[styles.toggleThumb, backupIncludeAllArticles && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.manualDeleteRow} onPress={handleExportBackup} activeOpacity={0.7} disabled={isBackupBusy}>
            <ThemedText style={styles.manualDeleteText}>{t('dataManagement.backupExport')}</ThemedText>
            <Ionicons name="share-outline" size={20} color={arrowColor} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.manualDeleteRow} onPress={handleImportBackup} activeOpacity={0.7} disabled={isBackupBusy}>
            <ThemedText style={styles.manualDeleteText}>{t('dataManagement.backupRestore')}</ThemedText>
            <Ionicons name="download-outline" size={20} color={arrowColor} />
          </TouchableOpacity>
          <ThemedText style={styles.backupHint}>{t('dataManagement.backupHint')}</ThemedText>
        </SettingSection>


        <SettingSection title="">
          <TouchableOpacity style={styles.resetRow} onPress={handleResetAllData} activeOpacity={0.7} disabled={isResetting}>
            <ThemedText style={styles.resetText}>{t('dataManagement.resetAllData')}</ThemedText>
          </TouchableOpacity>
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

      <DropdownModal
        visible={minRefreshDropdownVisible}
        title={t('dataManagement.selectMinRefreshTitle')}
        options={minRefreshOptions}
        selectedValue={minRefreshInterval}
        onSelect={handleChangeMinRefreshInterval}
        onClose={() => setMinRefreshDropdownVisible(false)}
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
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  backIcon: { fontSize: 24 },
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
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {},
  toggleThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  retentionDescription: { marginBottom: 16 },
  retentionDescriptionText: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  /** 設定セクション下の補足説明 */
  sectionHint: { fontSize: 12, lineHeight: 17, marginTop: 10, opacity: 0.7 },
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
  manualDeleteText: { fontSize: 16 },
  arrow: { fontSize: 20 },
  rowDivider: { height: 1, marginVertical: 4 },
  backupHint: { fontSize: 12, lineHeight: 17, marginTop: 12, opacity: 0.7 },
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
  dropdownOptionCheck: { fontSize: 18, fontWeight: '600' },
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
  radioSelected: {},
  radioDot: { width: 12, height: 12, borderRadius: 6 },
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
  resetRow: { paddingVertical: 4, alignItems: 'center' },
  resetText: { fontSize: 16, color: '#d32f2f' },
});
