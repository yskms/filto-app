import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { useToast } from '@/providers/toast';
import { ProService } from '@/services/ProService';
import { getMonthlyPriceString, purchaseMonthly, restorePurchases } from '@/services/purchases';

const ProHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Ionicons name="chevron-back" size={26} color={iconColor} />
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>{t('pro.title')}</ThemedText>
      <View style={styles.headerRight} />
    </View>
  );
};

const FeatureRow: React.FC<{ text: string; tintColor: string }> = ({ text, tintColor }) => (
  <View style={styles.featureRow}>
    <Ionicons name="checkmark-circle" size={20} color={tintColor} />
    <ThemedText style={styles.featureText}>{text}</ThemedText>
  </View>
);

export default function ProScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const subColor = useThemeColor({}, 'icon');
  const cardBg = useThemeColor({ light: '#f5f5f7', dark: '#1c1d1f' }, 'background');
  const buttonTextColor = useThemeColor({ light: '#fff', dark: '#151718' }, 'text');
  const disabledBg = useThemeColor({ light: '#b0b0b0', dark: '#555' }, 'background');

  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [priceString, setPriceString] = useState<string | null | undefined>(undefined);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // isPro判定→（無料版のときだけ）価格取得の順で行う: 既にPro済みの場合は
  // 表示しない価格を無駄に取得しない。isCancelledで、素早い出入りによる
  // 古い応答での上書きも防ぐ（フォーカス離脱時のみ渡す。再試行ボタンからの
  // 単発呼び出しでは省略してよい）
  const load = useCallback(async (isCancelled?: () => boolean) => {
    const pro = await ProService.isPro();
    if (isCancelled?.()) return;
    setIsPro(pro);
    if (!pro) {
      const price = await getMonthlyPriceString();
      if (!isCancelled?.()) setPriceString(price);
    }
  }, []);

  // 画面フォーカスのたびに再評価する（購入・復元直後の状態を反映するため）
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const handleSubscribe = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await purchaseMonthly();
      if (result.success) {
        setIsPro(true);
        showToast(t('pro.purchaseSuccess'), 'success');
      } else if (!result.cancelled) {
        // result.errorMessage は未翻訳のSDK生メッセージのため、ユーザーには常に
        // 翻訳済みの汎用文言を出す（詳細はデバッグ用にログへ）
        if (result.errorMessage) console.warn('[Purchases] purchase failed:', result.errorMessage);
        Alert.alert(t('common.error'), t('pro.purchaseError'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        const nowPro = await ProService.isPro();
        setIsPro(nowPro);
        showToast(nowPro ? t('pro.restoreSuccess') : t('pro.restoreNotFound'), nowPro ? 'success' : 'info');
      } else if (!result.cancelled) {
        if (result.errorMessage) console.warn('[Purchases] restore failed:', result.errorMessage);
        Alert.alert(t('common.error'), t('pro.restoreError'));
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <ProHeader onPressBack={() => router.back()} />

        <View style={styles.content}>
          {isPro ? (
            <View style={styles.centerBlock}>
              <Ionicons name="star" size={48} color={tintColor} />
              <ThemedText style={styles.alreadyProTitle}>{t('pro.alreadyProTitle')}</ThemedText>
              <ThemedText style={[styles.alreadyProDescription, { color: subColor }]}>
                {t('pro.alreadyProDescription')}
              </ThemedText>
            </View>
          ) : (
            <>
              <ThemedText style={[styles.subtitle, { color: subColor }]}>{t('pro.subtitle')}</ThemedText>

              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <FeatureRow text={t('pro.featureAds')} tintColor={tintColor} />
                <FeatureRow text={t('pro.featureFilters')} tintColor={tintColor} />
                <FeatureRow text={t('pro.featureAllowKeywords')} tintColor={tintColor} />
              </View>

              {priceString === undefined ? (
                <ActivityIndicator style={styles.priceLoading} />
              ) : priceString === null ? (
                <View style={styles.centerBlock}>
                  <ThemedText style={[styles.errorText, { color: subColor }]}>{t('pro.priceLoadError')}</ThemedText>
                  <TouchableOpacity onPress={() => load()} activeOpacity={0.7}>
                    <ThemedText style={[styles.retryText, { color: tintColor }]}>{t('pro.retry')}</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <ThemedText style={styles.price}>
                    {priceString}
                    <ThemedText style={[styles.priceSuffix, { color: subColor }]}>{t('pro.priceSuffix')}</ThemedText>
                  </ThemedText>

                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      { backgroundColor: tintColor },
                      purchasing && { backgroundColor: disabledBg },
                    ]}
                    onPress={handleSubscribe}
                    disabled={purchasing}
                    activeOpacity={0.7}
                  >
                    {purchasing ? (
                      <ActivityIndicator size="small" color={buttonTextColor} />
                    ) : (
                      <ThemedText style={[styles.subscribeButtonText, { color: buttonTextColor }]}>
                        {t('pro.subscribeButton')}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={handleRestore} disabled={restoring} activeOpacity={0.7} style={styles.restoreButton}>
                {restoring ? (
                  <ActivityIndicator size="small" color={subColor} />
                ) : (
                  <ThemedText style={[styles.restoreButtonText, { color: subColor }]}>{t('pro.restoreButton')}</ThemedText>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </>
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
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  priceLoading: {
    marginTop: 24,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  priceSuffix: {
    fontSize: 16,
    fontWeight: '400',
  },
  subscribeButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 8,
    padding: 8,
  },
  restoreButtonText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  alreadyProTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  alreadyProDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
