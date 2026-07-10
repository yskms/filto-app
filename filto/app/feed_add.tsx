import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FeedService, DuplicateFeedUrlError } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '@/constants/storageKeys';
import { CoachMarks, CoachStep, CoachRect } from '@/components/CoachMarks';

export default function FeedAddScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const urlInputRef = useRef<TextInput>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const tintColor = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const disabledBg = useThemeColor({ light: '#b0b0b0', dark: '#555' }, 'background');
  const buttonTextColor = useThemeColor({ light: '#fff', dark: '#151718' }, 'text');

  // 初回チュートリアル（フィード画面から引き継ぎ）
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStartAtLast, setTutorialStartAtLast] = useState(false);
  const urlSecRef = useRef<View>(null);
  const pasteRef = useRef<View>(null);
  const fetchRef = useRef<View>(null);
  const nameSecRef = useRef<View>(null);

  // 起動時: ツアー中はキーボードを出さずツアー開始、通常は入力欄へフォーカス
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(StorageKeys.tourFeedAdd).then((flag) => {
      if (flag === '1' || flag === 'last') {
        AsyncStorage.removeItem(StorageKeys.tourFeedAdd).catch(() => {});
        setTutorialStartAtLast(flag === 'last');
        setTutorialVisible(true);
      } else {
        timer = setTimeout(() => urlInputRef.current?.focus(), 100);
      }
    }).catch(() => {
      timer = setTimeout(() => urlInputRef.current?.focus(), 100);
    });
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const measureNode = useCallback(
    (ref: React.RefObject<View | null>): Promise<CoachRect | null> =>
      new Promise((resolve) => {
        const node = ref.current;
        if (!node) { resolve(null); return; }
        requestAnimationFrame(() => {
          node.measureInWindow((x, y, width, height) => {
            if (!width || !height) resolve(null);
            else resolve({ x, y, width, height });
          });
        });
      }),
    []
  );

  const tutorialSteps = React.useMemo<CoachStep[]>(() => [
    {
      // URL欄 + クリップボード貼り付けボタン までをまとめて囲う
      measure: () => new Promise<CoachRect | null>((resolve) => {
        const u = urlSecRef.current;
        if (!u) { resolve(null); return; }
        u.measureInWindow((ux, uy, uw, uh) => {
          if (!uw || !uh) { resolve(null); return; }
          const p = pasteRef.current;
          if (!p) { resolve({ x: ux, y: uy, width: uw, height: uh }); return; }
          p.measureInWindow((px, py, pw, ph) => {
            const bottom = (py && ph) ? py + ph : uy + uh;
            resolve({ x: ux, y: uy, width: uw, height: Math.max(uh, bottom - uy) });
          });
        });
      }),
      text: t('feeds.tutUrlDesc'),
    },
    { measure: () => measureNode(fetchRef), text: t('feeds.tutFetchDesc') },
    { measure: () => measureNode(nameSecRef), text: t('feeds.tutNameDesc') },
  ], [t, measureNode]);

  // 最初のステップで「戻る」→ フィード画面のツアー最後へ戻る
  const handleTutorialBack = useCallback(async () => {
    setTutorialVisible(false);
    try { await AsyncStorage.setItem(StorageKeys.tourFeeds, 'last'); } catch {}
    router.dismissAll();
    router.navigate('/feeds');
  }, [router]);

  // 最後の「次へ」で、ホームへ戻り取得完了を待ってツアー終了
  const handleTutorialDone = useCallback(async () => {
    setTutorialVisible(false);
    try { await AsyncStorage.setItem(StorageKeys.tourFinish, '1'); } catch {}
    router.dismissAll();
    router.navigate('/');
  }, [router]);

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

  // URL変更時のバリデーション
  const handleUrlChange = (text: string) => {
    setUrl(text);
    if (urlError) {
      setUrlError(null);
    }
    setFetchSuccess(false);
  };

  // クリップボードから貼り付け。空白のみの場合は貼り付けない（入力済みURLを消さないため）
  const handlePaste = async () => {
    try {
      const clipboardText = (await Clipboard.getStringAsync()).trim();
      if (clipboardText) {
        setUrl(clipboardText);
        setUrlError(null);
        setFetchSuccess(false);
      }
    } catch (_) {
    }
  };

  // 重複フィードのエラー文言（登録済みタイトルが分かる場合は含める）
  const duplicateMessage = useCallback(
    (existingTitle?: string) =>
      existingTitle
        ? t('feeds.duplicateUrlNamed', { title: existingTitle })
        : t('feeds.duplicateUrl'),
    [t]
  );

  // フィード情報を取得
  const handleFetchMeta = async () => {
    const validation = validateUrl(url);
    if (!validation.valid) {
      setUrlError(validation.message || t('feeds.invalidUrlShort'));
      return;
    }

    setIsLoadingMeta(true);
    setUrlError(null);

    try {
      // 通信する前に登録済みかどうかを確認する
      const existing = await FeedService.findByUrl(url.trim());
      if (existing) {
        setFetchSuccess(false);
        setUrlError(duplicateMessage(existing.title));
        return;
      }

      const meta = await RssService.fetchMeta(url.trim());
      
      if (meta.title) {
        setName(meta.title);
      }

      if (meta.iconUrl) {
        setIconUrl(meta.iconUrl);
      }

      setFetchSuccess(true);
    } catch (_) {
      setFetchSuccess(false);
      setUrlError(t('feeds.metaFetchFailed'));
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // フィード追加
  const handleAdd = async () => {
    const validation = validateUrl(url);
    if (!validation.valid) {
      setUrlError(validation.message || t('feeds.invalidUrlShort'));
      return;
    }

    setIsLoading(true);
    setUrlError(null);

    try {
      const trimmedUrl = url.trim();
      const feedName = name.trim() || trimmedUrl;

      await FeedService.create({
        url: trimmedUrl,
        title: feedName,
        iconUrl: iconUrl || undefined,
      });

      router.back();
    } catch (error) {
      if (error instanceof DuplicateFeedUrlError) {
        const message = duplicateMessage(error.existingTitle);
        setFetchSuccess(false);
        setUrlError(message);
        Alert.alert(t('common.error'), message);
      } else {
        Alert.alert(t('common.error'), t('feeds.addError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="chevron-back" size={26} color={textColor} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('feeds.addFeed')}</ThemedText>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Feed URL */}
            <View ref={urlSecRef} style={styles.section}>
              <ThemedText style={styles.label}>{t('feeds.feedUrl')}</ThemedText>
              <TextInput
                ref={urlInputRef}
                style={[
                  styles.input,
                  { color: textColor, borderColor, backgroundColor },
                  urlError && [styles.inputError, { borderColor: dangerColor }]
                ]}
                value={url}
                onChangeText={handleUrlChange}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor={borderColor}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                selectTextOnFocus={true}
              />
              {urlError && (
                <ThemedText style={[styles.errorText, { color: dangerColor }]}>{urlError}</ThemedText>
              )}
            </View>

            {/* Paste Button */}
            <TouchableOpacity
              ref={pasteRef}
              style={[styles.pasteButton, { borderColor }]}
              onPress={handlePaste}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="clipboard-outline" size={18} color={tintColor} />
                <ThemedText style={[styles.pasteButtonText, { color: tintColor }]}>{t('common.pasteFromClipboard')}</ThemedText>
              </View>
            </TouchableOpacity>

            {/* Fetch Meta Button */}
            <TouchableOpacity
              ref={fetchRef}
              style={[styles.fetchButton, { backgroundColor: tintColor }, isLoadingMeta && { backgroundColor: disabledBg }]}
              onPress={handleFetchMeta}
              disabled={isLoadingMeta}
              activeOpacity={0.7}
            >
              {isLoadingMeta ? (
                <View style={styles.fetchButtonContent}>
                  <ActivityIndicator size="small" color={buttonTextColor} />
                  <ThemedText style={[styles.fetchButtonText, { color: buttonTextColor }]}> {t('feeds.fetchingMeta')}</ThemedText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="search-outline" size={18} color={buttonTextColor} />
                  <ThemedText style={[styles.fetchButtonText, { color: buttonTextColor }]}>{t('feeds.fetchFeedMeta')}</ThemedText>
                </View>
              )}
            </TouchableOpacity>

            {/* Feed Name (optional) */}
            <View ref={nameSecRef} style={styles.section}>
              <ThemedText style={styles.label}>
                {t('feeds.feedName')}{' '}
                <ThemedText style={styles.optional}>{t('feeds.feedNameOptional')}</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor, backgroundColor }]}
                value={name}
                onChangeText={setName}
                placeholder="My Favorite Blog"
                placeholderTextColor={borderColor}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <ThemedText style={styles.hint}>{t('feeds.feedNameEmptyHint')}</ThemedText>
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: tintColor }, (isLoading || !fetchSuccess) && { backgroundColor: disabledBg }]}
              onPress={handleAdd}
              disabled={isLoading || !fetchSuccess}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.addButtonText, { color: buttonTextColor }]}>
                {isLoading ? t('feeds.addFeedSubmitting') : t('feeds.addFeedSubmit')}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <CoachMarks
          visible={tutorialVisible}
          steps={tutorialSteps}
          onDone={handleTutorialDone}
          startAtLast={tutorialStartAtLast}
          onBackBeforeFirst={handleTutorialBack}
        />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  backIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  pasteButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pasteButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  fetchButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fetchButtonDisabled: {},
  fetchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fetchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {},
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});