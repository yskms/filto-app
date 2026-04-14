import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface Props {
  message?: string;
}

/**
 * 操作中のオーバーレイ（削除・保存など処理中に画面を覆う）
 */
export const LoadingOverlay: React.FC<Props> = ({ message }) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" />
        {message && <ThemedText style={styles.text}>{message}</ThemedText>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
  },
});
