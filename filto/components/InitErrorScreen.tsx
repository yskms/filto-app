import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

/**
 * DB初期化（initDatabase）に失敗したときに表示する画面。
 *
 * 以前は初期化失敗を握り潰して「オンボーディング完了」扱いにしていたため、
 * seed がスキップされ、記事も設定も無い"壊れて見える"状態でホームが開いていた。
 * 失敗は隠さず明示し、再試行できるようにする（多くは一時的な失敗のため再試行で回復する）。
 */
export default function InitErrorScreen({ onRetry }: { onRetry: () => void }) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Ionicons name="alert-circle-outline" size={56} color={subtextColor} />
        <ThemedText style={[styles.title, { color: textColor }]}>
          {t('errors.initFailedTitle')}
        </ThemedText>
        <ThemedText style={[styles.body, { color: subtextColor }]}>
          {t('errors.initFailedBody')}
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={onRetry}
          accessibilityRole="button"
        >
          <ThemedText style={styles.buttonText}>{t('errors.retry')}</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
