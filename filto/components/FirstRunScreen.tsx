import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
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

// require は静的パスが必要なため、言語ごとに配列を用意して出し分ける。
const screenshotsJa = [
  require('../assets/onboarding/ja/01-less-noise.webp'),
  require('../assets/onboarding/ja/02-your-rules.webp'),
  require('../assets/onboarding/ja/03-block-broadly.webp'),
  require('../assets/onboarding/ja/04-bring-your-feeds.webp'),
  require('../assets/onboarding/ja/05-read-your-way.webp'),
  require('../assets/onboarding/ja/06-easy-on-the-eyes.webp'),
];
const screenshotsEn = [
  require('../assets/onboarding/en/01-less-noise.webp'),
  require('../assets/onboarding/en/02-your-rules.webp'),
  require('../assets/onboarding/en/03-block-broadly.webp'),
  require('../assets/onboarding/en/04-bring-your-feeds.webp'),
  require('../assets/onboarding/en/05-read-your-way.webp'),
  require('../assets/onboarding/en/06-easy-on-the-eyes.webp'),
];

const SCREENSHOT_COUNT = screenshotsJa.length;
const WELCOME_STEP = 0;
const LOADING_STEP = SCREENSHOT_COUNT + 1;

/**
 * 初回起動画面。「ようこそ」→ ストア用スクリーンショットを次へボタンで
 * 1枚ずつ提示 → 準備完了待ち、というステップ形式にする。
 *
 * 裏側のデータ読み込み（デフォルトフィード投入＋初回同期）はステップ表示とは
 * 独立して最初のマウント時に開始する。スクショを見ている間に完了させておき、
 * 最後の待機画面（LOADING_STEP）では読み込み完了まで先へ進めない
 * （スキップされても、この待機画面自体はスキップされない）。
 */
export default function FirstRunScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(WELCOME_STEP);
  const [ready, setReady] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const buttonTextColor = useThemeColor({ light: '#fff', dark: '#151718' }, 'text');
  const cardBg = useThemeColor({ light: '#f5f5f7', dark: '#1c1d1f' }, 'background');
  const trackColor = useThemeColor({ light: '#e5e5ea', dark: '#3a3a3c' }, 'background');
  const { t } = useTranslation();
  const { language } = useLanguage();
  const screenshots = language === 'ja' ? screenshotsJa : screenshotsEn;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // デフォルトフィードを投入（初期フィルタは入れない）。冪等。
        // デバイスロケールではなくアプリの言語設定に合わせる。
        await seedDefaultFeeds(language === 'ja' ? 'ja' : 'en');
        await AsyncStorage.setItem(StorageKeys.onboardingCompleted, 'true');
        // 記事を取得（オフライン等で失敗しても先へ進める）。
        // オンボーディング専用の進捗UIで先へ進めるため、notify は渡さない
        // （既定 false ＝ 通知しない。ホーム画面がまだ無く、出しても見えない）
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

  const goNext = () => setStep((s) => Math.min(s + 1, LOADING_STEP));
  const goBack = () => setStep((s) => Math.max(s - 1, WELCOME_STEP));
  const skipToLoading = () => setStep(LOADING_STEP);

  if (step === WELCOME_STEP) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <View style={styles.welcomeContent}>
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText style={[styles.welcomeGreeting, { color: textColor }]}>
            {t('firstRun.welcome')}
          </ThemedText>
          <ThemedText style={[styles.welcomePitch, { color: textColor }]}>
            {t('firstRun.title')}
          </ThemedText>
          <ThemedText style={[styles.welcomeCaption, { color: subtextColor }]}>
            {t('firstRun.caption')}
          </ThemedText>
        </View>
        <View style={styles.welcomeFooter}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tintColor }]}
            onPress={goNext}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.primaryButtonText, { color: buttonTextColor }]}>
              {t('firstRun.start')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step >= 1 && step <= SCREENSHOT_COUNT) {
    const index = step - 1;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={textColor} />
          </TouchableOpacity>
          <View style={styles.progressTrack}>
            {Array.from({ length: SCREENSHOT_COUNT }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  { backgroundColor: i <= index ? tintColor : trackColor },
                ]}
              />
            ))}
          </View>
          <TouchableOpacity onPress={skipToLoading} accessibilityRole="button">
            <ThemedText style={[styles.skipText, { color: subtextColor }]}>
              {t('firstRun.skip')}
            </ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.screenshotContent}>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Image source={screenshots[index]} style={styles.cardImage} contentFit="contain" />
          </View>
        </View>
        <View style={styles.welcomeFooter}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tintColor }]}
            onPress={goNext}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.primaryButtonText, { color: buttonTextColor }]}>
              {t('firstRun.next')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // LOADING_STEP: 読み込み完了まで留まる最終画面。
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <View style={styles.loadingContent}>
        <Image
          source={require('../assets/images/loading-illustration.png')}
          style={styles.loadingIllustration}
          contentFit="contain"
        />
        {ready ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={20} color={tintColor} />
            <ThemedText style={[styles.statusText, { color: textColor }]}>
              {t('firstRun.ready')}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={tintColor} />
            <ThemedText style={[styles.statusText, { color: subtextColor }]}>
              {t('firstRun.preparing')}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.welcomeFooter}>
        {ready && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tintColor }]}
            onPress={onComplete}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.primaryButtonText, { color: buttonTextColor }]}>
              {t('firstRun.start')}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ようこそ画面
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  logo: {
    width: 96,
    height: 96,
  },
  welcomeGreeting: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  welcomePitch: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
  welcomeCaption: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  welcomeFooter: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  primaryButton: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: undefined,
  },
  // スクリーンショット画面
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  progressTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: undefined,
  },
  screenshotContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  // 読み込み待ち画面
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  loadingIllustration: {
    width: '80%',
    maxWidth: 280,
    height: 280,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: undefined,
  },
});
