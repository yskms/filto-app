import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 既読表示モード
export type ReadDisplayMode = 'dim' | 'hide';

// 設定のストレージキー
const STORAGE_KEY_READ_DISPLAY = '@filto/preferences/readDisplay';
const STORAGE_KEY_AUTO_SYNC_ON_STARTUP = '@filto/preferences/autoSyncOnStartup';

// ヘッダーコンポーネント
const PreferencesHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onPressBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Preferences</Text>
      <View style={styles.headerRight} />
    </View>
  );
};

// 設定セクションコンポーネント
const SettingSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

// 選択ボタンコンポーネント
const SelectButton: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.selectButton, selected && styles.selectButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.selectButtonText, selected && styles.selectButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function PreferencesScreen() {
  const router = useRouter();
  const [readDisplay, setReadDisplay] = useState<ReadDisplayMode>('dim');
  const [autoSyncOnStartup, setAutoSyncOnStartup] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 設定を読み込む
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedReadDisplay = await AsyncStorage.getItem(STORAGE_KEY_READ_DISPLAY);
      if (savedReadDisplay === 'dim' || savedReadDisplay === 'hide') {
        setReadDisplay(savedReadDisplay);
      }

      const savedAutoSync = await AsyncStorage.getItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP);
      if (savedAutoSync !== null) {
        setAutoSyncOnStartup(savedAutoSync === 'true');
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 画面フォーカス時に設定を読み込む
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  // 戻るボタン
  const handlePressBack = () => {
    router.back();
  };

  // 既読表示モードを変更
  const handleChangeReadDisplay = async (mode: ReadDisplayMode) => {
    try {
      setReadDisplay(mode);
      await AsyncStorage.setItem(STORAGE_KEY_READ_DISPLAY, mode);
    } catch (error) {
      console.error('Failed to save read display mode:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  // 起動時自動更新を変更
  const handleToggleAutoSync = async () => {
    try {
      const newValue = !autoSyncOnStartup;
      setAutoSyncOnStartup(newValue);
      await AsyncStorage.setItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP, newValue.toString());
    } catch (error) {
      console.error('Failed to save auto sync setting:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <PreferencesHeader onPressBack={handlePressBack} />

      <View style={styles.content}>
        <SettingSection title="起動時に更新">
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={handleToggleAutoSync}
            activeOpacity={0.7}
          >
            <View style={styles.toggleLabel}>
              {/* <Text style={styles.toggleTitle}>自動でRSSを取得</Text> */}
              <Text style={styles.toggleDescription}>
                アプリ起動時に自動的にRSSフィードを更新します（30分以上経過時のみ）
              </Text>
            </View>
            <View style={[styles.toggle, autoSyncOnStartup && styles.toggleActive]}>
              <View style={[styles.toggleThumb, autoSyncOnStartup && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </SettingSection>

        <SettingSection title="既読の表示方法">
          <View style={styles.buttonGroup}>
            <SelectButton
              label="薄く表示"
              selected={readDisplay === 'dim'}
              onPress={() => handleChangeReadDisplay('dim')}
            />
            <SelectButton
              label="非表示"
              selected={readDisplay === 'hide'}
              onPress={() => handleChangeReadDisplay('hide')}
            />
          </View>
        </SettingSection>

        <View style={styles.comingSoonSection}>
          <Text style={styles.comingSoonText}>その他の設定は今後追加予定です</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backIcon: {
    fontSize: 24,
    color: '#1976d2',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 24, // To balance the back button
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonActive: {
    borderColor: '#1976d2',
    backgroundColor: '#e3f2fd',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  selectButtonTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#1976d2',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  comingSoonSection: {
    marginTop: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
