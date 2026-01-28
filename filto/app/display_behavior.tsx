import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/providers/theme';
import { useLanguage } from '@/providers/language';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

// 既読表示モード（Home は当画面から import）
export type ReadDisplayMode = 'dim' | 'hide';

// 設定のストレージキー
const STORAGE_KEY_READ_DISPLAY = '@filto/display_behavior/readDisplay';
const STORAGE_KEY_AUTO_SYNC_ON_STARTUP = '@filto/display_behavior/autoSyncOnStartup';

const DisplayBehaviorHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backIcon}>{t.common.back}</Text>
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>{t.displayBehavior.title}</ThemedText>
      <View style={styles.headerRight} />
    </View>
  );
};

const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={[styles.sectionContent, { backgroundColor }]}>{children}</View>
    </View>
  );
};

const Dropdown: React.FC<{ label: string; value: string; onPress: () => void }> = ({
  label,
  value,
  onPress,
}) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View>
      <ThemedText style={styles.dropdownLabel}>{label}</ThemedText>
      <TouchableOpacity
        style={[styles.dropdown, { borderColor, backgroundColor }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.dropdownValue}>{value}</ThemedText>
        <ThemedText style={styles.dropdownIcon}>▼</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const DropdownModal: React.FC<{
  visible: boolean;
  title: string;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}> = ({ visible, title, options, selectedValue, onSelect, onClose }) => {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.dropdownModalContent, { backgroundColor }]}>
          <ThemedText style={styles.dropdownModalTitle}>{title}</ThemedText>
          <View style={styles.dropdownModalOptions}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.dropdownOptionText}>{opt.label}</ThemedText>
                {selectedValue === opt.value && (
                  <ThemedText style={styles.dropdownOptionCheck}>✓</ThemedText>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function DisplayBehaviorScreen() {
  const router = useRouter();
  const { setPreference } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  
  const [readDisplay, setReadDisplay] = useState<ReadDisplayMode>('dim');
  const [autoSyncOnStartup, setAutoSyncOnStartup] = useState(true);
  const [theme, setTheme] = useState('system');
  const [readDisplayModalVisible, setReadDisplayModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // オプションを翻訳から取得
  const READ_DISPLAY_OPTIONS = [
    { value: 'dim' as const, label: t.displayBehavior.dimDisplay },
    { value: 'hide' as const, label: t.displayBehavior.hideDisplay },
  ];

  const THEME_OPTIONS = [
    { value: 'light', label: t.displayBehavior.light },
    { value: 'dark', label: t.displayBehavior.dark },
    { value: 'system', label: t.displayBehavior.system },
  ];

  const LANGUAGE_OPTIONS = [
    { value: 'ja', label: t.displayBehavior.japanese },
    { value: 'en', label: t.displayBehavior.english },
  ];

  const loadSettings = useCallback(async () => {
    try {
      const [savedRead, savedAuto, savedTheme] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_READ_DISPLAY),
        AsyncStorage.getItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP),
        AsyncStorage.getItem('@filto/display_behavior/theme'),
      ]);
      if (savedRead === 'dim' || savedRead === 'hide') setReadDisplay(savedRead);
      if (savedAuto !== null) setAutoSyncOnStartup(savedAuto === 'true');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') setTheme(savedTheme);
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
      Alert.alert(t.common.error, 'Failed to save settings');
    }
  };

  const handleToggleAutoSync = async () => {
    try {
      const next = !autoSyncOnStartup;
      setAutoSyncOnStartup(next);
      await AsyncStorage.setItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP, next.toString());
    } catch (e) {
      console.error(e);
      Alert.alert(t.common.error, 'Failed to save settings');
    }
  };

  const handleTheme = async (value: string) => {
    try {
      setTheme(value);
      setPreference(value as 'light' | 'dark' | 'system');
      await AsyncStorage.setItem('@filto/display_behavior/theme', value);
    } catch (e) {
      console.error(e);
      Alert.alert(t.common.error, 'Failed to save settings');
    }
  };

  const handleLanguage = async (value: string) => {
    try {
      setLanguage(value as 'ja' | 'en');
    } catch (e) {
      console.error(e);
      Alert.alert(t.common.error, 'Failed to save settings');
    }
  };

  const getReadDisplayLabel = () => READ_DISPLAY_OPTIONS.find((o) => o.value === readDisplay)?.label ?? t.displayBehavior.dimDisplay;
  const getThemeLabel = () => THEME_OPTIONS.find((o) => o.value === theme)?.label ?? t.displayBehavior.system;
  const getLanguageLabel = () => LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? t.displayBehavior.japanese;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <DisplayBehaviorHeader onPressBack={() => router.back()} />

      <ScrollView style={styles.content}>
        <SettingSection title={t.displayBehavior.readDisplayMode}>
          <Dropdown label={t.displayBehavior.displayMethod} value={getReadDisplayLabel()} onPress={() => setReadDisplayModalVisible(true)} />
        </SettingSection>

        <SettingSection title={t.displayBehavior.theme}>
          <Dropdown label={t.displayBehavior.themeLabel} value={getThemeLabel()} onPress={() => setThemeModalVisible(true)} />
        </SettingSection>

        <SettingSection title={t.displayBehavior.language}>
          <Dropdown label={t.displayBehavior.languageLabel} value={getLanguageLabel()} onPress={() => setLanguageModalVisible(true)} />
        </SettingSection>

        <SettingSection title={t.displayBehavior.startupBehavior}>
          <TouchableOpacity style={styles.toggleRow} onPress={handleToggleAutoSync} activeOpacity={0.7}>
            <View style={styles.toggleLabel}>
              <Text style={styles.toggleDescription}>
                {t.displayBehavior.autoSyncDescription}
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
        title={t.displayBehavior.selectDisplayMethod}
        options={READ_DISPLAY_OPTIONS}
        selectedValue={readDisplay}
        onSelect={(v) => handleReadDisplay(v as ReadDisplayMode)}
        onClose={() => setReadDisplayModalVisible(false)}
      />
      <DropdownModal
        visible={themeModalVisible}
        title={t.displayBehavior.selectTheme}
        options={THEME_OPTIONS}
        selectedValue={theme}
        onSelect={handleTheme}
        onClose={() => setThemeModalVisible(false)}
      />
      <DropdownModal
        visible={languageModalVisible}
        title={t.displayBehavior.selectLanguage}
        options={LANGUAGE_OPTIONS}
        selectedValue={language}
        onSelect={handleLanguage}
        onClose={() => setLanguageModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backIcon: { fontSize: 24, color: '#1976d2' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerRight: { width: 24 },
  content: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: { borderRadius: 12, padding: 16 },
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
  },
  dropdownValue: { fontSize: 16 },
  dropdownIcon: { fontSize: 12, color: '#666' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModalContent: { borderRadius: 12, padding: 20, width: '80%', maxWidth: 300 },
  dropdownModalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  dropdownModalOptions: { gap: 4 },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionText: { fontSize: 16 },
  dropdownOptionCheck: { fontSize: 18, color: '#1976d2', fontWeight: '600' },
});