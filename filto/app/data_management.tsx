import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArticleRepository } from '@/repositories/ArticleRepository';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

const STORAGE_KEY_ARTICLE_RETENTION_DAYS = '@filto/data_management/articleRetentionDays';
const STORAGE_KEY_DELETE_STARRED_IN_AUTO = '@filto/data_management/deleteStarredInAutoDelete';

const DataManagementHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
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
      <ThemedText style={styles.headerTitle}>{t.dataManagement.title}</ThemedText>
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
  options: Array<{ value: number; label: string }>;
  selectedValue: number;
  onSelect: (value: number) => void;
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

export default function DataManagementScreen() {
  const router = useRouter();
  const t = useTranslation();
  const [retentionDays, setRetentionDays] = useState(30);
  const [deleteStarredInAuto, setDeleteStarredInAuto] = useState(false);
  const [retentionModalVisible, setRetentionModalVisible] = useState(false);
  const [manualDeleteModalVisible, setManualDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const RETENTION_OPTIONS = [
    { value: 7, label: `7${t.dataManagement.days}` },
    { value: 30, label: `30${t.dataManagement.days}` },
    { value: 90, label: `90${t.dataManagement.days}` },
    { value: 0, label: t.dataManagement.unlimited },
  ];

  const MANUAL_DELETE_OPTIONS = [
    { value: -1, label: t.dataManagement.deleteAll },
    { value: 1, label: `1${t.dataManagement.days}${t.dataManagement.olderThan}` },
    { value: 3, label: `3${t.dataManagement.days}${t.dataManagement.olderThan}` },
    { value: 7, label: `7${t.dataManagement.days}${t.dataManagement.olderThan}` },
    { value: 14, label: `14${t.dataManagement.days}${t.dataManagement.olderThan}` },
  ];

  const loadSettings = useCallback(async () => {
    try {
      const [savedRetention, savedDeleteStarred] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ARTICLE_RETENTION_DAYS),
        AsyncStorage.getItem(STORAGE_KEY_DELETE_STARRED_IN_AUTO),
      ]);
      if (savedRetention !== null) setRetentionDays(parseInt(savedRetention, 10));
      if (savedDeleteStarred !== null) setDeleteStarredInAuto(savedDeleteStarred === 'true');
    } catch (e) {
      console.error('Failed to load data management settings:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const handleRetentionDays = async (days: number) => {
    try {
      setRetentionDays(days);
      await AsyncStorage.setItem(STORAGE_KEY_ARTICLE_RETENTION_DAYS, days.toString());
    } catch (e) {
      console.error(e);
      Alert.alert(t.common.error, 'Failed to save settings');
    }
  };

  const handleToggleDeleteStarred = async () => {
    try {
      const next = !deleteStarredInAuto;
      setDeleteStarredInAuto(next);
      await AsyncStorage.setItem(STORAGE_KEY_DELETE_STARRED_IN_AUTO, next.toString());
    } catch (e) {
      console.error(e);
      Alert.alert(t.common.error, 'Failed to save settings');
    }
  };

  const handleManualDelete = async (days: number) => {
    const isDeleteAll = days === -1;
    const confirmMessage = isDeleteAll 
      ? t.dataManagement.deleteConfirmAll
      : `${days}${t.dataManagement.days}${t.dataManagement.deleteConfirmOlder}`;

    Alert.alert(
      t.dataManagement.deleteConfirmTitle,
      confirmMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const deletedCount = await ArticleRepository.deleteOldArticles(days, deleteStarredInAuto);
              Alert.alert(t.common.success, `${deletedCount}${t.dataManagement.deleteSuccess}`);
            } catch (error) {
              console.error('Failed to delete articles:', error);
              Alert.alert(t.common.error, 'Failed to delete articles');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getRetentionLabel = () => {
    const option = RETENTION_OPTIONS.find((o) => o.value === retentionDays);
    return option?.label ?? `30${t.dataManagement.days}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <DataManagementHeader onPressBack={() => router.back()} />

      <ScrollView style={styles.content}>
        <SettingSection title={t.dataManagement.cachePeriod}>
          <Dropdown
            label={t.dataManagement.cachePeriod}
            value={getRetentionLabel()}
            onPress={() => setRetentionModalVisible(true)}
          />
        </SettingSection>

        <SettingSection title={t.dataManagement.deleteStarredOption}>
          <TouchableOpacity style={styles.toggleRow} onPress={handleToggleDeleteStarred} activeOpacity={0.7}>
            <View style={styles.toggleLabel}>
              <ThemedText style={styles.toggleDescription}>
                {t.dataManagement.deleteStarredOption}
              </ThemedText>
            </View>
            <View style={[styles.toggle, deleteStarredInAuto && styles.toggleActive]}>
              <View style={[styles.toggleThumb, deleteStarredInAuto && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </SettingSection>

        <SettingSection title={t.dataManagement.manualDelete}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setManualDeleteModalVisible(true)}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.deleteButtonText}>{t.dataManagement.deleteButton}</ThemedText>
            )}
          </TouchableOpacity>
        </SettingSection>
      </ScrollView>

      <DropdownModal
        visible={retentionModalVisible}
        title={t.dataManagement.selectCachePeriod}
        options={RETENTION_OPTIONS}
        selectedValue={retentionDays}
        onSelect={handleRetentionDays}
        onClose={() => setRetentionModalVisible(false)}
      />

      <DropdownModal
        visible={manualDeleteModalVisible}
        title={t.dataManagement.selectDays}
        options={MANUAL_DELETE_OPTIONS}
        selectedValue={-2}
        onSelect={(days) => {
          setManualDeleteModalVisible(false);
          handleManualDelete(days);
        }}
        onClose={() => setManualDeleteModalVisible(false)}
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
  toggleDescription: { fontSize: 14, color: '#666', lineHeight: 18 },
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
  deleteButton: {
    height: 48,
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
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