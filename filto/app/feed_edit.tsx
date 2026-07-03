import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Clipboard,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FeedService } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { Feed } from '@/types/Feed';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { useToast } from '@/providers/toast';
import { LoadingView } from '@/components/LoadingView';

// ヘッダーコンポーネント
const FeedEditHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPressBack}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Ionicons name="chevron-back" size={26} color={iconColor} />
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>{t('feeds.editFeed')}</ThemedText>
      <View style={styles.headerRight} />
    </View>
  );
};

export default function FeedEditScreen() {
  const router = useRouter();
  const { feedId } = useLocalSearchParams<{ feedId?: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [feed, setFeed] = useState<Feed | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  // URLを変更したらフェッチで再検証するまで保存不可にする
  const [fetchSuccess, setFetchSuccess] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const subtextColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const disabledBg = useThemeColor({ light: '#b0b0b0', dark: '#555' }, 'background');
  const buttonTextColor = useThemeColor({ light: '#fff', dark: '#151718' }, 'text');
  const iconPlaceholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2b2c' }, 'background');

  // 編集対象のフィードを読み込む
  useEffect(() => {
    if (feedId) {
      loadFeed();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedId]);

  const loadFeed = async () => {
    setIsLoading(true);
    try {
      const data = await FeedService.get(feedId!);
      if (data) {
        setFeed(data);
        setUrl(data.url);
        setName(data.title);
        setIconUrl(data.iconUrl);
      } else {
        router.back();
      }
    } catch (_) {
      Alert.alert(t('common.error'), t('feeds.saveError'));
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const validateUrl = useCallback(
    (urlString: string): { valid: boolean; message?: string } => {
      if (!urlString.trim()) {
        return { valid: false, message: t('feeds.urlRequired') };
      }
      try {
        const urlObj = new URL(urlString.trim());
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return { valid: false, message: t('feeds.urlHttpOrHttps') };
        }
        return { valid: true };
      } catch {
        return { valid: false, message: t('feeds.invalidUrl') };
      }
    },
    [t]
  );

  const handleUrlChange = (text: string) => {
    setUrl(text);
    if (urlError) {
      setUrlError(null);
    }
    setFetchSuccess(false);
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await Clipboard.getString();
      if (clipboardText) {
        setUrl(clipboardText.trim());
        setUrlError(null);
        setFetchSuccess(false);
      }
    } catch (_) {
    }
  };

  const handleCopyUrl = () => {
    Clipboard.setString(url);
    showToast(t('feeds.urlCopied'), 'success');
  };

  // URLからフィード情報を再取得
  const handleFetchMeta = async () => {
    const validation = validateUrl(url);
    if (!validation.valid) {
      setUrlError(validation.message || t('feeds.invalidUrlShort'));
      return;
    }

    setIsLoadingMeta(true);
    setUrlError(null);

    try {
      const meta = await RssService.fetchMeta(url.trim());
      if (meta.title) {
        setName(meta.title);
      }
      if (meta.iconUrl) {
        setIconUrl(meta.iconUrl);
      }
      setFetchSuccess(true);
      showToast(t('feeds.metaFetched'), 'success');
    } catch (_) {
      setUrlError(t('feeds.metaFetchFailed'));
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleSave = async () => {
    if (!feed) return;

    const validation = validateUrl(url);
    if (!validation.valid) {
      setUrlError(validation.message || t('feeds.invalidUrlShort'));
      return;
    }

    setIsSaving(true);
    try {
      const trimmedUrl = url.trim();
      const feedName = name.trim() || trimmedUrl;
      await FeedService.update({ ...feed, url: trimmedUrl, title: feedName, iconUrl });
      showToast(t('common.saved'), 'success');
      router.back();
    } catch (_) {
      Alert.alert(t('common.error'), t('feeds.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!feed) return;
    Alert.alert(t('feeds.confirmDelete'), t('feeds.confirmDeleteSingle'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await FeedService.delete(feed.id);
            router.back();
          } catch (_) {
            Alert.alert(t('common.error'), t('feeds.deleteError'));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const isBusy = isSaving || isDeleting || isLoadingMeta;
  // URLを元から変更した場合は、フェッチ成功するまで保存不可（URL未変更なら名前のみ編集として保存可）
  const isUrlChanged = feed ? url.trim() !== feed.url : false;
  const needsFetch = isUrlChanged && !fetchSuccess;
  const isSaveDisabled = !url.trim() || isBusy || needsFetch;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <FeedEditHeader onPressBack={() => router.back()} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <FeedEditHeader onPressBack={() => router.back()} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* アイコン */}
            <View style={styles.iconContainer}>
              {iconUrl ? (
                <Image
                  source={{ uri: iconUrl }}
                  style={[styles.feedIcon, { backgroundColor: iconPlaceholderBg }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.feedIcon, styles.feedIconPlaceholder, { backgroundColor: iconPlaceholderBg }]}>
                  <Ionicons name="newspaper-outline" size={32} color={subtextColor} />
                </View>
              )}
            </View>

            {/* Feed URL */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>{t('feeds.feedUrl')}</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: textColor, borderColor, backgroundColor },
                  urlError && [styles.inputError, { borderColor: dangerColor }],
                ]}
                value={url}
                onChangeText={handleUrlChange}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor={borderColor}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isBusy}
              />
              {urlError && (
                <ThemedText style={[styles.errorText, { color: dangerColor }]}>{urlError}</ThemedText>
              )}
            </View>

            {/* Paste / Copy */}
            <View style={styles.urlActionRow}>
              <TouchableOpacity
                style={[styles.urlActionButton, { borderColor }]}
                onPress={handlePaste}
                activeOpacity={0.7}
                disabled={isBusy}
              >
                <Ionicons name="clipboard-outline" size={18} color={tintColor} />
                <ThemedText style={[styles.urlActionText, { color: tintColor }]}>{t('feeds.pasteFromClipboard')}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.urlActionButton, { borderColor }]}
                onPress={handleCopyUrl}
                activeOpacity={0.7}
                disabled={isBusy}
              >
                <Ionicons name="copy-outline" size={18} color={tintColor} />
                <ThemedText style={[styles.urlActionText, { color: tintColor }]}>{t('feeds.copyUrl')}</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Fetch Meta */}
            <TouchableOpacity
              style={[styles.fetchButton, { backgroundColor: tintColor }, isLoadingMeta && { backgroundColor: disabledBg }]}
              onPress={handleFetchMeta}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              {isLoadingMeta ? (
                <View style={styles.fetchButtonContent}>
                  <ActivityIndicator size="small" color={buttonTextColor} />
                  <ThemedText style={[styles.fetchButtonText, { color: buttonTextColor }]}> {t('feeds.fetchingMeta')}</ThemedText>
                </View>
              ) : (
                <View style={styles.fetchButtonContent}>
                  <Ionicons name="refresh-outline" size={18} color={buttonTextColor} />
                  <ThemedText style={[styles.fetchButtonText, { color: buttonTextColor }]}> {t('feeds.fetchFeedMeta')}</ThemedText>
                </View>
              )}
            </TouchableOpacity>

            {/* Feed Name */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>
                {t('feeds.feedName')}{' '}
                <ThemedText style={styles.optional}>{t('feeds.feedNameOptional')}</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor, backgroundColor }]}
                value={name}
                onChangeText={setName}
                placeholder={url}
                placeholderTextColor={borderColor}
                editable={!isBusy}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <ThemedText style={styles.hint}>{t('feeds.feedNameEmptyHint')}</ThemedText>
            </View>

            {needsFetch && (
              <ThemedText style={[styles.fetchHint, { color: dangerColor }]}>{t('feeds.fetchRequired')}</ThemedText>
            )}

            {/* Save / Delete */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: tintColor }, isSaveDisabled && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaveDisabled}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={buttonTextColor} />
                ) : (
                  <ThemedText style={[styles.saveButtonText, { color: buttonTextColor }]}>{t('common.save')}</ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: dangerColor }]}
                onPress={handleDelete}
                disabled={isDeleting || isSaving}
                activeOpacity={0.7}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={dangerColor} />
                ) : (
                  <ThemedText style={[styles.deleteButtonText, { color: dangerColor }]}>{t('common.delete')}</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  feedIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  feedIconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  optional: {
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  inputError: {
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  hint: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
  },
  urlActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  urlActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
  },
  urlActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fetchButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fetchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fetchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fetchHint: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
