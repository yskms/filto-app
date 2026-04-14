import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/providers/language';

interface Props {
  message?: string;
}

/**
 * 画面全体のローディング表示（データ初回取得時など）
 */
export const LoadingView: React.FC<Props> = ({ message }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <ThemedText style={styles.text}>{message ?? t('common.loading')}</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});
