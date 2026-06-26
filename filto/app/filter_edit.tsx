import React, { useState, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { FilterService, Filter } from '@/services/FilterService';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { useToast } from '@/providers/toast';
import { LoadingView } from '@/components/LoadingView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachMarks, CoachStep, CoachRect } from '@/components/CoachMarks';

// ヘッダーコンポーネント
const FilterEditHeader: React.FC<{
  isEditMode: boolean;
  onPressBack: () => void;
}> = ({ isEditMode, onPressBack }) => {
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
      <ThemedText style={styles.headerTitle}>
        {isEditMode ? t('filters.editFilter') : t('filters.addFilter')}
      </ThemedText>
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
  const iconColor = useThemeColor({}, 'text');
  return (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={iconColor}
        style={{ marginRight: 8 }}
      />
      <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
};

export default function FilterEditScreen() {
  const router = useRouter();
  const { filterId } = useLocalSearchParams<{ filterId?: string }>();
  const { t } = useTranslation();

  const isEditMode = filterId !== undefined;
  const { showToast } = useToast();

  const [blockKeyword, setBlockKeyword] = useState('');
  const [allowKeywords, setAllowKeywords] = useState('');
  const [targetTitle, setTargetTitle] = useState(true);
  const [targetDescription, setTargetDescription] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const tintColor = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const buttonTextColor = useThemeColor({ light: '#fff', dark: '#151718' }, 'text');

  // 初回チュートリアル（フィルタ画面から引き継ぎ）
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStartAtLast, setTutorialStartAtLast] = useState(false);
  const blockRef = useRef<View>(null);
  const allowRef = useRef<View>(null);
  const targetRef = useRef<View>(null);

  const measureNode = React.useCallback(
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
    { measure: () => measureNode(blockRef), title: t('filters.blockKeyword'), desc: t('filters.tutBlockDesc') },
    { measure: () => measureNode(allowRef), title: t('filters.allowKeyword'), desc: t('filters.tutAllowDesc') },
    { measure: () => measureNode(targetRef), title: t('filters.searchTarget'), desc: t('filters.tutTargetDesc') },
  ], [t, measureNode]);

  // フィルタ画面の「次へ」('1')で push されてきたら、フラグを見てツアー継続。
  // 即 visible にして暗幕を出す（計測は CoachMarks 側でリトライ）
  React.useEffect(() => {
    AsyncStorage.getItem('@filto/tour/filterEdit').then((flag) => {
      if (flag === '1' || flag === 'last') {
        AsyncStorage.removeItem('@filto/tour/filterEdit').catch(() => {});
        setTutorialStartAtLast(flag === 'last');
        setTutorialVisible(true);
      }
    }).catch(() => {});
  }, []);

  // 最初のステップで「戻る」→ フィルタ画面のツアー最後へ戻る
  const handleTutorialBack = React.useCallback(async () => {
    setTutorialVisible(false);
    try { await AsyncStorage.setItem('@filto/tour/filters', 'last'); } catch {}
    router.dismissAll();
    router.navigate('/filters');
  }, [router]);

  // 最後の「次へ」で、フィード画面へ進みツアー継続
  const handleTutorialDone = React.useCallback(async () => {
    setTutorialVisible(false);
    try { await AsyncStorage.setItem('@filto/tour/feeds', '1'); } catch {}
    router.dismissAll();
    router.navigate('/feeds');
  }, [router]);

  // 編集モード時、フィルタを読み込む
  React.useEffect(() => {
    if (filterId) {
      loadFilter();
    }
  }, [filterId]);

  const loadFilter = async () => {
    setIsLoading(true);
    try {
      const filter = await FilterService.get(parseInt(filterId!, 10));
      if (filter) {
        setBlockKeyword(filter.block_keyword);
        setAllowKeywords(filter.allow_keyword ?? '');
        setTargetTitle(filter.target_title === 1);
        setTargetDescription(filter.target_description === 1);
      }
    } catch (_) {
      Alert.alert(t('common.error'), t('filters.saveError'));
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!blockKeyword.trim()) {
      Alert.alert(t('common.error'), t('filters.blockKeywordRequired'));
      return;
    }

    if (!targetTitle && !targetDescription) {
      Alert.alert(t('common.error'), t('filters.atLeastOneTarget'));
      return;
    }

    setIsSaving(true);

    try {
      const now = Math.floor(Date.now() / 1000);
      const filterData: Filter = {
        ...(isEditMode ? { id: parseInt(filterId!, 10) } : {}),
        block_keyword: blockKeyword.trim(),
        allow_keyword: allowKeywords.trim() || null,
        target_title: targetTitle ? 1 : 0,
        target_description: targetDescription ? 1 : 0,
        created_at: now,
        updated_at: now,
      };

      await FilterService.save(filterData);

      showToast(t('common.saved'), 'success');
      router.back();
    } catch (_) {
      Alert.alert(t('common.error'), t('filters.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('filters.confirmDelete'),
      t('filters.confirmDeleteWithKeyword', { keyword: blockKeyword }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await FilterService.delete(parseInt(filterId!, 10));
              router.back();
            } catch (error) {
              Alert.alert(t('common.error'), t('filters.deleteError'));
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
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <FilterEditHeader isEditMode={isEditMode} onPressBack={() => router.back()} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <FilterEditHeader isEditMode={isEditMode} onPressBack={() => router.back()} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ブロックキーワード */}
          <View ref={blockRef} style={styles.fieldContainer}>
            <ThemedText style={styles.label}>{t('filters.blockKeyword')}</ThemedText>
            <TextInput
              style={[styles.textInput, { color: textColor, borderColor, backgroundColor }]}
              value={blockKeyword}
              onChangeText={setBlockKeyword}
              placeholder={t('filters.blockKeywordPlaceholder')}
              placeholderTextColor={borderColor}
              maxLength={50}
              editable={!isSaving && !isDeleting}
            />
          </View>

          {/* 許可キーワード */}
          <View ref={allowRef} style={styles.fieldContainer}>
            <ThemedText style={styles.label}>{t('filters.allowKeyword')}</ThemedText>
            <ThemedText style={styles.hint}>{t('filters.allowKeywordHint')}</ThemedText>
            <TextInput
              style={[styles.textInput, styles.multilineInput, { color: textColor, borderColor, backgroundColor }]}
              value={allowKeywords}
              onChangeText={setAllowKeywords}
              placeholder={t('filters.allowKeywordPlaceholder')}
              placeholderTextColor={borderColor}
              multiline
              maxLength={500}
              editable={!isSaving && !isDeleting}
            />
          </View>

          {/* 検索対象 */}
          <View ref={targetRef} style={styles.fieldContainer}>
            <ThemedText style={styles.label}>{t('filters.searchTarget')}</ThemedText>
            <View style={styles.checkboxRow}>
              <Checkbox
                checked={targetTitle}
                label={t('filters.targetTitle')}
                onToggle={() => setTargetTitle(!targetTitle)}
              />
              <Checkbox
                checked={targetDescription}
                label={t('filters.targetDescription')}
                onToggle={() => setTargetDescription(!targetDescription)}
              />
            </View>
          </View>

          {/* ボタン */}
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

            {isEditMode && (
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
            )}
          </View>
        </ScrollView>

        <CoachMarks
          visible={tutorialVisible}
          steps={tutorialSteps}
          onDone={handleTutorialDone}
          continues
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
  backIcon: {
    fontSize: 20,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  },
  checkboxLabel: {
    fontSize: 16,
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
    color: '#fff',
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