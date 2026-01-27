import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface MenuItem {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'global_allow_keywords', title: 'Global Allow Keywords', icon: '📚' },
  { id: 'display_behavior', title: 'Display & Behavior', icon: '👁' },
  { id: 'data_management', title: 'Data Management', icon: '💾' },
  { id: 'pro', title: 'Pro', icon: '⭐', disabled: true },
  { id: 'about', title: 'About', icon: 'ℹ' },
];

// メニューアイテムコンポーネント
const MenuItemRow: React.FC<{
  item: MenuItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.menuItem, item.disabled && styles.menuItemDisabled]}
      onPress={onPress}
      disabled={item.disabled}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        {item.icon != null && <Text style={styles.menuItemIcon}>{item.icon}</Text>}
        <Text style={[styles.menuItemText, item.disabled && styles.menuItemTextDisabled]}>
          {item.title}
        </Text>
      </View>
      {!item.disabled && <Text style={styles.arrow}>›</Text>}
    </TouchableOpacity>
  );
};

// ヘッダーコンポーネント
const SettingsHeader: React.FC = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Settings</Text>
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();

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
    <SafeAreaView style={styles.container} edges={['top']}>
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
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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
    color: '#000',
  },
  menuItemTextDisabled: {
    color: '#999',
  },
  arrow: {
    fontSize: 20,
    color: '#666',
  },
});