import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { restartOnboarding } from '@/utils/onboarding';
import { resetFeedsAndFilters } from '@/database/init';
import { SyncService } from '@/services/SyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '@/constants/storageKeys';

interface MenuItem {
  id: string;
  title: string;
  ionIcon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  /** この項目の前にグループ区切りの余白を入れる */
  sectionBreak?: boolean;
}

// メニューアイテムコンポーネント
const MenuItemRow: React.FC<{
  item: MenuItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const iconColor = useThemeColor({}, 'icon');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: borderColor, backgroundColor }]}
      onPress={onPress}
      disabled={item.disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.menuItemContent, item.disabled && styles.menuItemDisabled]}>
        <View style={styles.menuItemLeft}>
          {item.ionIcon != null && (
            <Ionicons name={item.ionIcon} size={20} color={iconColor} />
          )}
          <ThemedText style={styles.menuItemText}>{item.title}</ThemedText>
        </View>
        {!item.disabled && (
          <Ionicons name="chevron-forward" size={20} color={iconColor} />
        )}
      </View>
    </TouchableOpacity>
  );
};

// ヘッダーコンポーネント
const SettingsHeader: React.FC = () => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <ThemedText style={styles.headerTitle}>{t('settings.title')}</ThemedText>
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const { t } = useTranslation();

  const menuItems: MenuItem[] = [
    // 一般設定グループ（使い方・表示方針の選び直し）
    { id: 'global_allow_keywords', title: t('settings.globalAllowKeywords'), ionIcon: 'list-outline' },
    { id: 'display_behavior', title: t('settings.displayBehavior'), ionIcon: 'eye-outline' },
    { id: 'replay_tour', title: t('settings.replayTour'), ionIcon: 'play-circle-outline' },
    // データ・システムグループ（区切りで分ける）
    { id: 'data_management', title: t('settings.dataManagement'), ionIcon: 'server-outline', sectionBreak: true },
    { id: 'pro', title: 'Pro', ionIcon: 'star-outline', disabled: true },
    { id: 'about', title: t('settings.about'), ionIcon: 'information-circle-outline' },
  ];

  const handlePressMenuItem = React.useCallback((itemId: string) => {
    switch (itemId) {
      case 'global_allow_keywords':
        router.push('/global_allow_keywords');
        break;
      case 'display_behavior':
        router.push('/display_behavior');
        break;
      case 'data_management':
        router.push('/data_management');
        break;
      case 'replay_tour':
        Alert.alert(
          t('settings.replayTourConfirmTitle'),
          t('settings.replayTourConfirmMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.replayTourConfirmButton'),
              style: 'destructive',
              onPress: async () => {
                // 実行中の同期を止めてから消す（削除済みフィードへの記事書き込みを防ぐ）
                SyncService.cancelOngoing();
                await resetFeedsAndFilters();
                // 再生ツアーであることを記録（ホームのツアーでスキップボタンを出すため）
                await AsyncStorage.setItem(StorageKeys.tourIsReplay, '1');
                restartOnboarding();
              },
            },
          ]
        );
        break;
      case 'pro':
        // 無効化されているので何もしない
        break;
      case 'about':
        router.push('/about');
        break;
    }
  }, [router, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <SettingsHeader />
      
      <FlatList
        data={menuItems}
        renderItem={({ item }) => (
          <>
            {item.sectionBreak && <View style={styles.sectionBreak} />}
            <MenuItemRow
              item={item}
              onPress={() => handlePressMenuItem(item.id)}
            />
          </>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { backgroundColor }]}
        style={{ backgroundColor }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionBreak: {
    height: 24,
  },
  header: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 20,
  },
  menuItemText: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 20,
  },
});