import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

interface MenuItem {
  id: string;
  titleKey: keyof typeof import('@/locales/ja').ja.settings;
  icon?: string;
  disabled?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'global_allow_keywords', titleKey: 'globalAllowKeywords', icon: '📚' },
  { id: 'display_behavior', titleKey: 'displayBehavior', icon: '👁' },
  { id: 'data_management', titleKey: 'dataManagement', icon: '💾' },
  { id: 'pro', titleKey: 'pro', icon: '⭐', disabled: true },
  { id: 'about', titleKey: 'about', icon: 'ℹ' },
];

// メニューアイテムコンポーネント
const MenuItemRow: React.FC<{
  item: MenuItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const iconColor = useThemeColor({}, 'icon');
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: borderColor, backgroundColor },
        item.disabled && styles.menuItemDisabled,
      ]}
      onPress={onPress}
      disabled={item.disabled}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        {item.icon != null && (
          <ThemedText style={[styles.menuItemIcon, { color: iconColor }]}>{item.icon}</ThemedText>
        )}
        <ThemedText
          style={[styles.menuItemText, item.disabled && styles.menuItemTextDisabled]}
        >
          {t.settings[item.titleKey]}
        </ThemedText>
      </View>
      {!item.disabled && (
        <ThemedText style={[styles.arrow, { color: iconColor }]}>›</ThemedText>
      )}
    </TouchableOpacity>
  );
};

// ヘッダーコンポーネント
const SettingsHeader: React.FC = () => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <ThemedText style={styles.headerTitle}>{t.settings.title}</ThemedText>
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');

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
      case 'pro':
        // 無効化されているので何もしない
        break;
      case 'about':
        router.push('/about');
        break;
    }
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <SettingsHeader />
      
      <FlatList
        data={menuItems}
        renderItem={({ item }) => (
          <MenuItemRow
            item={item}
            onPress={() => handlePressMenuItem(item.id)}
          />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
  menuItemTextDisabled: {
    opacity: 0.5,
  },
  arrow: {
    fontSize: 20,
  },
});