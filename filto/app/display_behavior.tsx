import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/providers/theme';

// 既読表示モード（Home は当画面から import）
export type ReadDisplayMode = 'dim' | 'hide';

// 設定のストレージキー
const STORAGE_KEY_READ_DISPLAY = '@filto/display_behavior/readDisplay';
const STORAGE_KEY_AUTO_SYNC_ON_STARTUP = '@filto/display_behavior/autoSyncOnStartup';
const STORAGE_KEY_THEME = '@filto/display_behavior/theme';
const STORAGE_KEY_LANGUAGE = '@filto/display_behavior/language';

const READ_DISPLAY_OPTIONS = [
  { value: 'dim' as const, label: '薄く表示' },
  { value: 'hide' as const, label: '非表示' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

const DisplayBehaviorHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onPressBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={styles.backIcon}>←</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Display & Behavior</Text>
    <View style={styles.headerRight} />
  </View>
);

const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const Dropdown: React.FC<{ label: string; value: string; onPress: () => void }> = ({ label, value, onPress }) => (
  <View>
    <Text style={styles.dropdownLabel}>{label}</Text>
    <TouchableOpacity style={styles.dropdown} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.dropdownValue}>{value}</Text>
      <Text style={styles.dropdownIcon}>▼</Text>
    </TouchableOpacity>
  </View>
);

const DropdownModal: React.FC<{
  visible: boolean;
  title: string;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.dropdownModalContent}>
        <Text style={styles.dropdownModalTitle}>{title}</Text>
        <View style={styles.dropdownModalOptions}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.dropdownOption}
              onPress={() => { onSelect(opt.value); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownOptionText}>{opt.label}</Text>
              {selectedValue === opt.value && <Text style={styles.dropdownOptionCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

export default function DisplayBehaviorScreen() {
  const router = useRouter();
  const { setPreference } = useAppTheme();
  const [readDisplay, setReadDisplay] = useState<ReadDisplayMode>('dim');
  const [autoSyncOnStartup, setAutoSyncOnStartup] = useState(true);
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('ja');
  const [readDisplayModalVisible, setReadDisplayModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const [savedRead, savedAuto, savedTheme, savedLang] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_READ_DISPLAY),
        AsyncStorage.getItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP),
        AsyncStorage.getItem(STORAGE_KEY_THEME),
        AsyncStorage.getItem(STORAGE_KEY_LANGUAGE),
      ]);
      if (savedRead === 'dim' || savedRead === 'hide') setReadDisplay(savedRead);
      if (savedAuto !== null) setAutoSyncOnStartup(savedAuto === 'true');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') setTheme(savedTheme);
      if (savedLang === 'ja' || savedLang === 'en') setLanguage(savedLang);
    } catch (e) {
      console.error('Failed to load display/behavior settings:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const handleReadDisplay = async (mode: ReadDisplayMode) => {
    try {
      setReadDisplay(mode);
      await AsyncStorage.setItem(STORAGE_KEY_READ_DISPLAY, mode);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const handleToggleAutoSync = async () => {
    try {
      const next = !autoSyncOnStartup;
      setAutoSyncOnStartup(next);
      await AsyncStorage.setItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP, next.toString());
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const handleTheme = async (value: string) => {
    try {
      setTheme(value);
      setPreference(value as 'light' | 'dark' | 'system');
      await AsyncStorage.setItem(STORAGE_KEY_THEME, value);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const handleLanguage = async (value: string) => {
    try {
      setLanguage(value);
      await AsyncStorage.setItem(STORAGE_KEY_LANGUAGE, value);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const getReadDisplayLabel = () => READ_DISPLAY_OPTIONS.find((o) => o.value === readDisplay)?.label ?? '薄く表示';
  const getThemeLabel = () => THEME_OPTIONS.find((o) => o.value === theme)?.label ?? 'System';
  const getLanguageLabel = () => LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? '日本語';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <DisplayBehaviorHeader onPressBack={() => router.back()} />

      <ScrollView style={styles.content}>
        <SettingSection title="既読の表示方法">
          <Dropdown label="表示方法" value={getReadDisplayLabel()} onPress={() => setReadDisplayModalVisible(true)} />
        </SettingSection>

        <SettingSection title="テーマ">
          <Dropdown label="テーマ" value={getThemeLabel()} onPress={() => setThemeModalVisible(true)} />
        </SettingSection>

        <SettingSection title="言語">
          <Dropdown label="言語" value={getLanguageLabel()} onPress={() => setLanguageModalVisible(true)} />
        </SettingSection>

        <SettingSection title="起動時の挙動">
          <TouchableOpacity style={styles.toggleRow} onPress={handleToggleAutoSync} activeOpacity={0.7}>
            <View style={styles.toggleLabel}>
              <Text style={styles.toggleDescription}>
                アプリ起動時に自動的にRSSフィードを更新します（30分以上経過時のみ）
              </Text>
            </View>
            <View style={[styles.toggle, autoSyncOnStartup && styles.toggleActive]}>
              <View style={[styles.toggleThumb, autoSyncOnStartup && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </SettingSection>
      </ScrollView>

      <DropdownModal
        visible={readDisplayModalVisible}
        title="表示方法を選択"
        options={READ_DISPLAY_OPTIONS}
        selectedValue={readDisplay}
        onSelect={(v) => handleReadDisplay(v as ReadDisplayMode)}
        onClose={() => setReadDisplayModalVisible(false)}
      />
      <DropdownModal
        visible={themeModalVisible}
        title="テーマを選択"
        options={THEME_OPTIONS}
        selectedValue={theme}
        onSelect={handleTheme}
        onClose={() => setThemeModalVisible(false)}
      />
      <DropdownModal
        visible={languageModalVisible}
        title="言語を選択"
        options={LANGUAGE_OPTIONS}
        selectedValue={language}
        onSelect={handleLanguage}
        onClose={() => setLanguageModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
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
  backIcon: { fontSize: 24, color: '#1976d2' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerRight: { width: 24 },
  content: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, marginRight: 12 },
  toggleDescription: { fontSize: 13, color: '#666', lineHeight: 18 },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: '#1976d2' },
  toggleThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  dropdownLabel: { fontSize: 14, fontWeight: '500', color: '#666', marginBottom: 8 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  dropdownValue: { fontSize: 16, color: '#000' },
  dropdownIcon: { fontSize: 12, color: '#666' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%', maxWidth: 300 },
  dropdownModalTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 16, textAlign: 'center' },
  dropdownModalOptions: { gap: 4 },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionText: { fontSize: 16, color: '#000' },
  dropdownOptionCheck: { fontSize: 18, color: '#1976d2', fontWeight: '600' },
});
