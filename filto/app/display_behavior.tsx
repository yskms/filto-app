import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/providers/theme';
import { useLanguage, useTranslation } from '@/providers/language';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

// 既読表示モード
export type ReadDisplayMode = 'dim' | 'hide';

// 設定のストレージキー
const STORAGE_KEY_READ_DISPLAY = '@filto/display_behavior/readDisplay';
const STORAGE_KEY_AUTO_SYNC_ON_STARTUP = '@filto/display_behavior/autoSyncOnStartup';

const DisplayBehaviorHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ThemedText style={styles.backIcon}>←</ThemedText>
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>{t('displayBehavior.title')}</ThemedText>
      <View style={styles.headerRight} />
    </View>
  );
};

const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
};

const Dropdown: React.FC<{ label: string; value: string; onPress: () => void }> = ({ label, value, onPress }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');

  return (
    <TouchableOpacity
      style={[styles.dropdownRow, { borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ThemedText style={styles.dropdownLabel}>{label}</ThemedText>
      <View style={styles.dropdownRight}>
        <ThemedText style={styles.dropdownValue}>{value}</ThemedText>
        <ThemedText style={styles.dropdownIcon}>›</ThemedText>
      </View>
    </TouchableOpacity>
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
      <TouchableOpacity style={styles.dropdownModalOverlay} activeOpacity={1} onPress={onClose}>
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
  const { setPreference, preference: themePreference } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  
  const [readDisplay, setReadDisplay] = useState<ReadDisplayMode>('dim');
  const [autoSyncOnStartup, setAutoSyncOnStartup] = useState(true);
  const [readDisplayModalVisible, setReadDisplayModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const [savedRead, savedAuto] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_READ_DISPLAY),
        AsyncStorage.getItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP),
      ]);
      
      if (savedRead === 'dim' || savedRead === 'hide') setReadDisplay(savedRead);
      if (savedAuto !== null) setAutoSyncOnStartup(savedAuto === 'true');
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
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleToggleAutoSync = async () => {
    try {
      const next = !autoSyncOnStartup;
      setAutoSyncOnStartup(next);
      await AsyncStorage.setItem(STORAGE_KEY_AUTO_SYNC_ON_STARTUP, next.toString());
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleTheme = async (value: string) => {
    try {
      setPreference(value as 'light' | 'dark' | 'system');
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  const handleLanguage = async (value: string) => {
    try {
      await setLanguage(value as 'ja' | 'en');
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('displayBehavior.saveError'));
    }
  };

  // 選択肢の定義（翻訳付き）
  const READ_DISPLAY_OPTIONS = [
    { value: 'dim' as const, label: t('displayBehavior.readDisplayDim') },
    { value: 'hide' as const, label: t('displayBehavior.readDisplayHide') },
  ];

  const THEME_OPTIONS = [
    { value: 'light', label: t('displayBehavior.themeLight') },
    { value: 'dark', label: t('displayBehavior.themeDark') },
    { value: 'system', label: t('displayBehavior.themeSystem') },
  ];

  const LANGUAGE_OPTIONS = [
    { value: 'ja', label: t('displayBehavior.languageJa') },
    { value: 'en', label: t('displayBehavior.languageEn') },
  ];

  const getReadDisplayLabel = () => READ_DISPLAY_OPTIONS.find((o) => o.value === readDisplay)?.label ?? t('displayBehavior.readDisplayDim');
  const getThemeLabel = () => THEME_OPTIONS.find((o) => o.value === themePreference)?.label ?? t('displayBehavior.themeSystem');
  const getLanguageLabel = () => LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? t('displayBehavior.languageJa');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <DisplayBehaviorHeader onPressBack={() => router.back()} />

      <ScrollView style={styles.content}>
        <SettingSection title={t('displayBehavior.readDisplayMode')}>
          <Dropdown 
            label={t('displayBehavior.readDisplayMode')} 
            value={getReadDisplayLabel()} 
            onPress={() => setReadDisplayModalVisible(true)} 
          />
        </SettingSection>

        <SettingSection title={t('displayBehavior.theme')}>
          <Dropdown 
            label={t('displayBehavior.theme')} 
            value={getThemeLabel()} 
            onPress={() => setThemeModalVisible(true)} 
          />
        </SettingSection>

        <SettingSection title={t('displayBehavior.language')}>
          <Dropdown 
            label={t('displayBehavior.language')} 
            value={getLanguageLabel()} 
            onPress={() => setLanguageModalVisible(true)} 
          />
        </SettingSection>

        <SettingSection title={t('displayBehavior.startupBehavior')}>
          <TouchableOpacity style={styles.toggleRow} onPress={handleToggleAutoSync} activeOpacity={0.7}>
            <View style={styles.toggleLabel}>
              <ThemedText style={styles.toggleDescription}>
                {t('displayBehavior.autoSyncOnStartup')}
              </ThemedText>
            </View>
            <View style={[styles.toggle, autoSyncOnStartup && styles.toggleActive]}>
              <View style={[styles.toggleThumb, autoSyncOnStartup && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </SettingSection>
      </ScrollView>

      {/* 既読表示モードモーダル */}
      <DropdownModal
        visible={readDisplayModalVisible}
        title={t('displayBehavior.readDisplayMode')}
        options={READ_DISPLAY_OPTIONS}
        selectedValue={readDisplay}
        onSelect={(value) => handleReadDisplay(value as ReadDisplayMode)}
        onClose={() => setReadDisplayModalVisible(false)}
      />

      {/* テーマモーダル */}
      <DropdownModal
        visible={themeModalVisible}
        title={t('displayBehavior.theme')}
        options={THEME_OPTIONS}
        selectedValue={themePreference}
        onSelect={handleTheme}
        onClose={() => setThemeModalVisible(false)}
      />

      {/* 言語モーダル */}
      <DropdownModal
        visible={languageModalVisible}
        title={t('displayBehavior.language')}
        options={LANGUAGE_OPTIONS}
        selectedValue={language}
        onSelect={handleLanguage}
        onClose={() => setLanguageModalVisible(false)}
      />
    </SafeAreaView>
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
  backIcon: {
    fontSize: 24,
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownLabel: {
    fontSize: 16,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownValue: {
    fontSize: 16,
    opacity: 0.6,
  },
  dropdownIcon: {
    fontSize: 20,
    opacity: 0.4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLabel: {
    flex: 1,
    marginRight: 16,
  },
  toggleDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#e0e0e0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownModalOptions: {
    gap: 0,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  dropdownOptionText: {
    fontSize: 16,
  },
  dropdownOptionCheck: {
    fontSize: 18,
    color: '#007AFF',
  },
});