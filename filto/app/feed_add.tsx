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
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FeedService } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

export default function FeedAddScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const urlInputRef = useRef<TextInput>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');

  // 起動時に入力欄にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => {
      urlInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
  };

  // クリップボードから貼り付け
  const handlePaste = async () => {
    try {
      const clipboardText = await Clipboard.getString();
      if (clipboardText) {
        setUrl(clipboardText.trim());
        setUrlError(null);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  };

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
      const meta = await RssService.fetchMeta(url.trim());
      
      if (meta.title) {
        setName(meta.title);
      }
      
      if (meta.iconUrl) {
        setIconUrl(meta.iconUrl);
      }

    } catch (error) {
      console.error('Failed to fetch feed meta:', error);
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
      console.error('Failed to add feed:', error);
      Alert.alert(t('common.error'), t('feeds.addError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
            <View style={styles.section}>
              <ThemedText style={styles.label}>{t('feeds.feedUrl')}</ThemedText>
              <TextInput
                ref={urlInputRef}
                style={[
                  styles.input,
                  { color: textColor, borderColor, backgroundColor },
                  urlError && styles.inputError
                ]}
                value={url}
                onChangeText={handleUrlChange}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                selectTextOnFocus={true}
              />
              {urlError && (
                <ThemedText style={styles.errorText}>{urlError}</ThemedText>
              )}
            </View>

            {/* Paste Button */}
            <TouchableOpacity
              style={[styles.pasteButton, { borderColor }]}
              onPress={handlePaste}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="clipboard-outline" size={18} color="#1976d2" />
                <ThemedText style={styles.pasteButtonText}>{t('feeds.pasteFromClipboard')}</ThemedText>
              </View>
            </TouchableOpacity>

            {/* Fetch Meta Button */}
            <TouchableOpacity
              style={[styles.fetchButton, isLoadingMeta && styles.fetchButtonDisabled]}
              onPress={handleFetchMeta}
              disabled={isLoadingMeta}
              activeOpacity={0.7}
            >
              {isLoadingMeta ? (
                <View style={styles.fetchButtonContent}>
                  <ActivityIndicator size="small" color="#fff" />
                  <ThemedText style={styles.fetchButtonText}> {t('feeds.fetchingMeta')}</ThemedText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="search-outline" size={18} color="#fff" />
                  <ThemedText style={styles.fetchButtonText}>{t('feeds.fetchFeedMeta')}</ThemedText>
                </View>
              )}
            </TouchableOpacity>

            {/* Feed Name (optional) */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>
                {t('feeds.feedName')}{' '}
                <ThemedText style={styles.optional}>{t('feeds.feedNameOptional')}</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor, backgroundColor }]}
                value={name}
                onChangeText={setName}
                placeholder="My Favorite Blog"
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <ThemedText style={styles.hint}>{t('feeds.feedNameEmptyHint')}</ThemedText>
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addButton, isLoading && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.addButtonText}>
                {isLoading ? t('feeds.addFeedSubmitting') : t('feeds.addFeedSubmit')}
              </ThemedText>
            </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
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
    color: '#666',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    marginTop: 4,
  },
  hint: {
    fontSize: 14,
    color: '#666',
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
    color: '#1976d2',
  },
  fetchButton: {
    height: 48,
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fetchButtonDisabled: {
    backgroundColor: '#b0b0b0',
  },
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
    backgroundColor: '#1976d2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#b0b0b0',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});