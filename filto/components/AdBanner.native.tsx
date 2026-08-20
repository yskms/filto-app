import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_ID } from '@/constants/adConfig';
import { ProService } from '@/services/ProService';
import { canShowAds } from '@/services/adInit';

/**
 * ホーム画面の上下固定バナー広告。Pro版では表示しない。
 * 常に非パーソナライズ広告のみをリクエストする（設計: §4.1）。
 * EEA/UKの同意状況は `canShowAds()` が見る（同意が無ければ広告を出さない）。
 * 設置位置（上/下）は呼び出し側（ホーム画面）が決める。
 * 設計: docs/01_requirements/01_monetization_plan.md §4
 */
export const AdBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean | null>(null);

  // 画面フォーカスのたびに評価し直す。Pro購入直後にアプリを再起動しなくても
  // バナーが消えるようにするため（マウント時1回だけだと再起動まで残ってしまう）
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([ProService.isPro(), canShowAds()])
        .then(([isPro, adsAllowed]) => {
          if (!cancelled) setVisible(!isPro && adsAllowed);
        })
        .catch(() => {
          // 判定できないときは出さない（安全側に倒す）
          if (!cancelled) setVisible(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // 判定前(null)・Pro版・同意なしでは出さない
  if (visible !== true) return null;

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
