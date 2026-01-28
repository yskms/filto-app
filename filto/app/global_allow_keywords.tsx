import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GlobalAllowKeywordService } from '@/services/GlobalAllowKeywordService';
import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

// ヘッダーコンポーネント
const GlobalAllowKeywordsHeader: React.FC<{
  onPressBack: () => void;
  remainingCount: number | null;
}> = ({ onPressBack, remainingCount }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ThemedText style={styles.backIcon}>{t.common.back}</ThemedText>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <ThemedText style={styles.headerTitle}>{t.globalAllowKeywords.title}</ThemedText>
        {remainingCount !== null && (
          <ThemedText style={styles.remainingText}>
            {t.globalAllowKeywords.remaining}: {remainingCount}
          </ThemedText>
        )}
      </View>
      <View style={styles.headerRight} />
    </View>
  );
};

// キーワード項目コンポーネント
const KeywordItem: React.FC<{
  keyword: GlobalAllowKeyword;
  onPressDelete: () => void;
}> = ({ keyword, onPressDelete }) => {
  return (
    <View style={styles.keywordItem}>
      <ThemedText style={styles.keywordText}>{keyword.keyword}</ThemedText>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onPressDelete}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.deleteButtonText}>✕</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

export default function GlobalAllowKeywordsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const [keywords, setKeywords] = useState<GlobalAllowKeyword[]>([]);
  const [inputText, setInputText] = useState('');
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);

  // データ読み込み
  const loadKeywords = React.useCallback(async () => {
    try {
      const keywordList = await GlobalAllowKeywordService.list();
      setKeywords(keywordList);

      const remaining = await GlobalAllowKeywordService.getRemainingCount();
      setRemainingCount(remaining);
    } catch (error) {
      console.error('Failed to load keywords:', error);
    }
  }, []);

  // 画面フォーカス時にデータ読み込み
  useFocusEffect(
    React.useCallback(() => {
      loadKeywords();
    }, [loadKeywords])
  );

  const handlePressBack = () => {
    router.back();
  };

  const handleAdd = async () => {
    if (!inputText.trim()) {
      Alert.alert(t.common.error, t.globalAllowKeywords.errorEmpty);
      return;
    }

    const result = await GlobalAllowKeywordService.create(inputText);

    if (result.success) {
      setInputText('');
      inputRef.current?.blur();
      await loadKeywords();
      Alert.alert(t.common.success, t.globalAllowKeywords.addSuccess);
    } else {
      if (result.requiresPro) {
        // Pro版が必要
        Alert.alert(t.common.limit, result.message || '');
      } else {
        Alert.alert(t.common.error, result.message || t.globalAllowKeywords.errorFailed);
      }
    }
  };

  const handlePressDelete = (keyword: GlobalAllowKeyword) => {
    Alert.alert(
      t.globalAllowKeywords.deleteConfirmTitle,
      `「${keyword.keyword}」${t.globalAllowKeywords.deleteConfirmMessage}`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await GlobalAllowKeywordService.delete(keyword.id);
              await loadKeywords();
            } catch (error) {
              console.error('Failed to delete keyword:', error);
              Alert.alert(t.common.error, t.globalAllowKeywords.deleteError);
            }
          },
        },
      ]
    );
  };

  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <GlobalAllowKeywordsHeader
          onPressBack={handlePressBack}
          remainingCount={remainingCount}
        />

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* 入力欄 */}
          <View style={[styles.inputContainer, { borderBottomColor: borderColor, backgroundColor }]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t.globalAllowKeywords.inputPlaceholder}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAdd}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.addButtonText}>{t.globalAllowKeywords.add}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* 説明 */}
          <View style={styles.descriptionContainer}>
            <ThemedText style={styles.descriptionText}>
              {t.globalAllowKeywords.description}
            </ThemedText>
            {remainingCount !== null && remainingCount === 0 && (
              <ThemedText style={styles.limitText}>
                {t.globalAllowKeywords.freeLimit}
              </ThemedText>
            )}
          </View>

          {/* キーワード一覧 */}
          <FlatList
            data={keywords}
            renderItem={({ item }) => (
              <KeywordItem
                keyword={item}
                onPressDelete={() => handlePressDelete(item)}
              />
            )}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🌟</Text>
                <ThemedText style={styles.emptyText}>{t.globalAllowKeywords.emptyMessage}</ThemedText>
                <ThemedText style={styles.emptyHint}>
                  {t.globalAllowKeywords.emptyHint}
                </ThemedText>
              </View>
            }
          />
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionContainer: {
    padding: 16,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  limitText: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  keywordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  keywordText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginRight: -8,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#d32f2f',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
  },
});