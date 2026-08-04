import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedDefaultFeeds } from '@/database/init';
import { SyncService } from '@/services/SyncService';
import { StorageKeys } from '@/constants/storageKeys';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation, useLanguage } from '@/providers/language';

/**
 * 初回起動画面。選択式オンボーディング＋コーチツアーは廃止し、
 * デフォルトフィードを自動投入 → 記事を取得しながら「非表示にできる」ことを伝える
 * GIF を見せる → 準備ができたらホームへ、というシンプルな流れにする。
 */
export default function FirstRunScreen({ onComplete }: { onComplete: () => void }) {
  const [ready, setReady] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({ light: '#f5f5f7', dark: '#1c1d1f' }, 'background');
  const { t } = useTranslation();
  const { language } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // デフォルトフィードを投入（初期フィルタは入れない）。冪等。
        // デバイスロケールではなくアプリの言語設定に合わせる。
        await seedDefaultFeeds(language === 'ja' ? 'ja' : 'en');
        await AsyncStorage.setItem(StorageKeys.onboardingCompleted, 'true');
        // 記事を取得（オフライン等で失敗しても先へ進める）。
        try {
          await SyncService.refresh();
        } catch {
          // 取得失敗は無視（ホームで手動更新できる）
        }
      } catch {
        // seed 失敗も先へ進める
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // マウント時の言語で1回だけ実行する（言語変更で再seedさせない）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 「準備ができました」を少し見せてからホームへ遷移する。
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [ready, onComplete]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>{t('firstRun.title')}</ThemedText>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Image
            source={require('../assets/onboarding-hide.gif')}
            style={styles.gif}
            contentFit="contain"
            autoplay
          />
        </View>
        <ThemedText style={[styles.caption, { color: subtextColor }]}>{t('firstRun.caption')}</ThemedText>
      </View>

      <View style={styles.footer}>
        {ready ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={20} color={tintColor} />
            <ThemedText style={[styles.statusText, { color: textColor }]}>{t('firstRun.ready')}</ThemedText>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={tintColor} />
            <ThemedText style={[styles.statusText, { color: subtextColor }]}>{t('firstRun.preparing')}</ThemedText>
          </View>
        )}
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
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    flex: 1,
    alignSelf: 'stretch',
    maxHeight: '68%',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  caption: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
