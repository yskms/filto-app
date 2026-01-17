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

export default function FeedAddScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const urlInputRef = useRef<TextInput>(null);

  // 起動時に入力欄にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => {
      urlInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setUrl(text.trim());
      }
    } catch (error) {
      console.error('Clipboard error:', error);
    }
  };

  const handleFetchMeta = async () => {
    // バリデーション
    if (!url.trim()) {
      Alert.alert('エラー', 'Feed URLを入力してください');
      return;
    }

    // URLの簡易チェック
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('エラー', '有効なURLを入力してください');
      return;
    }

    setIsLoadingMeta(true);

    try {
      // RSSメタデータを取得
      const meta = await RssService.fetchMeta(url.trim());
      
      // タイトルを自動入力
      setName(meta.title);
      
      Alert.alert('成功', 'フィード情報を取得しました');
    } catch (error) {
      console.error('Failed to fetch RSS meta:', error);
      Alert.alert(
        'エラー',
        'フィード情報の取得に失敗しました。手動でタイトルを入力してください。'
      );
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleAdd = async () => {
    // バリデーション
    if (!url.trim()) {
      Alert.alert('エラー', 'Feed URLを入力してください');
      return;
    }

    // URLの簡易チェック
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('エラー', '有効なURLを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      // FeedService.create() でフィードを保存
      await FeedService.create({
        url: url.trim(),
        title: name.trim() || undefined,  // 空文字の場合はundefinedに
      });

      Alert.alert('成功', 'フィードを追加しました', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to add feed:', error);
      Alert.alert('エラー', 'フィードの追加に失敗しました');
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
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                selectTextOnFocus={true}
              />
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
