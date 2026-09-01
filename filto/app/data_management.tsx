import React, { useState, useCallback, useRef } from 'react';
import {
  View,
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
import {
  ARTICLE_RETENTION_OPTIONS,
  DEFAULT_ARTICLE_RETENTION_DAYS,
  normalizeArticleRetentionDays,
} from '@/constants/articleRetention';
import { resetAllData, resetFeedsToDefault } from '@/database/init';
import { restartOnboarding } from '@/utils/onboarding';
import { SyncService } from '@/services/SyncService';
import { BackgroundSync } from '@/services/BackgroundSync';
import { OpmlService } from '@/services/OpmlService';
import {
  BackupService,
  type BackupData,
  type BackupImportMode,
  type BackupPickResult,
} from '@/services/BackupService';
import { ThemedText } from '@/components/themed-text';
import { Toggle } from '@/components/Toggle';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation, useLanguage } from '@/providers/language';
import { LoadingOverlay } from '@/components/LoadingOverlay';


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

export default function DataManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const arrowColor = useThemeColor({}, 'icon');
  const [articleRetentionDays, setArticleRetentionDays] = useState(DEFAULT_ARTICLE_RETENTION_DAYS);
  const [deleteStarredInAuto, setDeleteStarredInAuto] = useState(false);
  const [wifiOnlyFetch, setWifiOnlyFetch] = useState(false);
  const [backgroundFetchEnabled, setBackgroundFetchEnabled] = useState(true);
  const [minRefreshInterval, setMinRefreshInterval] = useState(0);
  const [retentionDropdownVisible, setRetentionDropdownVisible] = useState(false);
  const [minRefreshDropdownVisible, setMinRefreshDropdownVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isOpmlBusy, setIsOpmlBusy] = useState(false);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [backupIncludeAllArticles, setBackupIncludeAllArticles] = useState(false);
  /** 二度押しの即時ガード。isBackupBusy は再レンダリングまで更新されないため併用する */
  const backupBusyRef = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      const [savedRetention, savedStarred, savedWifiOnly, savedMinRefresh, bgEnabled] = await Promise.all([
        AsyncStorage.getItem(StorageKeys.articleRetentionDays),
        AsyncStorage.getItem(StorageKeys.deleteStarredInAutoDelete),
        AsyncStorage.getItem(StorageKeys.wifiOnlyFetch),
        AsyncStorage.getItem(StorageKeys.minRefreshIntervalMinutes),
        BackgroundSync.isEnabled(),
      ]);
      // 廃止した短い保持期間（7日/30日）が残っている端末は、ここで既定値へ
      // 引き上げて書き戻す。SyncService 側も同じ正規化を通すので、書き戻しに
      // 失敗しても「表示と実際の削除がずれる」ことはない
      const retentionDays = normalizeArticleRetentionDays(savedRetention);
      setArticleRetentionDays(retentionDays);
      if (savedRetention !== null && savedRetention !== retentionDays.toString()) {
        AsyncStorage.setItem(StorageKeys.articleRetentionDays, retentionDays.toString()).catch(() => {});
      }
      if (savedStarred !== null) setDeleteStarredInAuto(savedStarred === 'true');
      if (savedWifiOnly !== null) setWifiOnlyFetch(savedWifiOnly === 'true');
      if (savedMinRefresh !== null) setMinRefreshInterval(parseInt(savedMinRefresh, 10));
      setBackgroundFetchEnabled(bgEnabled);
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

  const handleToggleBackgroundFetch = async () => {
    const next = !backgroundFetchEnabled;
    setBackgroundFetchEnabled(next);
    try {
      // 設定の保存とタスクの登録/解除をまとめて行う
      await BackgroundSync.setEnabled(next);
    } catch (_) {
      setBackgroundFetchEnabled(!next); // 失敗したらUIを戻す
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
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
      // 進行中の同期の停止と待機は BackupService.applyBackup の中で行う
      //（モードによらず排他する。マージでも同期と復元が同じ articles を触るため）
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
        result.filtersSkipped > 0
          ? t('dataManagement.backupRestoreFiltersSkipped', { count: result.filtersSkipped })
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

  // フィードだけをデフォルトに戻す（フィルタ・表示設定は残す）。その場で再seed＋取得し、
  // オンボGIFは出さない。フィルタの全削除はフィルタ画面で行えるため対象外。
  const handleResetFeeds = () => {
    Alert.alert(
      t('dataManagement.resetFeeds'),
      t('dataManagement.confirmResetFeeds'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dataManagement.resetFeedsConfirm'),
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              // 進行中の同期を止め、その終了を待ってから消す
              //（古いフィードへの記事書き込みを防ぐ）。
              // 再取得はロックを解放してから行う ―― リセット本体と同じロックの中で
              // refresh() を呼ぶと、自分自身のロックに阻まれて0件で返ってしまう
              await SyncService.runExclusive(async () => {
                await resetFeedsToDefault(language === 'ja' ? 'ja' : 'en');
              });
              // 新しいデフォルトフィードの記事を取得（明示操作なので WiFi 限定は無視）
              await SyncService.refresh({ ignoreWifiOnly: true });
              Alert.alert(t('common.done'), t('dataManagement.resetFeedsComplete'));
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
              // 実行中の同期を止め、その終了を待ってから消す
              //（古いフィードへの記事書き込みを防ぐ）
              await SyncService.runExclusive(async () => {
                await resetAllData();
              });
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

  const retentionOptions = ARTICLE_RETENTION_OPTIONS.map((value) => ({
    value,
    label: value === 0 ? t('dataManagement.unlimited') : t('dataManagement.days', { count: value }),
  }));
  // 選択肢に無い日数が保存されていても、SyncService は保存値どおりに削除する。
  // 既定値を固定で出すと「表示より短い期間で消える」ズレになるため、その日数をそのまま出す
  const getRetentionLabel = () =>
    retentionOptions.find((o) => o.value === articleRetentionDays)?.label ??
    (articleRetentionDays > 0
      ? t('dataManagement.days', { count: articleRetentionDays })
      : t('dataManagement.unlimited'));

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
          </View>
          <Dropdown label={t('dataManagement.retentionPeriodLabel')} value={getRetentionLabel()} onPress={() => setRetentionDropdownVisible(true)} />
          <Toggle
            value={deleteStarredInAuto}
            onToggle={handleToggleDeleteStarredInAuto}
            label={t('dataManagement.deleteStarredToo')}
          />
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionBackgroundFetch')}>
          <Toggle
            value={backgroundFetchEnabled}
            onToggle={handleToggleBackgroundFetch}
            label={t('dataManagement.backgroundFetch')}
          />
          <ThemedText style={styles.sectionHint}>{t('dataManagement.backgroundFetchHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionWifiOnly')}>
          <Toggle
            value={wifiOnlyFetch}
            onToggle={handleToggleWifiOnlyFetch}
            label={t('dataManagement.wifiOnlyRss')}
          />
          <ThemedText style={styles.sectionHint}>{t('dataManagement.wifiOnlyHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionMinRefresh')}>
          <Dropdown label={t('dataManagement.minRefreshThrottle')} value={getMinRefreshLabel()} onPress={() => setMinRefreshDropdownVisible(true)} />
          <ThemedText style={styles.sectionHint}>{t('dataManagement.minRefreshHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.sectionReset')}>
          <TouchableOpacity style={styles.linkRow} onPress={handleResetFeeds} activeOpacity={0.7} disabled={isResetting}>
            <ThemedText style={styles.linkRowText}>{t('dataManagement.resetFeeds')}</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.sectionHint}>{t('dataManagement.resetFeedsHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.opmlImportExport')}>
          <TouchableOpacity style={styles.linkRow} onPress={handleExportOpml} activeOpacity={0.7} disabled={isOpmlBusy}>
            <ThemedText style={styles.linkRowText}>{t('dataManagement.opmlExport')}</ThemedText>
            <Ionicons name="share-outline" size={20} color={arrowColor} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.linkRow} onPress={handleImportOpml} activeOpacity={0.7} disabled={isOpmlBusy}>
            <ThemedText style={styles.linkRowText}>{t('dataManagement.opmlImport')}</ThemedText>
            <Ionicons name="download-outline" size={20} color={arrowColor} />
          </TouchableOpacity>
          <ThemedText style={styles.sectionHint}>{t('dataManagement.opmlHint')}</ThemedText>
        </SettingSection>

        <SettingSection title={t('dataManagement.dataBackupRestore')}>
          <Toggle
            value={backupIncludeAllArticles}
            onToggle={() => setBackupIncludeAllArticles((prev) => !prev)}
            label={t('dataManagement.backupIncludeAllArticles')}
            disabled={isBackupBusy}
          />
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.linkRow} onPress={handleExportBackup} activeOpacity={0.7} disabled={isBackupBusy}>
            <ThemedText style={styles.linkRowText}>{t('dataManagement.backupExport')}</ThemedText>
            <Ionicons name="share-outline" size={20} color={arrowColor} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.linkRow} onPress={handleImportBackup} activeOpacity={0.7} disabled={isBackupBusy}>
            <ThemedText style={styles.linkRowText}>{t('dataManagement.backupRestore')}</ThemedText>
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
  /** タップで実行する行（初期化 / OPML / バックアップ） */
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  linkRowText: { fontSize: 16 },
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
  resetRow: { paddingVertical: 4, alignItems: 'center' },
  resetText: { fontSize: 16, color: '#d32f2f' },
});
