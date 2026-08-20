import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';
import { GlobalAllowKeywordService, FREE_LIMIT } from '@/services/GlobalAllowKeywordService';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { useToast } from '@/providers/toast';

// ヘッダーコンポーネント
const GlobalAllowKeywordsHeader: React.FC<{
  onPressBack: () => void;
  remainingCount: number | null;
}> = ({ onPressBack, remainingCount }) => {
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
      <View style={styles.headerCenter}>
        <ThemedText style={styles.headerTitle}>{t('globalAllowKeywords.title')}</ThemedText>
        {remainingCount !== null && (
          <ThemedText style={styles.remainingText}>
            {t('globalAllowKeywords.remaining', { count: remainingCount })}
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
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const dangerColor = useThemeColor({}, 'danger');

  return (
    <View style={[styles.keywordItem, { backgroundColor, borderBottomColor: borderColor }]}>
      <ThemedText style={styles.keywordText}>{keyword.keyword}</ThemedText>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onPressDelete}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={20} color={dangerColor} />
      </TouchableOpacity>
    </View>
  );
};

export default function GlobalAllowKeywordsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [keywords, setKeywords] = useState<GlobalAllowKeyword[]>([]);
  const [inputText, setInputText] = useState('');
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // データ読み込み
  const loadKeywords = React.useCallback(async () => {
    try {
      const keywordList = await GlobalAllowKeywordService.list();
      setKeywords(keywordList);

      const remaining = await GlobalAllowKeywordService.getRemainingCount();
      setRemainingCount(remaining);
    } catch (_) {
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
      Alert.alert(t('common.error'), t('globalAllowKeywords.inputRequired'));
      return;
    }

    if (isAdding) return;
    setIsAdding(true);

    try {
      const result = await GlobalAllowKeywordService.create(inputText);

      if (result.success) {
        setInputText('');
        inputRef.current?.blur();
        await loadKeywords();
        showToast(t('common.added'), 'success');
      } else {
        if (result.requiresPro) {
          Alert.alert(t('common.confirm'), result.message || t('globalAllowKeywords.freeLimitReached', { limit: FREE_LIMIT }));
        } else {
          Alert.alert(t('common.error'), result.message || t('globalAllowKeywords.addError'));
        }
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handlePressDelete = (keyword: GlobalAllowKeyword) => {
    Alert.alert(
      t('common.delete'),
      t('globalAllowKeywords.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await GlobalAllowKeywordService.delete(keyword.id);
              await loadKeywords();
            } catch (_) {
              Alert.alert(t('common.error'), t('globalAllowKeywords.deleteError'));
            }
          },
        },
      ]
    );
  };

  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const textColor = useThemeColor({}, 'text');
  const emptyIconColor = useThemeColor({}, 'tabIconDefault');
  const tintColor = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({ light: '#fff', dark: '#151718' }, 'text');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
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
              style={[styles.input, { color: textColor, borderColor }]}
              placeholder={t('globalAllowKeywords.inputPlaceholder')}
              placeholderTextColor={borderColor}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: tintColor }, isAdding && { opacity: 0.5 }]}
              onPress={handleAdd}
              activeOpacity={0.7}
              disabled={isAdding}
            >
              <ThemedText style={[styles.addButtonText, { color: buttonTextColor }]}>{t('common.add')}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* 説明 */}
          <View style={styles.descriptionContainer}>
            <ThemedText style={styles.descriptionText}>
              {t('globalAllowKeywords.description')}
            </ThemedText>
            {remainingCount !== null && remainingCount === 0 && (
              <ThemedText style={styles.limitText}>
                {t('globalAllowKeywords.freeLimitReached', { limit: FREE_LIMIT })}
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
                <Ionicons name="star-outline" size={64} color={emptyIconColor} style={styles.emptyIconStyle} />
                <ThemedText style={styles.emptyText}>{t('globalAllowKeywords.noKeywords')}</ThemedText>
                <ThemedText style={styles.emptyHint}>
                  {t('globalAllowKeywords.noKeywordsHint')}
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
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    height: 40,
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
  },
  keywordText: {
    fontSize: 16,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginRight: -8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconStyle: {
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
  },
});
