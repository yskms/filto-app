import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FilterService, Filter } from '@/services/FilterService';

// ヘッダーコンポーネント
const FilterEditHeader: React.FC<{
  isEditMode: boolean;
  onPressBack: () => void;
}> = ({ isEditMode, onPressBack }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPressBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {isEditMode ? 'Edit Filter' : 'Add Filter'}
      </Text>
      <View style={styles.headerRight} />
    </View>
  );
};

// チェックボックスコンポーネント
const Checkbox: React.FC<{
  checked: boolean;
  label: string;
  onToggle: () => void;
}> = ({ checked, label, onToggle }) => {
  return (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={styles.checkboxIcon}>{checked ? '☑' : '☐'}</Text>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

export default function FilterEditScreen() {
  const router = useRouter();
  const { filterId } = useLocalSearchParams<{ filterId?: string }>();

  const isEditMode = filterId !== undefined;

  const [blockKeyword, setBlockKeyword] = useState('');
  const [allowKeywords, setAllowKeywords] = useState('');
  const [targetTitle, setTargetTitle] = useState(true);
  const [targetDescription, setTargetDescription] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 編集モード時、フィルタを読み込む（Step 3: データ読み込み）
  React.useEffect(() => {
    if (filterId) {
      loadFilter();
    }
  }, [filterId]);

  const loadFilter = async () => {
    setIsLoading(true);
    try {
      const filter = await FilterService.get(parseInt(filterId!));

      setBlockKeyword(filter.block_keyword);

      // カンマ区切りを改行区切りに変換
      setAllowKeywords(
        filter.allow_keyword
          ?.split(',')
          .map((k: string) => k.trim())
          .join('\n') || ''
      );

      setTargetTitle(filter.target_title === 1);
      setTargetDescription(filter.target_description === 1);
    } catch (error) {
      Alert.alert('エラー', 'フィルタの読み込みに失敗しました');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: 保存処理
  const handleSave = async () => {
    // バリデーション
    if (!blockKeyword.trim()) {
      Alert.alert('エラー', 'ブロックキーワードを入力してください');
      return;
    }

    if (!targetTitle && !targetDescription) {
      Alert.alert('エラー', 'タイトルまたは概要のいずれかを選択してください');
      return;
    }

    setIsSaving(true);

    try {
      // 改行区切りをカンマ区切りに変換
      const allowKeywordsForDB = allowKeywords
        .split('\n')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .join(',');

      const now = Math.floor(Date.now() / 1000);
      const filter: Filter = {
        id: filterId ? parseInt(filterId) : undefined,
        block_keyword: blockKeyword.trim(),
        allow_keyword: allowKeywordsForDB || null,
        target_title: targetTitle ? 1 : 0,
        target_description: targetDescription ? 1 : 0,
        created_at: now,
        updated_at: now,
      };

      await FilterService.save(filter);
      router.back();
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 3: 削除処理
  const handleDelete = () => {
    Alert.alert(
      'フィルタを削除',
      'このフィルタを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await FilterService.delete(parseInt(filterId!));
              router.back();
            } catch (error) {
              Alert.alert('エラー', '削除に失敗しました。もう一度お試しください。');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const isSaveDisabled =
    !blockKeyword.trim() ||
    (!targetTitle && !targetDescription) ||
    isSaving ||
    isLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <FilterEditHeader isEditMode={isEditMode} onPressBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Step 1: ヘッダー */}
        <FilterEditHeader isEditMode={isEditMode} onPressBack={() => router.back()} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 2: ブロックキーワード */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>ブロックキーワード</Text>
            <TextInput
              style={styles.textInput}
              value={blockKeyword}
              onChangeText={setBlockKeyword}
              placeholder="例: FX"
              placeholderTextColor="#999"
              editable={!isSaving && !isDeleting}
            />
          </View>

          {/* Step 2: 許可キーワード */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>許可キーワード（任意）</Text>
            <Text style={styles.hint}>1行に1キーワード</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={allowKeywords}
              onChangeText={setAllowKeywords}
              placeholder="例:&#10;仮想通貨&#10;web3&#10;crypto"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSaving && !isDeleting}
            />
          </View>

          {/* Step 2: 対象 */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>対象</Text>
            <View style={styles.checkboxRow}>
              <Checkbox
                checked={targetTitle}
                label="タイトル"
                onToggle={() => setTargetTitle(!targetTitle)}
              />
              <Checkbox
                checked={targetDescription}
                label="概要"
                onToggle={() => setTargetDescription(!targetDescription)}
              />
            </View>
          </View>

          {/* Step 3: ボタン */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSaveDisabled && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaveDisabled}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>

            {isEditMode && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isDeleting || isSaving}
                activeOpacity={0.7}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ff3b30" />
                ) : (
                  <Text style={styles.deleteButtonText}>削除</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  backIcon: {
    fontSize: 20,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxIcon: {
    fontSize: 20,
    marginRight: 8,
    color: '#000',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
  },
});

