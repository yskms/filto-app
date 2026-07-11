import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * 設定画面で使う ON/OFF トグル。
 * データ管理・表示/動作など複数画面で同じ見た目に揃えるための共通コンポーネント。
 * 寸法は iOS 標準スイッチに合わせている。
 */
interface ToggleProps {
  value: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ value, onToggle, label, disabled }: ToggleProps) {
  const offBg = useThemeColor({ light: '#e0e0e0', dark: '#555' }, 'background');
  const onBg = useThemeColor({ light: '#34C759', dark: '#30d158' }, 'background');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={[styles.track, { backgroundColor: value ? onBg : offBg }]}>
        <View style={[styles.thumb, value && styles.thumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    flex: 1,
    marginRight: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  track: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
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
  thumbActive: {
    transform: [{ translateX: 20 }],
  },
});
