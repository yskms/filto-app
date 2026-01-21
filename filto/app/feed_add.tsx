import React, { useState, useRef, useEffect } from 'react';
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
import { FeedService } from '@/services/FeedService';
import { RssService } from '@/services/RssService';
import { ErrorHandler } from '@/utils/errorHandler';

export default function FeedAddScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const urlInputRef = useRef<TextInput>(null);

  // 起動時に入力欄にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => {
      urlInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // URLバリデーション関数
  const validateUrl = (urlString: string): { valid: boolean; message?: string } => {
    if (!urlString.trim()) {
      return { valid: false, message: 'URLを入力してください' };
    }

    try {
      const urlObj = new URL(urlString.trim());
      
      // プロトコルチェック
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, message: 'http または https のURLを入力してください' };
      }
      
      // ホスト名チェック
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return { valid: false, message: '有効なホスト名を含むURLを入力してください' };
      }
      
      // ローカルホストの除外
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        return { valid: false, message: 'ローカルホストのURLは使用できません' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, message: '有効なURL形式で入力してください（例: https://example.com/feed.xml）' };
    }
  };

  // URL変更時のリアルタイムバリデーション
  const handleUrlChange = (text: string) => {
    setUrl(text);
    
    // 空欄の場合はエラーをクリア
    if (!text.trim()) {
      setUrlError(null);
      return;
    }
    
    // 入力中はリアルタイムでバリデーション
    const validation = validateUrl(text);
    if (!validation.valid) {
      setUrlError(validation.message || null);
    } else {
      setUrlError(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        handleUrlChange(text.trim());
      }
    } catch (error) {
      console.error('Clipboard error:', error);
    }
  };

  const handleFetchMeta = async () => {
    // バリデーション
    const validation = validateUrl(url);
    if (!validation.valid) {
      ErrorHandler.showValidationError('URL', validation.message || 'URLが無効です');
      return;
    }

    setIsLoadingMeta(true);

    try {
      // 1. まず入力されたURLで試す
      try {
        console.log('[FeedAdd] Trying direct URL:', url.trim());
        const meta = await RssService.fetchMeta(url.trim());
        
        // タイトルとアイコンURLを自動入力
        setName(meta.title);
        setIconUrl(meta.iconUrl);
        
        console.log('[FeedAdd] Fetched meta:', { title: meta.title, iconUrl: meta.iconUrl });
        
        Alert.alert('成功', 'フィード情報を取得しました');
        return;
      } catch (firstError) {
        console.log('[FeedAdd] Direct fetch failed, trying auto-detection...');
      }
      
      // 2. 失敗したら自動検出を試みる
      const detectedUrl = await FeedService.detectRssUrl(url.trim());
      
      if (detectedUrl) {
        // 検出成功：メタデータを取得
        const meta = await RssService.fetchMeta(detectedUrl);
        
        // URLを自動更新
        setUrl(detectedUrl);
        setName(meta.title);
        setIconUrl(meta.iconUrl);
        
        console.log('[FeedAdd] Auto-detected RSS:', { url: detectedUrl, title: meta.title });
        
        Alert.alert(
          '成功', 
          `RSSフィードを自動検出しました\n\n${detectedUrl}`
        );
      } else {
        // すべて失敗
        console.error('[FeedAdd] RSS auto-detection failed');
        ErrorHandler.showRssError();
      }
    } catch (error) {
      console.error('[FeedAdd] Failed to fetch RSS meta:', error);
      ErrorHandler.showRssError();
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleAdd = async () => {
    // バリデーション
    const validation = validateUrl(url);
    if (!validation.valid) {
      ErrorHandler.showValidationError('URL', validation.message || 'URLが無効です');
      return;
    }

    setIsLoading(true);

    try {
      // 重複チェック
      const existingFeeds = await FeedService.list();
      const trimmedUrl = url.trim();
      const isDuplicate = existingFeeds.some(feed => feed.url === trimmedUrl);
      
      if (isDuplicate) {
        ErrorHandler.showDuplicateError('フィードURL');
        setIsLoading(false);
        return;
      }

      // FeedService.create() でフィードを保存
      await FeedService.create({
        url: trimmedUrl,
        title: name.trim() || undefined,  // 空文字の場合はundefinedに
        iconUrl: iconUrl,  // アイコンURLも保存
      });

      console.log('[FeedAdd] Created feed with iconUrl:', iconUrl);

      Alert.alert('成功', 'フィードを追加しました', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to add feed:', error);
      ErrorHandler.showDatabaseError('フィードの追加');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Expo Router のヘッダーを非表示 */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Feed</Text>
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
              <Text style={styles.label}>Feed URL</Text>
              <TextInput
                ref={urlInputRef}
                style={[
                  styles.input,
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
                <Text style={styles.errorText}>{urlError}</Text>
              )}
            </View>

            {/* Paste Button */}
            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePaste}
              activeOpacity={0.7}
            >
              <Text style={styles.pasteButtonText}>📋 ペースト</Text>
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
                  <Text style={styles.fetchButtonText}> 取得中...</Text>
                </View>
              ) : (
                <Text style={styles.fetchButtonText}>🔍 フィード情報を取得</Text>
              )}
            </TouchableOpacity>

            {/* Feed Name (optional) */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Feed Name <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="My Favorite Blog"
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <Text style={styles.hint}>
                空欄の場合、URLをタイトルとして使用します
              </Text>
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addButton, isLoading && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.addButtonText}>
                {isLoading ? '追加中...' : '追加する'}
              </Text>
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
    backgroundColor: '#fff',
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
    color: '#000',
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
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
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
    borderColor: '#1976d2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
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
