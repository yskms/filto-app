import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_ID } from '@/constants/adConfig';
import { ProService } from '@/services/ProService';

/**
 * ホーム画面の上下固定バナー広告。Pro版では表示しない。
 * 常に非パーソナライズ広告のみをリクエストする（ATT許諾ダイアログを出さない設計で、
 * 「広告はあるがトラッキングはしない」を技術的に担保する。切り替え設定は用意しない）。
 * 設置位置（上/下）は呼び出し側（ホーム画面）が決める。
 * 設計: docs/01_requirements/01_monetization_plan.md §4
 */
export const AdBanner: React.FC = () => {
  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    ProService.isPro().then((pro) => {
      if (!cancelled) setIsPro(pro);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 判定前(null)・Pro版(true)では出さない
  if (isPro !== false) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
